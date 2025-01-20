import { IConduit, IChannelQueue, IChannel, ChannelQueue, IPlugin } from "../../conduit";
import { IModulePlugin } from "../module";
import InternalChannelName from "../strings/InternalChannelName";
import InternalPluginName from "../strings/InternalPluginName";
import { Chunk, IChunkMessage, IFileMessage, IServiceMessage, IIOMessage, IStatusMessage, RunnerStatus, serviceMessages } from "../types";
import ServiceMessageType from "../types/ServiceMessageType";
import { IRunnerPlugin, IEvaluator } from "./types";

function serviceHandler(type: ServiceMessageType) {
    return function (originalMethod: (data: IServiceMessage) => void, context: ClassMethodDecoratorContext) {
        context.addInitializer(function () {
            const _this = this as RunnerPlugin;
            if (!_this.serviceHandlers) _this.serviceHandlers = new Map();
            _this.serviceHandlers.set(type, originalMethod.bind(_this));
        });
    }
}

export default class RunnerPlugin implements IRunnerPlugin {
    name = InternalPluginName.RUNNER_MAIN;

    private readonly evaluator: IEvaluator;
    private conduit: IConduit;
    private fileQueue: IChannelQueue<IFileMessage>;
    private chunkQueue: IChannelQueue<IChunkMessage>;
    private serviceChannel: IChannel<IServiceMessage>;
    private ioQueue: IChannelQueue<IIOMessage>;
    private statusChannel: IChannel<IStatusMessage>;

    serviceHandlers: Map<ServiceMessageType, (message: IServiceMessage) => void>;

    readonly channelAttach = [InternalChannelName.FILE, InternalChannelName.CHUNK, InternalChannelName.SERVICE, InternalChannelName.STANDARD_IO, InternalChannelName.STATUS];
    init(conduit: IConduit, [fileChannel, chunkChannel, serviceChannel, ioChannel, statusChannel]): void {
        this.conduit = conduit;
        this.fileQueue = new ChannelQueue(fileChannel);
        this.chunkQueue = new ChannelQueue(chunkChannel);
        this.serviceChannel = serviceChannel;
        this.ioQueue = new ChannelQueue(ioChannel);
        this.statusChannel = statusChannel;

        this.serviceChannel.send(new serviceMessages.Hello());
        this.serviceChannel.subscribe(message => {
            if (this.serviceHandlers.has(message.type)) this.serviceHandlers.get(message.type)(message);
        });
        this.evaluator.init(this);
    }

    @serviceHandler(ServiceMessageType.HELLO)
    helloServiceHandler(message: serviceMessages.Hello): void {
        console.log(`host is using api version ${message.data.version}`);
    }

    @serviceHandler(ServiceMessageType.ENTRY)
    entryServiceHandler(message: serviceMessages.Entry): void {
        this.evaluator.runEvaluator(message.data);
    }

    async requestFile(fileName: string): Promise<string> {
        this.fileQueue.send({ fileName });
        while (true) {
            const file = await this.fileQueue.receive();
            if (file.fileName === fileName) return file.content;
        }
    }

    async requestChunk(): Promise<Chunk> {
        return (await this.chunkQueue.receive()).chunk;
    }

    async requestInput(): Promise<string> {
        const { message } = await this.ioQueue.receive();
        return message;
    }

    tryRequestInput(): string | undefined {
        const out = this.ioQueue.tryReceive();
        return out?.message;
    }

    sendOutput(message: string): void {
        this.ioQueue.send({ stream: 1, message });
    }

    sendError(message: string): void {
        this.ioQueue.send({ stream: 2, message });
    }

    updateStatus(status: RunnerStatus, isActive: boolean): void {
        this.statusChannel.send({ status, isActive });
    }

    registerPlugin(plugin: IPlugin): void {
        this.conduit.registerPlugin(plugin);
    }

    unregisterPlugin(plugin: IPlugin): void {
        this.conduit.unregisterPlugin(plugin);
    }

    async loadPlugin(location: string): Promise<IPlugin> {
        const plugin = await import(location) as IPlugin;
        this.registerPlugin(plugin);
        return plugin;
    }

    async loadModule(location: string) {
        const module = await this.loadPlugin(location) as IModulePlugin;
        if (!module.hook) {
            this.unregisterPlugin(module);
            throw Error("plugin is not module!");
        }
        module.hook(this.evaluator);
        return module;
    }

    constructor(evaluator: IEvaluator) {
        this.evaluator = evaluator;
        if (!this.serviceHandlers) this.serviceHandlers = new Map();
    }
}
