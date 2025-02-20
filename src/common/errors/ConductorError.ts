import { ErrorType } from "./ErrorType";

export class ConductorError extends Error {
    override name = "ConductorError";
    readonly errorType: ErrorType | string = ErrorType.UNKNOWN;
    
    constructor(message: string) {
        super(message);
    }
}
