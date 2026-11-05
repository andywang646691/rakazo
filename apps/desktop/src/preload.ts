import { contextBridge, ipcRenderer } from "electron";
import { CHAT_ENHANCEMENTS_CSS } from "./chat-theme";

function subscribe(channel: string, listener: () => void) {
  const handler = () => listener();
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

function subscribeWithPayload<T = any>(channel: string, listener: (payload: T) => void) {
  const handler = (_event: any, payload: T) => listener(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

function injectDesktopEnhancements() {
  const styleId = "rakazo-desktop-enhancements";
  const apply = () => {
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = CHAT_ENHANCEMENTS_CSS;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
}

try {
  injectDesktopEnhancements();
} catch (e) {
  console.warn("[Rakazo Preload] 样式注入异常:", e);
}

const rakazoDesktopAPI = {
  platform: process.platform,
  nativeWindowFrame: process.platform === "win32",
  badge: {
    set: (count: number) => ipcRenderer.invoke("desktop.badge.set", count),
  },
  computer: {
    managesHostChoice: true,
    requestAccess: () => ipcRenderer.invoke("desktop.computer.requestAccess"),
    revokeAccess: () => ipcRenderer.invoke("desktop.computer.revokeAccess"),
    onConfigure: (listener: () => void) => subscribe("desktop.computer.configure", listener),
  },
  settings: {
    onOpen: (listener: () => void) => subscribe("desktop.settings.open", listener),
  },
  device: {
    state: () => ipcRenderer.invoke("desktop.device.state"),
    setAllowed: (allowed: boolean) => ipcRenderer.invoke("desktop.device.setAllowed", allowed),
  },
  locale: {
    set: (locale: string) => ipcRenderer.invoke("desktop.locale.set", locale),
  },
  menu: {
    onCommand: (listener: (command: string) => void) =>
      subscribeWithPayload<string>("desktop.menu.command", listener),
  },
  monitoring: {
    enabled: () => ipcRenderer.invoke("desktop.monitoring.enabled"),
  },
  passkeys: {
    rpIds: () => ipcRenderer.invoke("desktop.passkeys.rpIds"),
  },
  window: {
    close: () => ipcRenderer.invoke("desktop.window.close"),
    minimize: () => ipcRenderer.invoke("desktop.window.minimize"),
    toggleMaximize: () => ipcRenderer.invoke("desktop.window.toggleMaximize"),
    state: () => ipcRenderer.invoke("desktop.window.state"),
  },
  update: {
    state: () => ipcRenderer.invoke("desktop.update.state"),
    check: () => ipcRenderer.invoke("desktop.update.check"),
    download: () => ipcRenderer.invoke("desktop.update.download"),
    install: () => ipcRenderer.invoke("desktop.update.install"),
  },
  oauth: {
    open: (url: string) => ipcRenderer.invoke("desktop.oauth.open", url),
    cancel: (url: string) => ipcRenderer.invoke("desktop.oauth.cancel", url),
    onCallback: (listener: (data: any) => void) =>
      subscribeWithPayload("desktop.oauth.callback", listener),
  },
  // 实例连接与切换配置支持
  connectInstance: (rawUrl: string) => ipcRenderer.invoke("desktop.config.connect", rawUrl),
  resetServer: () => ipcRenderer.invoke("desktop.config.reset"),
  tray: {
    setWorking: (isWorking: boolean) => ipcRenderer.invoke("desktop.tray.setWorking", isWorking),
  },
};

try {
  contextBridge.exposeInMainWorld("rakazoDesktop", rakazoDesktopAPI);
  contextBridge.exposeInMainWorld("rakazoDesktopNotifyBridge", {
    show: (payload: { title: string; body: string; tag?: string }) => {
      ipcRenderer.invoke("desktop.notify.show", payload);
    },
  });
  // 向后兼容旧 MyGo 调用
  contextBridge.exposeInMainWorld("mygo", {
    call: async (method: string, ...args: any[]) => {
      if (method === "DesktopBridge.ConnectInstance") {
        return await ipcRenderer.invoke("desktop.config.connect", args[0]);
      }
      if (method === "DesktopBridge.ResetServer") {
        return await ipcRenderer.invoke("desktop.config.reset");
      }
      if (method === "DesktopBridge.SetBadge") {
        return await ipcRenderer.invoke("desktop.badge.set", args[0]);
      }
      if (method === "DesktopBridge.ShowNotification") {
        return await ipcRenderer.invoke("desktop.notify.show", args[0]);
      }
      return null;
    },
    on: (event: string, cb: (...args: any[]) => void) => {
      if (event === "desktop:menu-command") {
        ipcRenderer.on("desktop.menu.command", (_e, cmd) => cb(cmd));
      } else if (event === "desktop:settings-open") {
        ipcRenderer.on("desktop.settings.open", () => cb());
      } else if (event === "desktop:oauth-callback") {
        ipcRenderer.on("desktop.oauth.callback", (_e, data) => cb(data));
      }
    },
  });
} catch (_e) {
  (window as any).rakazoDesktop = rakazoDesktopAPI;
}
