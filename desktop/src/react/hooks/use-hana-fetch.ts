import { useStore } from '../stores';
import {
  appendConnectionAuth,
  buildConnectionUrl,
  requireServerConnection,
} from '../services/server-connection';

const DEFAULT_TIMEOUT = 30_000;

/**
 * 构建带认证的 Hana Server URL
 */
export function hanaUrl(path: string): string {
  const connection = requireServerConnection(
    useStore.getState(),
    `hanaUrl ${path}: server connection not ready`,
  );
  return buildConnectionUrl(connection, path, { includeTokenQuery: true });
}

/**
 * 带认证的 fetch 封装
 * - 默认 30s 超时
 * - 自动校验 res.ok，非 2xx 抛错
 */
export async function hanaFetch(
  path: string,
  opts: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const connection = requireServerConnection(
    useStore.getState(),
    `hanaFetch ${path}: server connection not ready`,
  );
  const headers = appendConnectionAuth(connection, opts.headers);

  const { timeout = DEFAULT_TIMEOUT, signal: callerSignal, ...fetchOpts } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(buildConnectionUrl(connection, path), {
      ...fetchOpts,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      // 读取响应体中的具体错误信息，避免丢弃后端返回的错误描述
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch {
        // 响应体读取失败时忽略，仅使用 status text
      }
      let detail = bodyText;
      try {
        const parsed = JSON.parse(bodyText);
        if (parsed?.error) detail = String(parsed.error);
      } catch {
        // 非 JSON 响应，直接用原始文本
      }
      const err = new Error(
        detail
          ? `hanaFetch ${path}: ${res.status} ${res.statusText} - ${detail}`
          : `hanaFetch ${path}: ${res.status} ${res.statusText}`,
      );
      (err as any).status = res.status;
      (err as any).body = bodyText;
      throw err;
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
