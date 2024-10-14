interface ILink {
    postMessage: typeof Worker.prototype.postMessage;
    addEventListener: typeof Worker.prototype.addEventListener;
    terminate?: typeof Worker.prototype.terminate;
}

export type { ILink as default };