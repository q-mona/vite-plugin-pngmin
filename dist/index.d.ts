declare function pngmin(): {
    name: string;
    apply: string;
    configResolved(config: any): void;
    transform(code: string, id: string): Promise<string>;
    generateBundle(_: any, bundle: any): Promise<void>;
    closeBundle(): Promise<void>;
};

export { pngmin as default };
