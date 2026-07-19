import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// mock logService 返回可控实例
const { logServiceMock } = vi.hoisted(() => ({
  logServiceMock: { current: null },
}));

vi.mock("../lib/log-service/index.js", () => ({
  logService: () => logServiceMock.current,
  initLogService: vi.fn(() => logServiceMock.current),
  createModuleLogger: vi.fn(() => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { createLogsRoute } from "../server/routes/logs.js";
import { LogService } from "../lib/log-service/index.js";

describe("logs route", () => {
  let tmpDir;
  let svc;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hana-logs-route-"));
    svc = new LogService(tmpDir);
    logServiceMock.current = svc;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  async function fetchRoute(route, path, opts = {}) {
    const app = route;
    const url = `http://localhost${path}`;
    const req = new Request(url, {
      method: opts.method || "GET",
      headers: opts.headers || {},
      body: opts.body,
    });
    const res = await app.fetch(req);
    return {
      status: res.status,
      headers: res.headers,
      json: async () => res.json(),
      text: async () => res.text(),
      blob: async () => res.blob(),
    };
  }

  describe("GET /api/logs", () => {
    it("返回日志条目", async () => {
      svc.log("engine", "started");
      svc.error("bridge", "connection failed");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries.length).toBe(2);
      expect(data.entries[0].module).toBe("engine");
      expect(data.entries[1].module).toBe("bridge");
    });

    it("按级别筛选", async () => {
      svc.log("a", "info");
      svc.error("a", "error");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs?levels=ERROR");
      const data = await res.json();
      expect(data.entries.length).toBe(1);
      expect(data.entries[0].level).toBe("ERROR");
    });

    it("按模块筛选", async () => {
      svc.log("mod-a", "msg1");
      svc.log("mod-b", "msg2");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs?module=mod-a");
      const data = await res.json();
      expect(data.entries.length).toBe(1);
      expect(data.entries[0].module).toBe("mod-a");
    });

    it("按关键词筛选", async () => {
      svc.log("a", "the quick brown fox");
      svc.log("a", "lazy dog");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs?keyword=fox");
      const data = await res.json();
      expect(data.entries.length).toBe(1);
      expect(data.entries[0].msg).toContain("fox");
    });

    it("时间范围筛选", async () => {
      svc.log("a", "old msg");
      svc._flushSync();

      const route = createLogsRoute();
      // 1h 范围应该包含刚写入的日志
      const res1 = await fetchRoute(route, "/api/logs?timeRange=1h");
      const data1 = await res1.json();
      expect(data1.entries.length).toBe(1);

      // all 范围也包含
      const res2 = await fetchRoute(route, "/api/logs?timeRange=all");
      const data2 = await res2.json();
      expect(data2.entries.length).toBe(1);
    });
  });

  describe("GET /api/logs/categories", () => {
    it("返回模块列表", async () => {
      svc.log("engine", "msg");
      svc.warn("bridge", "msg");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs/categories");
      const data = await res.json();
      expect(data.categories).toContain("engine");
      expect(data.categories).toContain("bridge");
    });
  });

  describe("GET /api/logs/export", () => {
    it("返回 txt 文件下载", async () => {
      svc.log("mod", "export test");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs/export");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/plain");
      expect(res.headers.get("Content-Disposition")).toContain("attachment");
      const text = await res.text();
      expect(text).toContain("# HanakoPro Log Export");
      expect(text).toContain("export test");
    });
  });

  describe("DELETE /api/logs", () => {
    it("清空日志", async () => {
      svc.log("a", "msg1");
      svc.log("b", "msg2");
      svc._flushSync();

      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs", { method: "DELETE" });
      const data = await res.json();
      expect(data.ok).toBe(true);

      // 再次查询应该为空
      const res2 = await fetchRoute(route, "/api/logs");
      const data2 = await res2.json();
      expect(data2.entries.length).toBe(0);
    });
  });

  describe("未初始化", () => {
    it("logService 为 null 时返回 503", async () => {
      logServiceMock.current = null;
      const route = createLogsRoute();
      const res = await fetchRoute(route, "/api/logs");
      expect(res.status).toBe(503);
    });
  });
});
