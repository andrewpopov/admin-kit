import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatAdminTimestamp,
  validateAdminLogsSnapshot,
  type AdminLogEntry,
  type AdminLogsAdapter,
  type AdminLogsSnapshot,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

export interface LogsPanelProps<Entry extends AdminLogEntry = AdminLogEntry> {
  adapter: AdminLogsAdapter<Entry>;
  title?: string;
  pollIntervalMs?: number;
  defaultAutoRefresh?: boolean;
  formatTimestamp?: (iso: string) => string;
  className?: string;
}

/** Runtime output viewer; structured audit and authorization events belong in EventsPanel. */
export function LogsPanel<Entry extends AdminLogEntry = AdminLogEntry>({
  adapter,
  title = "Runtime logs",
  pollIntervalMs,
  defaultAutoRefresh = false,
  formatTimestamp,
  className,
}: LogsPanelProps<Entry>) {
  const pollingInterval = pollIntervalMs !== undefined && Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
    ? pollIntervalMs
    : undefined;
  const limits = adapter.lineLimits ?? [100, 200, 500, 1000];
  const [source, setSource] = useState(adapter.defaultSource ?? "");
  const [limit, setLimit] = useState(adapter.defaultLineLimit ?? limits[0] ?? 100);
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [snapshot, setSnapshot] = useState<AdminLogsSnapshot<Entry>>();
  const [error, setError] = useState<string>();
  const [copyFeedback, setCopyFeedback] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(Boolean(pollingInterval && defaultAutoRefresh));
  const latestLoadId = useRef(0);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    setError(undefined);
    try {
      const next = validateAdminLogsSnapshot(await adapter.read({
        source: source || undefined,
        limit,
        level: level || undefined,
        category: category || undefined,
        search: appliedSearch || undefined,
      }));
      if (loadId === latestLoadId.current) {
        // Render the adapter's canonicalized source (see `selectedSource`
        // below) without feeding it back into request state: echoing it
        // into `source` would re-trigger this effect, and an adapter that
        // canonicalizes non-idempotently could loop indefinitely.
        setSnapshot(next);
      }
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setError(reason instanceof Error ? reason.message : "Unable to load runtime logs.");
      }
    } finally {
      if (loadId === latestLoadId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => { latestLoadId.current += 1; };
  }, [adapter, source, limit, level, category, appliedSearch]);

  useEffect(() => {
    if (!autoRefresh || !pollingInterval) return;
    const timer = window.setInterval(() => void load(), pollingInterval);
    return () => window.clearInterval(timer);
  }, [autoRefresh, pollingInterval, adapter, source, limit, level, category, appliedSearch]);

  useEffect(() => {
    if (!snapshot) return;
    if (level && snapshot.levels && !snapshot.levels.some((option) => option.value === level)) setLevel("");
    if (category && snapshot.categories && !snapshot.categories.some((option) => option.value === category)) setCategory("");
  }, [snapshot, level, category]);

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return snapshot?.entries.filter((entry) =>
      (!level || entry.level?.value === level) &&
      (!category || entry.category === category) &&
      (!needle || `${entry.message}\n${entry.raw ?? ""}`.toLowerCase().includes(needle)),
    ) ?? [];
  }, [snapshot, search, level, category]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(visibleEntries.map((entry) => entry.raw ?? entry.message).join("\n"));
      setCopyFeedback("Visible log output copied.");
    } catch {
      setCopyFeedback("Unable to copy log output.");
    }
  };

  if (error && !snapshot) {
    return <AdminPanelStateView className={className} state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  }
  if (!snapshot) {
    return <AdminPanelStateView className={className} state={{ kind: "loading", label: "Loading runtime logs…" }} />;
  }

  // Render the adapter's canonicalized source, not the possibly-aliased
  // request value: a request for "app" that the adapter canonicalizes to
  // "app-canonical" must show the canonical value, or the select would
  // either show the stale alias or go blank when it isn't in `sources`.
  const selectedSource = snapshot.source || source || "";
  const sourceDetail = snapshot.sources.find((candidate) => candidate.value === selectedSource)?.detail;
  return <section className={["admin-kit__logs", className].filter(Boolean).join(" ")} aria-label={title} aria-busy={isLoading}>
    <header className="admin-kit__logs-header"><div><h2>{title}</h2><p>{snapshot.total} matching {snapshot.total === 1 ? "line" : "lines"}{sourceDetail ? ` · ${sourceDetail}` : ""}{snapshot.generatedAt ? ` · Updated ${formatAdminTimestamp(snapshot.generatedAt, formatTimestamp)}` : ""}</p></div><div className="admin-kit__logs-actions">{pollingInterval ? <button className="admin-kit__button" type="button" role="switch" aria-checked={autoRefresh} onClick={() => setAutoRefresh((current) => !current)}>Auto-refresh {autoRefresh ? "on" : "off"}</button> : null}<button className="admin-kit__button admin-kit__button--primary" disabled={isLoading} type="button" onClick={() => void load()}>Refresh</button></div></header>
    <form className="admin-kit__logs-filters" onSubmit={(event) => { event.preventDefault(); setAppliedSearch(search.trim()); }}>
      {snapshot.sources.length > 1 ? <label><span>Source</span><select value={selectedSource} onChange={(event) => { setLevel(""); setCategory(""); setSource(event.target.value); }}>{snapshot.sources.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      {snapshot.levels?.length ? <label><span>Level</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">All levels</option>{snapshot.levels.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      {snapshot.categories?.length ? <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{snapshot.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      <label><span>Lines</span><select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>{limits.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label className="admin-kit__logs-search"><span>Search logs</span><input type="search" placeholder="Message or raw output" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <button className="admin-kit__button" type="submit">Apply</button>
    </form>
    {error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}
    <div className="admin-kit__logs-summary"><span>Showing {visibleEntries.length} of {snapshot.entries.length} loaded</span><button className="admin-kit__button" disabled={visibleEntries.length === 0} type="button" onClick={() => void copy()}>Copy visible</button></div>
    <p className="admin-kit__logs-feedback" aria-live="polite">{copyFeedback}</p>
    {visibleEntries.length === 0 ? <AdminPanelStateView state={{ kind: "empty", title: "No log lines matched." }} /> : <ol className="admin-kit__logs-output">{visibleEntries.map((entry) => <li key={entry.id} className={`admin-kit__log-line admin-kit__log-line--${entry.level?.tone ?? "neutral"}`}><div className="admin-kit__log-context">{entry.timestamp ? <time dateTime={entry.timestamp}>{formatAdminTimestamp(entry.timestamp, formatTimestamp)}</time> : null}{entry.level ? <span>{entry.level.label}</span> : null}{entry.category ? <span>{entry.category}</span> : null}</div><pre>{entry.message}</pre></li>)}</ol>}
  </section>;
}
