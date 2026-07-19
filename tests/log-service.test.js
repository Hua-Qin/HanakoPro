import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// LogService 不依赖外部模块，直接 import
import { LogService } from "../lib/log-service/index.js";

describe("LogService", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hana-log-service-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe("基本写入", () => {
    it("写入后 tail 能读到", () => {
      const svc = new LogService(tmpDir);
      svc.log("test", "hello world");
      svc._flushSync(); // 强制 flush
      const tail = svc.tail(10);
      expect(tail.length).toBe(1);
      expect(tail[0]).toContain("[INFO]");
      expect(tail[0]).toContain("[test]");
      expect(tail[0]).toContain("hello world");
    });

    it("三种级别都能写入", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod", "info msg");
      svc.warn("mod", "warn msg");
      svc.error("mod", "error msg");
      svc._flushSync();
      const tail = svc.tail(10);
      expect(tail.length).toBe(3);
      expect(tail[0]).toContain("[INFO]");
      expect(tail[1]).toContain("[WARN]");
      expect(tail[2]).toContain("[ERROR]");
    });

    it("filePath 属性指向正确文件", () => {
      const svc = new LogService(tmpDir);
      expect(svc.filePath).toMatch(/\.log$/);
      expect(svc.logDir).toBe(tmpDir);
    });
  });

  describe("去重", () => {
    it("连续相同日志只计一条 + 补写摘要", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod", "same msg");
      svc.log("mod", "same msg");
      svc.log("mod", "same msg");
      svc.log("mod", "different msg");
      svc._flushSync();
      const tail = svc.tail(20);
      // 第一条 + 摘要 + 第二条
      const joined = tail.join("\n");
      expect(joined).toContain("same msg");
      expect(joined).toContain("重复 3 次");
      expect(joined).toContain("different msg");
    });

    it("不同级别不去重", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod", "msg");
      svc.error("mod", "msg");
      svc._flushSync();
      expect(svc.tail(10).length).toBe(2);
    });

    it("不同模块不去重", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod-a", "msg");
      svc.log("mod-b", "msg");
      svc._flushSync();
      expect(svc.tail(10).length).toBe(2);
    });
  });

  describe("ring buffer", () => {
    it("超过上限时环形覆盖旧条目", () => {
      const svc = new LogService(tmpDir);
      // 写入 1200 条（上限 1000）
      for (let i = 0; i < 1200; i++) {
        svc.log("mod", `msg-${i}`);
      }
      const { entries } = svc.query({ limit: 1000 });
      // ring buffer 只保留最近 1000 条
      expect(entries.length).toBeLessThanOrEqual(1000);
      // 最新一条应该在
      const msgs = entries.map((e) => e.msg);
      expect(msgs).toContain("msg-1199");
      // 最老的不应该在
      expect(msgs).not.toContain("msg-0");
    });
  });

  describe("query 筛选", () => {
    it("按级别筛选", () => {
      const svc = new LogService(tmpDir);
      svc.log("a", "info 1");
      svc.warn("a", "warn 1");
      svc.error("a", "error 1");
      svc.log("a", "info 2");

      const result = svc.query({ levels: ["ERROR"] });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].level).toBe("ERROR");
    });

    it("按模块筛选", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod-a", "msg 1");
      svc.log("mod-b", "msg 2");
      svc.log("mod-a", "msg 3");

      const result = svc.query({ module: "mod-a" });
      expect(result.entries.length).toBe(2);
      expect(result.entries.every((e) => e.module === "mod-a")).toBe(true);
    });

    it("按关键词筛选", () => {
      const svc = new LogService(tmpDir);
      svc.log("a", "the quick brown fox");
      svc.log("a", "jumps over lazy dog");

      const result = svc.query({ keyword: "fox" });
      expect(result.entries.length).toBe(1);
      expect(result.entries[0].msg).toContain("fox");
    });

    it("分页 offset + limit", () => {
      const svc = new LogService(tmpDir);
      for (let i = 0; i < 10; i++) {
        svc.log("mod", `msg-${i}`);
      }
      const page1 = svc.query({ limit: 3, offset: 0 });
      const page2 = svc.query({ limit: 3, offset: 3 });
      expect(page1.total).toBe(10);
      expect(page1.entries.length).toBe(3);
      expect(page2.entries.length).toBe(3);
      // 两页不应重叠
      const page1Msgs = page1.entries.map((e) => e.msg);
      const page2Msgs = page2.entries.map((e) => e.msg);
      for (const m of page2Msgs) {
        expect(page1Msgs).not.toContain(m);
      }
    });
  });

  describe("categories", () => {
    it("返回所有已记录的模块名", () => {
      const svc = new LogService(tmpDir);
      svc.log("engine", "msg");
      svc.warn("bridge", "msg");
      svc.error("session", "msg");
      const cats = svc.categories();
      expect(cats).toContain("engine");
      expect(cats).toContain("bridge");
      expect(cats).toContain("session");
    });
  });

  describe("clear", () => {
    it("清空 ring buffer 和模块集合", () => {
      const svc = new LogService(tmpDir);
      svc.log("a", "msg");
      svc.error("b", "msg");
      expect(svc.query().total).toBeGreaterThan(0);
      svc.clear();
      expect(svc.query().total).toBe(0);
      expect(svc.categories().length).toBe(0);
    });
  });

  describe("exportText", () => {
    it("导出包含 header 和日志内容", () => {
      const svc = new LogService(tmpDir);
      svc.log("mod", "export test");
      svc._flushSync();
      const text = svc.exportText();
      expect(text).toContain("# HanakoPro Log Export");
      expect(text).toContain("export test");
    });
  });

  describe("header / close", () => {
    it("header 写入启动信息", () => {
      const svc = new LogService(tmpDir);
      svc.header("1.0.0", { model: "test-model", agent: "Hanako", agentId: "abc" });
      svc._flushSync();
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).toContain("Hanako v1.0.0");
      expect(content).toContain("test-model");
      expect(content).toContain("Hanako");
    });

    it("close 写入关闭标记", () => {
      const svc = new LogService(tmpDir);
      svc.close();
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).toContain("Server shutting down");
    });
  });

  describe("脱敏", () => {
    it("api_key 被脱敏", () => {
      const svc = new LogService(tmpDir);
      svc.log("api", `request with api_key=sk-abcdefghijklmnopqrstuvwxyz123456`);
      svc._flushSync();
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456");
      expect(content).toContain("[redacted]");
    });

    it("home 路径被脱敏", () => {
      const svc = new LogService(tmpDir);
      const home = os.homedir();
      svc.log("fs", `reading ${home}/secret.txt`);
      svc._flushSync();
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).not.toContain(home);
    });
  });

  describe("异步写入", () => {
    it("buffer 在 flush 后写入文件", () => {
      const svc = new LogService(tmpDir);
      svc.log("a", "buffered msg");
      // flush 前文件可能还没写入
      svc._flushSync();
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).toContain("buffered msg");
    });

    it("超过 MAX_BUFFER_LINES 时强制 flush", () => {
      const svc = new LogService(tmpDir);
      // 写入大量日志触发强制 flush
      for (let i = 0; i < 600; i++) {
        svc.log("bulk", `msg-${i}`);
      }
      const content = fs.readFileSync(svc.filePath, "utf-8");
      expect(content).toContain("msg-599");
    });
  });

  describe("文件轮转", () => {
    it("超过 MAX_FILE_SIZE 时轮转生成 .log.1", () => {
      const svc = new LogService(tmpDir);
      // 写入足够大的内容触发轮转（每条约 50 字节，写 120000 条 > 5MB）
      const bigMsg = "x".repeat(200);
      for (let i = 0; i < 30000; i++) {
        svc.log("bulk", `${bigMsg}-${i}`);
      }
      svc._flushSync();
      // .log.1 应该存在
      const rotatedPath = `${svc.filePath}.1`;
      expect(fs.existsSync(rotatedPath)).toBe(true);
    });
  });
});
