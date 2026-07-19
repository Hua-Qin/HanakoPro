/**
 * debug-log.js - 持久化调试日志（兼容层）
 *
 * 本文件现在只是 lib/log-service/index.js 的 re-export 层。
 * 所有实际逻辑（异步写入、文件轮转、内存 ring buffer、脱敏、去重）
 * 都在 log-service 中实现。现有代码无需修改：
 *
 *   import { debugLog, createModuleLogger, initDebugLog } from "../lib/debug-log.js";
 *
 * 新代码请直接从 log-service 导入：
 *
 *   import { logService, createModuleLogger, initLogService } from "../lib/log-service/index.js";
 */

export {
  initLogService,
  logService,
  initDebugLog,
  debugLog,
  createModuleLogger,
  LogService,
  LEVELS,
  LEVEL_RANK,
} from "./log-service/index.js";
