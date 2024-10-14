import { IConduit, IChannel } from "../../conduit";
import InternalChannelName from "../strings/InternalChannelName";
import { IExternData, PairIdentifier, ExternValue, DataType, ArrayIdentifier, IFunctionSignature, ExternCallable, ClosureIdentifier, Identifier } from "../types";
import { IModulePlugin, IModuleExport } from "./types";

const methods = [
    "pair_make", "pair_gethead", "pair_typehead", "pair_sethead", "pair_gettail", "pair_typetail", "pair_settail",
    "array_make", "array_get", "array_type", "array_set",
    "closure_make", "closure_call",
    "type", "free"
];

export default abstract class BaseModulePlugin implements IModulePlugin {
    abstract readonly channelAttach: InternalChannelName[];
    abstract init(conduit: IConduit, channels: IChannel<any>[]): void;

    abstract exports: IModuleExport[];

    /** Is this module ready for use? */
    private hooked: boolean = false;

    hook(evaluator: IExternData): void {
        if (this.hooked) throw Error("already hooked!"); // TODO: custom error?
        this.hooked = true;
        for (const methodName of methods) {
            this[methodName] = evaluator[methodName].bind(evaluator);
        }
    }
    isHooked(): boolean {
        return this.hooked;
    }
    verifyHooked(): void {
        if (!this.hooked) throw Error("not hooked!"); // TODO: custom error?
    }

    pair_make: () => PairIdentifier;
    pair_gethead: (p: PairIdentifier) => ExternValue;
    pair_typehead: (p: PairIdentifier) => DataType;
    pair_sethead: (p: PairIdentifier, t: DataType, v: ExternValue) => void;
    pair_gettail: (p: PairIdentifier) => ExternValue;
    pair_typetail: (p: PairIdentifier) => DataType;
    pair_settail: (p: PairIdentifier, t: DataType, v: ExternValue) => void;

    array_make: (t: DataType, len: number, init?: ExternValue) => ArrayIdentifier;
    array_get: (a: ArrayIdentifier, idx: number) => ExternValue;
    array_type: (a: ArrayIdentifier) => DataType;
    array_set: (a: ArrayIdentifier, idx: number, v: ExternValue) => void;

    closure_make: (sig: IFunctionSignature, func: ExternCallable) => ClosureIdentifier;
    closure_call: (c: ClosureIdentifier, args: ExternValue[]) => ExternValue;

    type: (i: Identifier) => DataType;
    free: (i: Identifier) => void;
}