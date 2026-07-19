/**
 * log-service/index.js - 应用内日志服务
 *
 * 设计目标（对应稳定性优化规划第 7 章）：
 *  1. 异步写入：内存 buffer + 1s 定时 flush，绝不阻塞业务主线程
 *  2. 文件轮转：单文件 5MB 上限，超限重命名 .log.1 -> .log.2 ... 保留 5 个
 *  3. 内存 ring buffer：保留最近 1000 条，前端查询走内存不读盘
 *  4. 30 天清理：启动时清理超过 30 天的旧日志文件
 *  5. 脱敏：所有写入走 redactLogText / redactLogLabel，复用 shared/log-redactor.cjs
 *  6. 去重：相同 level+module+msg 只计数，变化时补写摘要
 *  7. 向后兼容：保持 log()/warn()/error()/header()/close()/tail()/filePath 接口
 *
 * 与 lib/debug-log.js 的关系：debug-log.js 现在是本模块的兼容 re-export 层，
 * 所有现有代码 `import { debugLog, createModuleLogger, initDebugLog }` 无需修改。
 */

import fs from "fs";
import path from "path";
import os from "os";
import { redactLogLabel, redactLogText } from "../log-redactor.js";

const LEVELS = ["INFO", "WARN", "ERROR"];
const LEVEL_RANK = { INFO: 0, WARN: 1, ERROR: 2 };

// ── 可调参数 ──
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 单文件 5MB
const MAX_ROTATED_FILES = 5; // 保留 5 个轮转文件
const RING_BUFFER_SIZE = 1000; // 内存保留最近 1000 条
const FLUSH_INTERVAL_MS = 1000; // 1s flush 一次
const MAX_RETENTION_DAYS = 30; // 30 天清理
const MAX_BUFFER_LINES = 500; // 内存 buffer 硬上限，超限强制 flush

class LogService {
  /**
   * @param {string} logDir - 日志目录路径（如 ~/.hanako/logs）
   */
  constructor(logDir) {
    fs.mkdirSync(logDir, { recursive: true });

    const now = new Date();
    const ts =
      [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-") +
      "_" +
      [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join("-");

    this._filePath = path.join(logDir, `${ts}.log`);
    this._logDir = logDir;
    this._size = 0;
    this._redactOptions = { homeDir: os.homedir() };

    // 异步写入 buffer
    this._buffer = [];
    this._flushTimer = null;
    this._flushing = false;

    // 内存 ring buffer（供前端查询，不读盘）
    this._ring = [];
    this._ringHead = 0;

    // 去重状态
    this._dedup = { level: null, module: null, msg: null, count: 0 };

    // 已记录的模块集合（供 /api/logs/categories 查询）
    this._modules = new Set();

    // 清理旧日志
    this._cleanup(MAX_RETENTION_DAYS);
  }

  get filePath() {
    return this._filePath;
  }

  get logDir() {
    return this._logDir;
  }

  // ── 公共 API（与原 DebugLog 兼容） ──

  /**
   * 写启动头部信息
   * @param {string} version - 应用版本号
   * @param {object} info - 启动信息
   */
  header(version, info = {}) {
    const lines = [
      "═".repeat(60),
      `Hanako v${version} - started at ${new Date().toISOString()}`,
      "═".repeat(60),
    ];

    if (info.model) lines.push(`Model: ${info.model}`);
    if (info.agent) lines.push(`Agent: ${info.agent} (${info.agentId || "?"})`);
    if (info.utilityModel) lines.push(`Utility: ${info.utilityModel}`);
    if (info.channelsDir) lines.push("Channels: configured");

    lines.push("─".repeat(60), "");

    const text = lines.map((l) => redactLogText(l, this._redactOptions)).join("\n") + "\n";
    this._enqueueRaw(text);
  }

  /** 写关闭标记并 flush */
  close() {
    this._flushDedup();
    this._write("INFO", "system", "Server shutting down");
    this._enqueueRaw("\n" + "═".repeat(60) + "\n");
    this._flushSync();
  }

  /** INFO 级别日志 */
  log(module, msg) {
    this._write("INFO", module, msg);
  }

  /** ERROR 级别日志 */
  error(module, msg) {
    this._write("ERROR", module, msg);
  }

  /** WARN 级别日志 */
  warn(module, msg) {
    this._write("WARN", module, msg);
  }

  /**
   * 读取最近 N 行日志（从内存 ring buffer，不读盘）
   * @param {number} n - 行数
   * @returns {string[]}
   */
  tail(n = 100) {
    const ring = this._ring;
    if (ring.length === 0) return [];
    const start = Math.max(0, ring.length - n);
    return ring.slice(start).map((e) => this._formatLine(e));
  }

  // ── 查询 API（供 REST 路由调用） ──

  /**
   * 查询日志条目
   * @param {object} opts
   * @param {string[]} [opts.levels] - 筛选级别，如 ["ERROR","WARN"]
   * @param {string} [opts.module] - 筛选模块名
   * @param {string} [opts.keyword] - 关键词搜索（消息内容）
   * @param {number} [opts.since] - 起始时间戳（ms）
   * @param {number} [opts.until] - 结束时间戳（ms）
   * @param {number} [opts.limit=200] - 返回条数上限
   * @param {number} [opts.offset=0] - 偏移量（从最新往前算）
   * @returns {{ entries: object[], total: number }}
   */
  query(opts = {}) {
    const {
      levels,
      module: modFilter,
      keyword,
      since,
      until,
      limit = 200,
      offset = 0,
    } = opts;

    const levelSet = levels && levels.length > 0 ? new Set(levels) : null;
    const ring = this._ring;
    const matched = [];

    // ring buffer 从旧到新，我们从最新往前扫以满足 offset 语义
    for (let i = ring.length - 1; i >= 0; i--) {
      const entry = ring[i];
      if (levelSet && !levelSet.has(entry.level)) continue;
      if (modFilter && entry.module !== modFilter) continue;
      if (keyword && !entry.msg.includes(keyword)) continue;
      if (since && entry.ts < since) continue;
      if (until && entry.ts > until) continue;
      matched.push(entry);
    }

    // matched 现在是从新到旧
    const total = matched.length;
    const page = matched.slice(offset, offset + limit);
    // 返回时按时间从旧到新（前端更直观）
    page.reverse();
    return { entries: page, total };
  }

  /** 获取所有已记录的模块名列表 */
  categories() {
    return Array.from(this._modules).sort();
  }

  /**
   * 导出日志为文本
   * @param {object} opts - 同 query 的筛选参数
   * @returns {string}
   */
  exportText(opts = {}) {
    const { entries } = this.query({ ...opts, limit: Infinity, offset: 0 });
    const header = [
      `# HanakoPro Log Export`,
      `# Exported at: ${new Date().toISOString()}`,
      `# Source: ${this._filePath}`,
      `# Entries: ${entries.length}`,
      "",
    ].join("\n");
    return header + entries.map((e) => this._formatLine(e)).join("\n") + "\n";
  }

  /** 清空内存 ring buffer + 当前日志文件（轮转文件不动） */
  clear() {
    this._ring = [];
    this._ringHead = 0;
    this._modules.clear();
    this._dedup = { level: null, module: null, msg: null, count: 0 };
    this._buffer = [];
    // 截断当前文件
    try {
      fs.truncateSync(this._filePath, 0);
      this._size = 0;
    } catch {
      // 文件可能不存在，忽略
    }
  }

  /** 同步 flush 所有 buffer（用于关闭 / 测试） */
  _flushSync() {
    this._cancelFlushTimer();
    this._doFlush();
  }

  // ── 内部实现 ──

  /** 对消息做隐私清洗后入队（含去重判断） */
  _write(level, module, msg) {
    const cleanModule = redactLogLabel(module || "unknown");
    const cleaned = redactLogText(String(msg), this._redactOptions);

    // 去重：与上一条完全相同则只计数
    const d = this._dedup;
    if (d.level === level && d.module === cleanModule && d.msg === cleaned) {
      d.count++;
      return;
    }

    // 有积压的重复条目，先补写一行摘要
    this._flushDedup();

    // 更新去重状态
    this._dedup = { level, module: cleanModule, msg: cleaned, count: 1 };

    const entry = {
      ts: Date.now(),
      level,
      module: cleanModule,
      msg: cleaned,
    };

    this._pushRing(entry);
    this._modules.add(cleanModule);
    this._enqueue(entry);
  }

  /** 把积压的"重复 N 次"补写进 buffer */
  _flushDedup() {
    const d = this._dedup;
    if (d.count > 1) {
      const entry = {
        ts: Date.now(),
        level: "INFO",
        module: "dedup",
        msg: `⤷ 上条重复 ${d.count} 次`,
      };
      this._pushRing(entry);
      this._enqueue(entry);
    }
    this._dedup = { level: null, module: null, msg: null, count: 0 };
  }

  /** 推入 ring buffer（环形覆盖） */
  _pushRing(entry) {
    if (this._ring.length < RING_BUFFER_SIZE) {
      this._ring.push(entry);
    } else {
      this._ring[this._ringHead] = entry;
      this._ringHead = (this._ringHead + 1) % RING_BUFFER_SIZE;
    }
  }

  /** 格式化单条日志为文本行 */
  _formatLine(entry) {
    const now = new Date(entry.ts);
    const time =
      [
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join(":") + "." + String(now.getMilliseconds()).padStart(3, "0");
    return `[${time}] [${entry.level}] [${entry.module}] ${entry.msg}`;
  }

  /** 入队一条日志（异步 flush） */
  _enqueue(entry) {
    this._buffer.push(this._formatLine(entry) + "\n");
    // buffer 过大时强制同步 flush，防内存爆
    if (this._buffer.length >= MAX_BUFFER_LINES) {
      this._flushSync();
    } else {
      this._scheduleFlush();
    }
  }

  /** 入队原始文本（header / close 用） */
  _enqueueRaw(text) {
    this._buffer.push(text);
    this._scheduleFlush();
  }

  _scheduleFlush() {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this._doFlush();
    }, FLUSH_INTERVAL_MS);
    // 不阻塞进程退出
    if (typeof this._flushTimer.unref === "function") {
      this._flushTimer.unref();
    }
  }

  _cancelFlushTimer() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /** 实际写入文件（带轮转） */
  _doFlush() {
    if (this._flushing || this._buffer.length === 0) return;
    this._flushing = true;
    const chunk = this._buffer.join("");
    this._buffer = [];

    try {
      // 检查是否需要轮转
      if (this._size + Buffer.byteLength(chunk, "utf-8") > MAX_FILE_SIZE) {
        this._rotate();
      }
      fs.appendFileSync(this._filePath, chunk, "utf-8");
      this._size += Buffer.byteLength(chunk, "utf-8");
    } catch {
      // 写日志失败不应阻塞业务
    } finally {
      this._flushing = false;
    }
  }

  /** 文件轮转：.log -> .log.1 -> .log.2 ... 删除最老的 */
  _rotate() {
    try {
      // 1. 删除最老的轮转文件 .log.{MAX_ROTATED_FILES}
      const oldest = `${this._filePath}.${MAX_ROTATED_FILES}`;
      try { fs.unlinkSync(oldest); } catch {}

      // 2. 从老到新依次重命名：.log.(i-1) -> .log.i
      for (let i = MAX_ROTATED_FILES; i >= 2; i--) {
        const src = `${this._filePath}.${i - 1}`;
        const dst = `${this._filePath}.${i}`;
        try { fs.renameSync(src, dst); } catch {}
      }

      // 3. 当前 .log -> .log.1
      try { fs.renameSync(this._filePath, `${this._filePath}.1`); } catch {}
      this._size = 0;
    } catch {
      // 轮转失败不阻塞
    }
  }

  /** 清理超过 maxDays 天的旧日志文件 */
  _cleanup(maxDays) {
    try {
      const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(this._logDir).filter((f) => f.endsWith(".log") || /\.log\.\d+$/.test(f));

      for (const f of files) {
        const filePath = path.join(this._logDir, f);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // 清理失败不影响运行
    }
  }
}

// ── 全局单例 ──

let _instance = null;

/**
 * 初始化全局日志服务实例
 * @param {string} logDir - 日志目录路径
 * @returns {LogService}
 */
export function initLogService(logDir) {
  _instance = new LogService(logDir);
  return _instance;
}

/**
 * 获取全局日志服务实例
 * @returns {LogService|null}
 */
export function logService() {
  return _instance;
}

// ── 兼容层：与原 debug-log.js 接口完全一致 ──

/** @deprecated 使用 initLogService */
export function initDebugLog(logDir) {
  return initLogService(logDir);
}

/** @deprecated 使用 logService */
export function debugLog() {
  return _instance;
}

/**
 * 创建模块专用日志器
 *
 * 同时写 console + 持久日志文件，统一替代散落的 console.error / debugLog()?.log()。
 *
 * @param {string} module - 模块标识（如 "engine", "bridge", "session"）
 * @returns {{ log: (msg: string) => void, warn: (msg: string) => void, error: (msg: string) => void }}
 */
export function createModuleLogger(module) {
  return {
    log(msg) {
      console.log(`[${module}] ${msg}`);
      _instance?.log(module, msg);
    },
    warn(msg) {
      console.warn(`[${module}] ${msg}`);
      _instance?.warn(module, msg);
    },
    error(msg) {
      console.error(`[${module}] ${msg}`);
      _instance?.error(module, msg);
    },
  };
}

export { LogService, LEVELS, LEVEL_RANK };
