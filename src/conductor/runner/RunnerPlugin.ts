import { IConduit, IMessageQueue, IChannel, MessageQueue, IPlugin } from "../../conduit";
import { IModulePlugin } from "../module";
import InternalChannelName from "../strings/InternalChannelName";
import InternalPluginName from "../strings/InternalPluginName";
import { FileMessage, Fragment, ServiceMessage, IOMessage, StatusMessage, RunnerStatus, FragmentMessage } from "../types";
import { IRunnerPlugin, IEvaluator } from "./types";

export default class RunnerPlugin implements IRunnerPlugin {
    name = InternalPluginName.MAIN;

    private readonly evaluator: IEvaluator;
    private conduit: IConduit;
    private fileQueue: IMessageQueue<FileMessage>;
    private fragmentQueue: IMessageQueue<FragmentMessage>;
    private serviceChannel: IChannel<ServiceMessage>;
    private ioQueue: IMessageQueue<IOMessage>;
    private statusChannel: IChannel<StatusMessage>;

    readonly channelAttach = [InternalChannelName.FILE, InternalChannelName.FRAGMENT, InternalChannelName.SERVICE, InternalChannelName.STANDARD_IO, InternalChannelName.STATUS];
    init(conduit: IConduit, [fileChannel, fragmentChannel, serviceChannel, ioChannel, statusChannel]): void {
        this.conduit = conduit;
        this.fileQueue = new MessageQueue(fileChannel);
        this.fragmentQueue = new MessageQueue(fragmentChannel);
        this.serviceChannel = serviceChannel;
        this.ioQueue = new MessageQueue(ioChannel);
        this.statusChannel = statusChannel;
        this.evaluator.init(this);
    }

    async requestFile(fileName: string): Promise<string> {
        this.fileQueue.send({ fileName });
        while (true) {
            const file = await this.fileQueue.receive();
            if (file.fileName === fileName) return file.content;
        }
    }

    async requestFragment(): Promise<Fragment> {
        return (await this.fragmentQueue.receive()).fragment;
    }

    async requestInput(): Promise<string> {
        const { message } = await this.ioQueue.receive();
        return message;
    }

    tryRequestInput(): string | undefined {
        const out = this.ioQueue.tryReceive();
        return out?.message;
    }

    updateStatus(status: RunnerStatus, isActive: boolean): void {
        this.statusChannel.send({ status, isActive });
    }

    async loadPlugin(location: string): Promise<IPlugin> {
        const plugin = await import(location) as IPlugin;
        this.conduit.registerPlugin(plugin);
        return plugin;
    }

    async loadModule(location: string) {
        const module = await this.loadPlugin(location) as IModulePlugin;
        if (!module.hook) {
            this.conduit.unregisterPlugin(module);
            throw Error("plugin is not module!");
        }
        module.hook(this.evaluator);
        return module;
    }

    constructor(evaluator: IEvaluator) {
        this.evaluator = evaluator;
    }
}

