import { ConductorInternalError } from "../common/errors/ConductorInternalError";
import { IChannel, Subscriber } from "./types";

export class Channel<T> implements IChannel<T> {
    readonly name: string;

    /** The underlying MessagePort of this Channel. */
    private __port?: MessagePort;

    /** The callbacks subscribed to this Channel. */
    private readonly __subscribers: Set<Subscriber<T>> = new Set(); // TODO: use WeakRef? but callbacks tend to be thrown away and leaking is better than incorrect behaviour

    /** Is the Channel allowed to be used? */
    private __isAlive: boolean = true;

    send(message: T, transfer?: Transferable[]): void {
        this.__verifyAlive();
        this.__port!.postMessage(message, transfer ?? []);
    }
    subscribe(subscriber: Subscriber<T>): void {
        this.__verifyAlive();
        this.__port?.start();
        this.__subscribers.add(subscriber);
    }
    unsubscribe(subscriber: Subscriber<T>): void {
        this.__verifyAlive();
        this.__subscribers.delete(subscriber);
    }
    close(): void {
        this.__verifyAlive();
        this.__isAlive = false;
        this.__port?.close();
    }

    /**
     * Check if this Channel is allowed to be used.
     * @throws Throws an error if the Channel has been closed.
     */
    private __verifyAlive() {
        if (!this.__isAlive) throw new ConductorInternalError(`Channel ${this.name} has been closed`);
    }

    /**
     * Dispatch some data to subscribers.
     * @param data The data to be dispatched to subscribers.
     */
    private __dispatch(data: T): void {
        this.__verifyAlive();
        for (const subscriber of this.__subscribers) {
            subscriber(data);
        }
    }

    /**
     * Listens to the port's message event, and starts the port if there are subscribers (otherwise it will be started in the subscribe method).
     * @param port The MessagePort to listen to.
     */
    listenToPort(port: MessagePort): void {
        port.addEventListener("message", e => this.__dispatch(e.data));
        if (this.__subscribers.size > 0) port.start();
    }

    /**
     * Replaces the underlying MessagePort of this Channel and closes it, and starts the new port.
     * @param port The new port to use.
     */
    replacePort(port: MessagePort): void {
        this.__verifyAlive();
        this.__port?.close();
        this.__port = port;
        this.listenToPort(port);
    }

    constructor(name: string, port: MessagePort) {
        this.name = name;
        this.replacePort(port);
    }
}
