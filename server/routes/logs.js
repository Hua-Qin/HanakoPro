/**
 * 日志查看路由
 *
 * GET    /api/logs            - 查询日志（支持级别/模块/关键词/时间范围/分页）
 * GET    /api/logs/export     - 导出日志为 txt 文件
 * GET    /api/logs/categories - 获取所有模块名列表
 * DELETE /api/logs            - 清空当前日志
 *
 * 数据来源为 LogService 的内存 ring buffer（最近 1000 条），
 * 不读盘，不影响业务写入性能。
 */

import { Hono } from "hono";
import { logService } from "../../lib/log-service/index.js";

const TIME_RANGE_MS = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
};

/** 解析 levels 查询参数，支持逗号分隔或数组 */
function parseLevels(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/** 解析 limit，默认 200，上限 1000 */
function parseLimit(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return 200;
  return Math.min(n, 1000);
}

/** 解析 offset，默认 0 */
function parseOffset(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** 解析 timeRange 为 since 时间戳 */
function parseSince(raw) {
  if (!raw || raw === "all") return undefined;
  const delta = TIME_RANGE_MS[raw];
  if (!delta) return undefined;
  return Date.now() - delta;
}

export function createLogsRoute() {
  const route = new Hono();

  // 查询日志
  route.get("/logs", async (c) => {
    try {
      const svc = logService();
      if (!svc) return c.json({ error: "log service not initialized" }, 503);

      const q = c.req.query();
      const result = svc.query({
        levels: parseLevels(q.levels),
        module: q.module || undefined,
        keyword: q.keyword || undefined,
        since: parseSince(q.timeRange),
        until: q.until ? parseInt(q.until, 10) : undefined,
        limit: parseLimit(q.limit),
        offset: parseOffset(q.offset),
      });

      return c.json({
        entries: result.entries.map((e) => ({
          ts: e.ts,
          level: e.level,
          module: e.module,
          msg: e.msg,
        })),
        total: result.total,
        limit: parseLimit(q.limit),
        offset: parseOffset(q.offset),
      });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  // 导出日志为 txt
  route.get("/logs/export", async (c) => {
    try {
      const svc = logService();
      if (!svc) return c.json({ error: "log service not initialized" }, 503);

      const q = c.req.query();
      const text = svc.exportText({
        levels: parseLevels(q.levels),
        module: q.module || undefined,
        keyword: q.keyword || undefined,
        since: parseSince(q.timeRange),
        until: q.until ? parseInt(q.until, 10) : undefined,
      });

      const filename = `hanako-logs-${Date.now()}.txt`;
      c.header("Content-Type", "text/plain; charset=utf-8");
      c.header("Content-Disposition", `attachment; filename="${filename}"`);
      return c.body(text);
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  // 获取模块列表
  route.get("/logs/categories", async (c) => {
    try {
      const svc = logService();
      if (!svc) return c.json({ error: "log service not initialized" }, 503);
      return c.json({ categories: svc.categories() });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  // 清空日志
  route.delete("/logs", async (c) => {
    try {
      const svc = logService();
      if (!svc) return c.json({ error: "log service not initialized" }, 503);
      svc.clear();
      return c.json({ ok: true });
    } catch (err) {
      return c.json({ error: err.message }, 500);
    }
  });

  return route;
}
