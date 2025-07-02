declare module 'update-electron-app' {
    export interface UpdateElectronAppOptions {
        repo?: string;
        updateInterval?: string;
        logger?: {
            log: (message: string) => void;
            info: (message: string) => void;
            error: (message: string) => void;
        };
        notifyUser?: boolean;
    }

    export enum UpdateSourceType {
        ElectronPublicUpdateService = 'ElectronPublicUpdateService',
        StaticStorage = 'StaticStorage'
    }

    export interface UpdateSource {
        type: UpdateSourceType;
        repo?: string;
        baseUrl?: string;
    }

    export interface UpdateElectronAppOptionsWithSource {
        updateSource?: UpdateSource;
        updateInterval?: string;
        logger?: {
            log: (message: string) => void;
            info: (message: string) => void;
            error: (message: string) => void;
        };
        notifyUser?: boolean;
    }

    export function updateElectronApp(options?: UpdateElectronAppOptions | UpdateElectronAppOptionsWithSource): void;
}