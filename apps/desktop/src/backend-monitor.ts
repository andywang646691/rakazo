import type { BrowserWindow } from "electron";
import { app, Notification, session } from "electron";
import { unreadBadgeCount } from "./unread-badge";

export interface ChatAlert {
  kind: "completion" | "failure" | "help" | "takeover";
  title: string;
  body: string;
  spaceId: string;
  botId: string;
  threadId: string;
  groupId?: string;
}

export class BackendMonitor {
  private serverUrl: string = "";
  private currentSpaceId: string | null = null;
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastWorkingState: boolean = false;
  private lastBadgeCount: number | null = null;
  private onStatusChangeCallback: ((isWorking: boolean) => void) | null = null;
  private getMainWindow: (() => BrowserWindow | null) | null = null;

  constructor(options: {
    getMainWindow: () => BrowserWindow | null;
    onStatusChange: (isWorking: boolean) => void;
  }) {
    this.getMainWindow = options.getMainWindow;
    this.onStatusChangeCallback = options.onStatusChange;
  }

  public start(serverUrl: string) {
    if (!serverUrl) return;
    this.stop();
    this.serverUrl = serverUrl.replace(/\/+$/, "");
    this.isRunning = true;
    console.log(`[BackendMonitor] 启动主进程独立监听，目标实例: ${this.serverUrl}`);

    // 1. 启动状态轮询循环 (spaces/list)
    this.startStatusPolling();

    // 2. 启动通知事件流监听 (notifications/subscribe)
    this.startAlertStream();
  }

  public stop() {
    this.isRunning = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.publishBadge(0);
    console.log("[BackendMonitor] 主进程独立监听已停止");
  }

  private async getCookieHeader(): Promise<string> {
    try {
      const cookies = await session.defaultSession.cookies.get({ url: this.serverUrl });
      return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    } catch (e) {
      console.warn("[BackendMonitor] 读取 session cookies 失败:", e);
      return "";
    }
  }

  private startStatusPolling() {
    const poll = async () => {
      if (!this.isRunning) return;
      await this.checkStatus();
    };

    // 立即执行一次
    poll();
    // 每 3.5 秒独立轮询一次
    this.pollTimer = setInterval(poll, 3500);
  }

  private async checkStatus() {
    try {
      const cookieHeader = await this.getCookieHeader();
      if (!cookieHeader) {
        this.publishBadge(0);
        return;
      }

      const headers: Record<string, string> = {
        "content-type": "application/json",
        cookie: cookieHeader,
      };
      if (this.currentSpaceId) {
        headers["x-rakazo-space-id"] = this.currentSpaceId;
      }

      const res = await fetch(`${this.serverUrl}/rpc/spaces/list`, {
        method: "POST",
        headers,
        body: "{}",
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.publishBadge(0);
          return;
        }
        return;
      }

      const data = (await res.json()) as any;
      const navigation = data?.json;
      const current = navigation?.current;
      if (!current) return;
      this.publishBadge(unreadBadgeCount(navigation));

      if (current.id && current.id !== this.currentSpaceId) {
        this.currentSpaceId = current.id;
      }

      const bots: Array<{ status?: string }> = current.bots || [];
      const isWorking = bots.some(
        (b) => b.status === "running" || b.status === "leased" || b.status === "queued",
      );

      if (isWorking !== this.lastWorkingState) {
        this.lastWorkingState = isWorking;
        console.log(`[BackendMonitor] 主进程直接检测到任务状态变更 -> isWorking: ${isWorking}`);
        this.onStatusChangeCallback?.(isWorking);
      }
    } catch (_err: any) {
      // 网络偶发波动，不阻断主流程
    }
  }

  private publishBadge(count: number) {
    if (this.lastBadgeCount === count) return;
    this.lastBadgeCount = count;
    if (typeof app.setBadgeCount === "function") app.setBadgeCount(count);
  }

  private async startAlertStream() {
    while (this.isRunning) {
      this.abortController = new AbortController();
      try {
        const cookieHeader = await this.getCookieHeader();
        if (!cookieHeader) {
          // 尚未登录，等待 3 秒后重试
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const headers: Record<string, string> = {
          "content-type": "application/json",
          cookie: cookieHeader,
        };
        if (this.currentSpaceId) {
          headers["x-rakazo-space-id"] = this.currentSpaceId;
        }

        console.log("[BackendMonitor] 主进程直接发起 notifications.subscribe 连接...");
        const response = await fetch(`${this.serverUrl}/rpc/notifications/subscribe`, {
          method: "POST",
          headers,
          body: "{}",
          signal: this.abortController.signal,
        });

        if (!response.ok) {
          console.warn(
            `[BackendMonitor] notifications.subscribe 连接被拒 (status: ${response.status})，稍后重试`,
          );
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        console.log("[BackendMonitor] notifications.subscribe 长连接已建立，开始监听事件流");
        const reader = response.body?.getReader();
        if (!reader) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (this.isRunning) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const block of parts) {
            this.handleSseBlock(block);
          }
        }
      } catch (err: any) {
        if (!this.isRunning) return;
        if (err.name !== "AbortError") {
          console.warn("[BackendMonitor] notifications.subscribe 异常断开:", err?.message || err);
        }
      }

      // 重连延迟
      if (this.isRunning) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  private handleSseBlock(block: string) {
    const lines = block.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "{}") continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const event = parsed.json;
          if (!event) continue;

          if (event.type === "alert" && event.alert) {
            this.onAlertReceived(event.alert);
          }
        } catch (_e) {
          // parse error
        }
      }
    }
  }

  private onAlertReceived(alert: ChatAlert) {
    console.log(
      `[BackendMonitor] 主进程直接收到警报事件: [${alert.kind}] ${alert.title} - ${alert.body}`,
    );

    // 收到任务完成或失败时，立即触发一次状态核验
    this.checkStatus();

    // 仅在主窗口未处于前台焦点状态时发出原生系统通知（避免用户正在该窗口聊天时受到干扰）
    const mainWindow = this.getMainWindow?.();
    const isWindowFocused = mainWindow ? mainWindow.isFocused() && mainWindow.isVisible() : false;

    if (!isWindowFocused) {
      try {
        const notification = new Notification({
          title: alert.title || "Rakazo",
          body: alert.body || "",
          silent: false,
        });

        notification.on("click", () => {
          const win = this.getMainWindow?.();
          if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }
        });

        notification.show();
        console.log(`[BackendMonitor] macOS 原生系统通知已弹出: ${alert.title}`);
      } catch (err) {
        console.error("[BackendMonitor] 调用系统通知失败:", err);
      }
    }
  }
}
