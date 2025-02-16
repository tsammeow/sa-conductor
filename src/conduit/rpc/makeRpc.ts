import { IChannel } from "../types";
import { IRpcMessage, Remote, RpcCallMessage, RpcErrorMessage, RpcMessageType, RpcReturnMessage } from "./types";

export function makeRpc<ISelf, IOther>(channel: IChannel<IRpcMessage>, self: ISelf): Remote<IOther> {
    const waiting: [Function, Function][] = [];
    let invocations = 0;
    const otherCallbacks: Partial<Record<keyof IOther, (...args: any) => Promise<any>>> = {};

    channel.subscribe(async rpcMessage => {
        switch (rpcMessage.type) {
            case RpcMessageType.CALL:
                {
                    const {fn, args, invokeId} = (rpcMessage as RpcCallMessage).data;
                    try {
                        // @ts-expect-error
                        const res = await self[fn as keyof ISelf](...args);
                        channel.send(new RpcReturnMessage(invokeId, res));
                    } catch (err) {
                        channel.send(new RpcErrorMessage(invokeId, err));
                    }
                    break;
                }
            case RpcMessageType.RETURN:
                {
                    const {invokeId, res} = (rpcMessage as RpcReturnMessage).data;
                    waiting[invokeId]?.[0]?.(res);
                    delete waiting[invokeId];
                    break;
                }
            case RpcMessageType.RETURN_ERR:
                {
                    const {invokeId, err} = (rpcMessage as RpcErrorMessage).data;
                    waiting[invokeId]?.[1]?.(err);
                    delete waiting[invokeId];
                    break;
                }
        }
    });

    return new Proxy(otherCallbacks, {
        get(target, p, receiver) {
            const cb = Reflect.get(target, p, receiver);
            if (cb) return cb;
            const newCallback = async (...args: any[]) => {
                const invokeId = invocations++;
                channel.send(new RpcCallMessage(p, args, invokeId));
                return new Promise((resolve, reject) => {
                    waiting[invokeId] = [resolve, reject];
                });
            }
            Reflect.set(target, p, newCallback, receiver);
            return newCallback;
        },
    }) as Remote<IOther>;
}
