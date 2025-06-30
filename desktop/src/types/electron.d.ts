/// <reference types="electron" />

// Electron type extensions
declare namespace NodeJS {
  interface Process {
    defaultApp?: boolean;
  }
}

// IPC Event types
import { IpcMainInvokeEvent, IpcMainEvent } from 'electron';

export type { IpcMainInvokeEvent, IpcMainEvent };