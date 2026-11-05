import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  serverUrl: string;
}

export function normalizeURL(raw: string): string {
  let trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("URL 不能为空");
  }
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.host) {
      throw new Error(`无效的实例地址: ${raw}`);
    }
    // 移除末尾斜杠
    return trimmed.replace(/\/+$/, "");
  } catch (err: any) {
    throw new Error(`无效的实例地址: ${err?.message || raw}`);
  }
}

export function loadConfig(configPath: string): AppConfig {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const data = JSON.parse(content);
      return {
        serverUrl: data.serverUrl || "",
      };
    }
  } catch (e) {
    console.warn("[Config] 读取配置失败，采用默认值:", e);
  }
  return { serverUrl: "" };
}

export function saveConfig(configPath: string, cfg: AppConfig): void {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (e) {
    console.error("[Config] 保存配置失败:", e);
    throw e;
  }
}
