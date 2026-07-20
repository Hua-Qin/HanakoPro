import React, { useState, useEffect, useCallback, useRef } from 'react';
import { hanaFetch } from '../api';
import { t } from '../helpers';
import styles from '../Settings.module.css';

interface LogEntry {
  ts: number;
  level: string;
  module: string;
  msg: string;
}

interface LogQueryResult {
  entries: LogEntry[];
  total: number;
  limit: number;
  offset: number;
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: '#e74c3c',
  WARN: '#f39c12',
  INFO: 'var(--text-primary, #333)',
};

const LEVEL_BG: Record<string, string> = {
  ERROR: 'rgba(231, 76, 60, 0.12)',
  WARN: 'rgba(243, 156, 18, 0.12)',
  INFO: 'rgba(100, 100, 100, 0.08)',
};

const TIME_RANGES = [
  { value: '1h', labelKey: 'settings.logs.range1h' },
  { value: '6h', labelKey: 'settings.logs.range6h' },
  { value: '24h', labelKey: 'settings.logs.range24h' },
  { value: '7d', labelKey: 'settings.logs.range7d' },
  { value: 'all', labelKey: 'settings.logs.rangeAll' },
];

const ALL_LEVELS = ['INFO', 'WARN', 'ERROR'];
const PAGE_SIZE = 200;
const AUTO_REFRESH_MS = 5000;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function formatEntry(entry: LogEntry): string {
  return `[${formatTimestamp(entry.ts)}] [${entry.level}] [${entry.module}] ${entry.msg}`;
}

export function LogsTab() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // 筛选状态
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModule, setSelectedModule] = useState('');
  const [keyword, setKeyword] = useState('');

  // 自动刷新
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = useRef(autoRefresh);
  autoRefreshRef.current = autoRefresh;

  // 复制反馈
  const [copiedHint, setCopiedHint] = useState('');
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);

  const offsetRef = useRef(0);
  const filtersRef = useRef({ levels: '', module: '', keyword: '', timeRange: '24h' });

  const buildQueryParams = useCallback((opts: { offset?: number; append?: boolean }) => {
    const params = new URLSearchParams();
    const levels = Array.from(selectedLevels);
    if (levels.length > 0) params.set('levels', levels.join(','));
    if (selectedModule) params.set('module', selectedModule);
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (timeRange) params.set('timeRange', timeRange);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(opts.offset || 0));
    return params.toString();
  }, [selectedLevels, selectedModule, keyword, timeRange]);

  const showCopiedHint = useCallback((msg: string) => {
    setCopiedHint(msg);
    setTimeout(() => setCopiedHint(''), 2000);
  }, []);

  // 首次加载 + 筛选变化时重新加载
  const reload = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    filtersRef.current = {
      levels: Array.from(selectedLevels).join(','),
      module: selectedModule,
      keyword: keyword.trim(),
      timeRange,
    };
    try {
      const res = await hanaFetch(`/api/logs?${buildQueryParams({ offset: 0 })}`);
      const data: LogQueryResult = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      offsetRef.current = data.entries.length;
    } catch (err) {
      console.error('[LogsTab] reload failed:', err);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, selectedLevels, selectedModule, keyword, timeRange]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loadingMore || offsetRef.current >= total) return;
    setLoadingMore(true);
    try {
      const res = await hanaFetch(`/api/logs?${buildQueryParams({ offset: offsetRef.current })}`);
      const data: LogQueryResult = await res.json();
      // data.entries 是按时间从旧到新返回的当前页
      // 由于 offset 是从最新往前算，append 时需要插到前面
      setEntries(prev => [...data.entries, ...prev]);
      offsetRef.current += data.entries.length;
    } catch (err) {
      console.error('[LogsTab] loadMore failed:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQueryParams, loadingMore, total]);

  // 加载模块列表
  const loadCategories = useCallback(async () => {
    try {
      const res = await hanaFetch('/api/logs/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {
      // 忽略
    }
  }, []);

  // 首次挂载
  useEffect(() => {
    reload();
    loadCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 筛选变化时重新加载
  useEffect(() => {
    reload();
  }, [selectedLevels, selectedModule, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // 关键词搜索（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filtersRef.current.keyword !== keyword.trim()) {
        reload();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword, reload]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      // 自动刷新只拉取第一页，替换当前视图
      (async () => {
        try {
          const res = await hanaFetch(`/api/logs?${buildQueryParams({ offset: 0 })}`);
          const data: LogQueryResult = await res.json();
          setEntries(data.entries);
          setTotal(data.total);
          offsetRef.current = data.entries.length;
        } catch {
          // 静默失败，不打扰用户
        }
      })();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, buildQueryParams]);

  // 切换级别选中
  const toggleLevel = useCallback((level: string) => {
    setSelectedLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  // 复制单行
  const copyEntry = useCallback(async (entry: LogEntry) => {
    try {
      await navigator.clipboard.writeText(formatEntry(entry));
      showCopiedHint(t('settings.logs.copiedSingle'));
    } catch {
      showCopiedHint(t('settings.logs.copyFailed'));
    }
  }, [showCopiedHint]);

  // 复制全部可见
  const copyAll = useCallback(async () => {
    try {
      const text = entries.map(formatEntry).join('\n');
      await navigator.clipboard.writeText(text);
      showCopiedHint(t('settings.logs.copiedAll', { count: entries.length }));
    } catch {
      showCopiedHint(t('settings.logs.copyFailed'));
    }
  }, [entries, showCopiedHint]);

  // 导出日志
  const exportLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const levels = Array.from(selectedLevels);
      if (levels.length > 0) params.set('levels', levels.join(','));
      if (selectedModule) params.set('module', selectedModule);
      if (keyword.trim()) params.set('keyword', keyword.trim());
      if (timeRange) params.set('timeRange', timeRange);

      const res = await hanaFetch(`/api/logs/export?${params.toString()}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = downloadAnchorRef.current;
      if (anchor) {
        anchor.href = url;
        anchor.download = `hanako-logs-${Date.now()}.txt`;
        anchor.click();
      }
      URL.revokeObjectURL(url);
      showCopiedHint(t('settings.logs.exportSuccess'));
    } catch {
      showCopiedHint(t('settings.logs.exportFailed'));
    }
  }, [selectedLevels, selectedModule, keyword, timeRange, showCopiedHint]);

  // 清空日志
  const clearLogs = useCallback(async () => {
    if (!window.confirm(t('settings.logs.clearConfirm'))) return;
    try {
      await hanaFetch('/api/logs', { method: 'DELETE' });
      setEntries([]);
      setTotal(0);
      setCategories([]);
      offsetRef.current = 0;
      showCopiedHint(t('settings.logs.clearSuccess'));
    } catch {
      showCopiedHint(t('settings.logs.clearFailed'));
    }
  }, [showCopiedHint]);

  const hasMore = offsetRef.current < total;

  return (
    <div className={`${styles['settings-tab-content']} ${styles['active']}`} data-tab="logs">
      {/* 筛选栏 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        {/* 第一行：级别按钮 + 自动刷新 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {ALL_LEVELS.map(level => {
            const active = selectedLevels.has(level);
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                style={{
                  padding: '3px 12px',
                  fontSize: '0.75rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  border: active ? `1.5px solid ${LEVEL_COLORS[level]}` : '1.5px solid var(--border, #ccc)',
                  borderRadius: 'var(--radius-card, 10px)',
                  background: active ? LEVEL_BG[level] : 'transparent',
                  color: active ? LEVEL_COLORS[level] : 'var(--text-secondary, #888)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {level}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary, #888)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('settings.logs.autoRefresh')}
          </label>

          <button
            onClick={reload}
            disabled={loading}
            style={{
              padding: '3px 10px',
              fontSize: '0.72rem',
              fontFamily: 'inherit',
              cursor: loading ? 'wait' : 'pointer',
              color: 'var(--accent)',
              background: 'transparent',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-card, 10px)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '⟳' : '↻'} {t('settings.logs.refresh')}
          </button>
        </div>

        {/* 第二行：时间范围 + 模块 + 关键词 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              background: 'var(--bg-card, transparent)',
              border: '1px solid var(--border, #ccc)',
              borderRadius: 'var(--radius-card, 10px)',
              cursor: 'pointer',
            }}
          >
            {TIME_RANGES.map(r => (
              <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
            ))}
          </select>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              background: 'var(--bg-card, transparent)',
              border: '1px solid var(--border, #ccc)',
              borderRadius: 'var(--radius-card, 10px)',
              cursor: 'pointer',
              minWidth: '120px',
            }}
          >
            <option value="">{t('settings.logs.allModules')}</option>
            {categories.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>

          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('settings.logs.searchPlaceholder')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              background: 'var(--bg-card, transparent)',
              border: '1px solid var(--border, #ccc)',
              borderRadius: 'var(--radius-card, 10px)',
              minWidth: '180px',
              flex: 1,
            }}
          />
        </div>

        {/* 第三行：操作按钮 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button className={styles['settings-save-btn-sm']} onClick={copyAll} disabled={entries.length === 0}>
            {t('settings.logs.copyAll')}
          </button>
          <button className={styles['settings-save-btn-sm']} onClick={exportLogs} disabled={entries.length === 0}>
            {t('settings.logs.export')}
          </button>
          <button
            onClick={clearLogs}
            style={{
              padding: '0.4rem var(--space-md)',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              color: '#e74c3c',
              background: 'transparent',
              border: '1px solid rgba(231, 76, 60, 0.4)',
              borderRadius: 'var(--radius-card, 10px)',
              cursor: 'pointer',
            }}
          >
            {t('settings.logs.clear')}
          </button>

          <div style={{ flex: 1 }} />

          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #888)' }}>
            {t('settings.logs.count', { count: total })}
          </span>
        </div>
      </div>

      {/* 复制反馈提示 */}
      {copiedHint && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '6px 12px',
          marginBottom: '8px',
          fontSize: '0.75rem',
          color: 'var(--accent)',
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          borderRadius: 'var(--radius-card, 10px)',
          textAlign: 'center',
        }}>
          {copiedHint}
        </div>
      )}

      {/* 日志列表 */}
      {loading && entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary, #888)' }}>
          <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'hana-spin 0.8s linear infinite' }} />
          <div style={{ marginTop: '8px' }}>{t('settings.logs.loading')}</div>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary, #888)', fontSize: '0.85rem' }}>
          {t('settings.logs.empty')}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {entries.map((entry, i) => (
              <div
                key={`${entry.ts}-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 60px 100px 1fr 28px',
                  gap: '8px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-mono, "SF Mono", Monaco, monospace)',
                  color: 'var(--text-primary)',
                  background: LEVEL_BG[entry.level] || 'transparent',
                  borderRadius: '4px',
                  alignItems: 'start',
                  lineHeight: '1.5',
                }}
              >
                <span style={{ color: 'var(--text-secondary, #888)', whiteSpace: 'nowrap' }}>
                  {formatTimestamp(entry.ts)}
                </span>
                <span style={{
                  color: LEVEL_COLORS[entry.level] || 'inherit',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {entry.level}
                </span>
                <span style={{
                  color: 'var(--accent)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {entry.module}
                </span>
                <span style={{
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  color: entry.level === 'ERROR' ? LEVEL_COLORS.ERROR : entry.level === 'WARN' ? LEVEL_COLORS.WARN : 'inherit',
                }}>
                  {entry.msg}
                </span>
                <button
                  onClick={() => copyEntry(entry)}
                  title={t('settings.logs.copySingle')}
                  style={{
                    padding: '0',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary, #888)',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.06))'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary, #888)'; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* 加载更多 */}
          {hasMore && (
            <div style={{ textAlign: 'center', padding: '12px', marginTop: '8px' }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className={styles['settings-save-btn-sm']}
                style={{ opacity: loadingMore ? 0.5 : 1 }}
              >
                {loadingMore ? t('settings.logs.loadingMore') : t('settings.logs.loadMore')}
              </button>
            </div>
          )}
        </>
      )}

      {/* 旋转动画 keyframes（如果全局没有） */}
      <a ref={downloadAnchorRef} style={{ display: 'none' }} />
      <style>{`
        @keyframes hana-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
