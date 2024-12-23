interface IFileMessage {
    /** The name of the file. */
    fileName: string;

    /** The content of the file. */
    content?: string;
}

export type { IFileMessage as default };
