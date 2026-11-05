import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { loadConfig, normalizeURL, saveConfig } from "../src/config";

describe("Config & URL normalization tests", () => {
  test("自动补齐 https 协议并去除末尾斜杠", () => {
    expect(normalizeURL("rakazo.my-vps.com")).toBe("https://rakazo.my-vps.com");
    expect(normalizeURL("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeURL("https://example.com/sub/")).toBe("https://example.com/sub");
  });

  test("空字符串应抛出错误", () => {
    expect(() => normalizeURL("")).toThrow("URL 不能为空");
    expect(() => normalizeURL("   ")).toThrow("URL 不能为空");
  });

  test("配置文件读写", () => {
    const tmpFile = path.join(os.tmpdir(), `rakazo-test-${Date.now()}.json`);
    try {
      saveConfig(tmpFile, { serverUrl: "https://test.rakazo.com" });
      const cfg = loadConfig(tmpFile);
      expect(cfg.serverUrl).toBe("https://test.rakazo.com");
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });
});
