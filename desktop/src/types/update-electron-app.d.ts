declare module 'update-electron-app' {
    interface UpdateElectronAppOptions {
        repo?: string;
        updateInterval?: string;
        logger?: {
            log: (message: string) => void;
            info: (message: string) => void;
            error: (message: string) => void;
        };
        notifyUser?: boolean;
    }

    function updateElectronApp(options?: UpdateElectronAppOptions): void;
    
    export = updateElectronApp;
}