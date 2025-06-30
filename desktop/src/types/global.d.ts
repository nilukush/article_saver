// Global type declarations for Electron
declare namespace NodeJS {
    interface ProcessVersions {
        electron: string;
    }
}

// Electron module augmentation
declare module 'electron' {
    // TypeScript will use the built-in Electron types
}

// Ensure this file is treated as a module
export {};