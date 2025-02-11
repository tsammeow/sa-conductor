import { ConductorInternalError } from "../../common/errors/ConductorInternalError";
import { IConduit, IChannel } from "../../conduit";
import { InternalChannelName } from "../strings";
import { IDataHandler, PairIdentifier, ExternValue, DataType, ArrayIdentifier, IFunctionSignature, ExternCallable, ClosureIdentifier, Identifier, OpaqueIdentifier } from "../types";
import { IModulePlugin, IModuleExport } from "./types";

const methods: readonly (Exclude<keyof IDataHandler, "hasDataInterface">)[] = [
    "pair_make", "pair_gethead", "pair_typehead", "pair_sethead", "pair_gettail", "pair_typetail", "pair_settail",
    "array_make", "array_length", "array_get", "array_type", "array_set",
    "closure_make", "closure_call",
    "opaque_make", "opaque_get",
    "tie", "untie"
];

export abstract class BaseModulePlugin implements IModulePlugin {
    abstract readonly channelAttach: string[];
    abstract init(conduit: IConduit, channels: IChannel<any>[]): void;

    abstract exports: IModuleExport[];

    /** Is this module ready for use? */
    private __hooked: boolean = false;

    hook(evaluator: IDataHandler): void {
        if (this.__hooked) throw new ConductorInternalError("Module already hooked");
        this.__hooked = true;
        for (const methodName of methods) {
            this[methodName] = evaluator[methodName].bind(evaluator);
        }
    }
    unhook(): void {
        this.verifyHooked();
        this.__hooked = false;
        for (const methodName of methods) {
            delete this[methodName];
        }
    }
    isHooked(): boolean {
        return this.__hooked;
    }
    verifyHooked(): void {
        if (!this.__hooked) throw new ConductorInternalError("Module not hooked");
    }

    // To be populated by hook():
    pair_make: () => PairIdentifier;
    pair_gethead: (p: PairIdentifier) => ExternValue;
    pair_typehead: (p: PairIdentifier) => DataType;
    pair_sethead: (p: PairIdentifier, t: DataType, v: ExternValue) => void;
    pair_gettail: (p: PairIdentifier) => ExternValue;
    pair_typetail: (p: PairIdentifier) => DataType;
    pair_settail: (p: PairIdentifier, t: DataType, v: ExternValue) => void;

    array_make: (t: DataType, len: number, init?: ExternValue) => ArrayIdentifier;
    array_length: (a: ArrayIdentifier) => number;
    array_get: (a: ArrayIdentifier, idx: number) => ExternValue;
    array_type: (a: ArrayIdentifier) => DataType;
    array_set: (a: ArrayIdentifier, idx: number, v: ExternValue) => void;

    closure_make: <T extends IFunctionSignature>(sig: T, func: ExternCallable<T>, dependsOn?: Identifier[]) => ClosureIdentifier;
    closure_call: (c: ClosureIdentifier, args: ExternValue[]) => ExternValue;

    opaque_make: (v: any) => OpaqueIdentifier;
    opaque_get: (o: OpaqueIdentifier) => any;

    tie: (dependent: Identifier, dependee: Identifier) => void;
    untie: (dependent: Identifier, dependee: Identifier) => void;
}
