import path from "node:path";
import type { MenuItemConstructorOptions } from "electron";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  nativeImage,
  session,
  shell,
  Tray,
} from "electron";
import { BackendMonitor } from "./backend-monitor";
import { CHAT_ENHANCEMENTS_CSS } from "./chat-theme";
import { loadConfig, normalizeURL, saveConfig } from "./config";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let backendMonitor: BackendMonitor | null = null;

// 存储活动通知引用以便通过 tag 合并防刷屏
const activeNotifications = new Map<string, Notification>();

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function getFrontendIndexPath(): string {
  return path.join(app.getAppPath(), "frontend/index.html");
}

function getTrayIconPath(): string {
  return path.join(app.getAppPath(), "assets/trayTemplate.png");
}

function getWorkingTrayIconPath(): string {
  return path.join(app.getAppPath(), "assets/trayWorking.png");
}

function updateTrayWorkingState(isWorking: boolean) {
  if (!tray) return;
  if (isWorking) {
    const iconPath = getWorkingTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(false);
    tray.setImage(icon);
    tray.setToolTip("Rakazo (有任务处理中...)");
  } else {
    const iconPath = getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
    tray.setImage(icon);
    tray.setToolTip("Rakazo");
  }
}

function loadInitialPage() {
  if (!mainWindow) return;

  const cfg = loadConfig(getConfigPath());
  if (cfg.serverUrl) {
    backendMonitor?.start(cfg.serverUrl);
    mainWindow.loadURL(cfg.serverUrl).catch((err) => {
      console.warn("[Rakazo Main] 加载配置 URL 失败，退回引导页:", err);
      mainWindow?.loadFile(getFrontendIndexPath());
    });
  } else {
    mainWindow.loadFile(getFrontendIndexPath());
  }
}

function resetServer() {
  try {
    saveConfig(getConfigPath(), { serverUrl: "" });
  } catch (e) {
    console.error("[Rakazo Main] 清除配置失败:", e);
  }
  backendMonitor?.stop();
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.loadFile(getFrontendIndexPath());
  }
}

function buildMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "Rakazo",
      submenu: [
        { role: "about", label: "关于 Rakazo" },
        { type: "separator" },
        {
          label: "Preferences...",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow?.webContents.send("desktop.settings.open");
          },
        },
        {
          label: "切换服务器地址...",
          click: () => {
            resetServer();
          },
        },
        { type: "separator" },
        { role: "hide", label: "隐藏 Rakazo" },
        { role: "hideOthers", label: "隐藏其他" },
        { role: "unhide", label: "全部显示" },
        { type: "separator" },
        {
          label: "退出 Rakazo",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            isQuitting = true;
            backendMonitor?.stop();
            app.quit();
          },
        },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("desktop.menu.command", "new");
          },
        },
        { type: "separator" },
        { role: "close", label: "关闭窗口" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "zoom", label: "缩放" },
        { type: "separator" },
        { role: "front", label: "前置全部窗口" },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createTray() {
  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip("Rakazo");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示 Rakazo",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: "切换服务器...",
      click: () => {
        resetServer();
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        isQuitting = true;
        backendMonitor?.stop();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
          mainWindow.hide();
        } else {
          mainWindow.focus();
        }
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#161616",
    title: "Rakazo",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(app.getAppPath(), "bundle/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  // 1. 加载持久化配置或引导页
  loadInitialPage();

  // 2. 外部链接跳转处理
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const cfg = loadConfig(getConfigPath());
    if (cfg.serverUrl && url.startsWith(cfg.serverUrl)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 3. 右键菜单定制：禁止在非输入区弹出空白网页菜单
  mainWindow.webContents.on("context-menu", (_event, params) => {
    if (params.isEditable) {
      const menu = Menu.buildFromTemplate([
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
      ]);
      menu.popup();
    } else if (params.selectionText) {
      const menu = Menu.buildFromTemplate([{ role: "copy", label: "复制" }]);
      menu.popup();
    }
  });

  // 4. 拦截关闭按钮：隐藏窗口至后台托盘，避免误关
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 5. 注入现代毛玻璃渐变拖动条与 Grok 风格 Bot 悬浮胶囊样式
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.insertCSS(CHAT_ENHANCEMENTS_CSS).catch((err) => {
      console.warn("[Rakazo Main] insertCSS 失败:", err);
    });
  });
}

// 统一的原生通知派发与 tag 合并处理
function postNotification(payload: { title: string; body: string; tag?: string; data?: any }) {
  if (!Notification.isSupported()) return;

  const tag = payload.tag || "";

  // 防刷屏合并：若有相同 tag 的通知在展示，先关闭前一条
  if (tag && activeNotifications.has(tag)) {
    try {
      const prev = activeNotifications.get(tag);
      prev?.close();
    } catch (_e) {
      // ignore
    }
  }

  const notification = new Notification({
    title: payload.title || "Rakazo",
    body: payload.body,
    silent: false,
  });

  if (tag) {
    activeNotifications.set(tag, notification);
  }

  notification.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();

      if (payload.data?.url) {
        mainWindow.loadURL(payload.data.url);
      }
    }
  });

  notification.on("close", () => {
    if (tag && activeNotifications.get(tag) === notification) {
      activeNotifications.delete(tag);
    }
  });

  notification.show();
}

// IPC 消息处理与契约对齐
function registerIpcHandlers() {
  // 1. 系统通知与托盘辅助
  ipcMain.on("desktop.notify.post", (_event, payload) => {
    postNotification(payload);
  });
  ipcMain.handle("desktop.notify.show", (_event, payload) => {
    postNotification(payload);
    return true;
  });
  ipcMain.handle("desktop.tray.setWorking", (_event, isWorking: boolean) => {
    updateTrayWorkingState(Boolean(isWorking));
    return true;
  });

  // 2. Dock 未读数角标
  ipcMain.handle("desktop.badge.set", (_event, count: number) => {
    if (typeof app.setBadgeCount === "function") {
      return app.setBadgeCount(count);
    }
    return false;
  });

  // 3. 窗口操作
  ipcMain.handle("desktop.window.close", () => {
    mainWindow?.close();
    return true;
  });
  ipcMain.handle("desktop.window.minimize", () => {
    mainWindow?.minimize();
    return true;
  });
  ipcMain.handle("desktop.window.toggleMaximize", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return true;
  });
  ipcMain.handle("desktop.window.state", () => {
    return {
      minimized: mainWindow?.isMinimized() ?? false,
      maximized: mainWindow?.isMaximized() ?? false,
      fullScreen: mainWindow?.isFullScreen() ?? false,
    };
  });

  // 4. 配置与实例切换
  ipcMain.handle("desktop.config.connect", (_event, rawUrl: string) => {
    try {
      const normUrl = normalizeURL(rawUrl);
      saveConfig(getConfigPath(), { serverUrl: normUrl });
      backendMonitor?.start(normUrl);
      mainWindow?.loadURL(normUrl);
      return { ok: true, url: normUrl };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("desktop.config.reset", () => {
    resetServer();
    return true;
  });

  // 5. 占位/兼容调用
  ipcMain.handle("desktop.computer.requestAccess", () => false);
  ipcMain.handle("desktop.computer.revokeAccess", () => true);
  ipcMain.handle("desktop.device.state", () => ({}));
  ipcMain.handle("desktop.device.setAllowed", () => true);
  ipcMain.handle("desktop.locale.set", () => true);
  ipcMain.handle("desktop.monitoring.enabled", () => false);
  ipcMain.handle("desktop.passkeys.rpIds", () => []);
  ipcMain.handle("desktop.update.state", () => ({
    phase: "idle",
    currentVersion: "0.1.0",
    availableVersion: null,
    percent: null,
    message: null,
    checkedAt: new Date().toISOString(),
  }));
  ipcMain.handle("desktop.update.check", () => null);
  ipcMain.handle("desktop.update.download", () => null);
  ipcMain.handle("desktop.update.install", () => null);
  ipcMain.handle("desktop.oauth.open", () => null);
  ipcMain.handle("desktop.oauth.cancel", () => null);
}

// 应用程序生命周期
app.on("before-quit", () => {
  isQuitting = true;
  backendMonitor?.stop();
});

app.whenReady().then(() => {
  // 允许网页使用系统通知与剪贴板写入权限
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "notifications" || permission === "clipboard-sanitized-write") {
      callback(true);
      return;
    }
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "notifications" || permission === "clipboard-sanitized-write";
  });

  if (process.platform === "darwin" && app.dock) {
    const dockIconPath = path.join(app.getAppPath(), "assets/icon-macos.png");
    try {
      app.dock.setIcon(dockIconPath);
    } catch (e) {
      console.warn("[Rakazo Main] 设置 Dock 图标失败:", e);
    }
  }

  // 初始化主进程后台独立监听器
  backendMonitor = new BackendMonitor({
    getMainWindow: () => mainWindow,
    onStatusChange: (isWorking: boolean) => {
      updateTrayWorkingState(isWorking);
    },
  });

  registerIpcHandlers();
  Menu.setApplicationMenu(buildMenu());
  createTray();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
