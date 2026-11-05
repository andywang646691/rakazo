import { contextBridge, ipcRenderer } from "electron";

function subscribe(channel: string, listener: () => void) {
  const handler = () => listener();
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

function subscribeWithPayload<T>(channel: string, listener: (payload: T) => void) {
  const handler = (_event: unknown, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

/** The bridge this Mac client actually serves. The web app treats every other member as absent. */
export interface RakazoMacDesktop {
  platform: string;
  badge: {
    set: (count: number) => Promise<boolean>;
  };
  settings: {
    onOpen: (listener: () => void) => () => void;
  };
  menu: {
    onCommand: (listener: (command: string) => void) => () => void;
  };
  window: {
    close: () => Promise<boolean>;
    minimize: () => Promise<boolean>;
    toggleMaximize: () => Promise<boolean>;
    state: () => Promise<{ minimized: boolean; maximized: boolean; fullScreen: boolean }>;
  };
  /** The first-run page connects the window to a server. The signed-in app does not call this. */
  connectInstance: (rawUrl: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
}

const rakazoDesktop: RakazoMacDesktop = {
  platform: process.platform,
  badge: {
    set: (count) => ipcRenderer.invoke("desktop.badge.set", count),
  },
  settings: {
    onOpen: (listener) => subscribe("desktop.settings.open", listener),
  },
  menu: {
    onCommand: (listener) => subscribeWithPayload<string>("desktop.menu.command", listener),
  },
  window: {
    close: () => ipcRenderer.invoke("desktop.window.close"),
    minimize: () => ipcRenderer.invoke("desktop.window.minimize"),
    toggleMaximize: () => ipcRenderer.invoke("desktop.window.toggleMaximize"),
    state: () => ipcRenderer.invoke("desktop.window.state"),
  },
  connectInstance: (rawUrl) => ipcRenderer.invoke("desktop.config.connect", rawUrl),
};

contextBridge.exposeInMainWorld("rakazoDesktop", rakazoDesktop);
