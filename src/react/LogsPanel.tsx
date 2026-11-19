"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  formatAdminTimestamp,
  validateAdminLogsSnapshot,
  type AdminLogEntry,
  type AdminLogsAdapter,
  type AdminLogsSnapshot,
} from "../core";
import { useAdminMessagesRef } from "./AdminLabels";
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
  title: titleProp,
  pollIntervalMs,
  defaultAutoRefresh = false,
  formatTimestamp,
  className,
}: LogsPanelProps<Entry>) {
  const messagesRef = useAdminMessagesRef();
  const { messages, locale } = messagesRef.current;
  const title = titleProp ?? messages.logs.title;
  const pollingInterval =
    pollIntervalMs !== undefined && Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
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
  const [refreshFeedback, setRefreshFeedback] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(Boolean(pollingInterval && defaultAutoRefresh));
  const [followLatest, setFollowLatest] = useState(true);
  const latestLoadId = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);
  const previousEntryIds = useRef<Set<string>>();

  const load = useCallback(
    async (announce = false) => {
      const loadId = ++latestLoadId.current;
      setIsLoading(true);
      setError(undefined);
      try {
        const next = validateAdminLogsSnapshot(
          await adapter.read({
            source: source || undefined,
            limit,
            level: level || undefined,
            category: category || undefined,
            search: appliedSearch || undefined,
          }),
        );
        if (loadId === latestLoadId.current) {
          // Render the adapter's canonicalized source (see `selectedSource`
          // below) without feeding it back into request state: echoing it
          // into `source` would re-trigger this effect, and an adapter that
          // canonicalizes non-idempotently could loop indefinitely.
          const newLineCount = previousEntryIds.current
            ? next.entries.filter((entry) => !previousEntryIds.current?.has(entry.id)).length
            : 0;
          previousEntryIds.current = new Set(next.entries.map((entry) => entry.id));
          setSnapshot(next);
          if (announce) {
            setRefreshFeedback(
              messagesRef.current.messages.logs.refreshed(newLineCount, messagesRef.current.locale),
            );
          }
        }
      } catch (reason) {
        if (loadId === latestLoadId.current) {
          setError(
            reason instanceof Error ? reason.message : messagesRef.current.messages.logs.loadFailed,
          );
          if (announce) setRefreshFeedback(messagesRef.current.messages.logs.refreshFailed);
        }
      } finally {
        if (loadId === latestLoadId.current) setIsLoading(false);
      }
    },
    [adapter, appliedSearch, category, level, limit, source, messagesRef],
  );

  useEffect(() => {
    void load();
    return () => {
      latestLoadId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (!autoRefresh || !pollingInterval) return;
    const timer = window.setInterval(() => void load(true), pollingInterval);
    return () => window.clearInterval(timer);
  }, [autoRefresh, pollingInterval, load]);

  useEffect(() => {
    if (!snapshot) return;
    if (level && snapshot.levels && !snapshot.levels.some((option) => option.value === level))
      setLevel("");
    if (
      category &&
      snapshot.categories &&
      !snapshot.categories.some((option) => option.value === category)
    )
      setCategory("");
  }, [snapshot, level, category]);

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (
      snapshot?.entries.filter(
        (entry) =>
          (!level || entry.level?.value === level) &&
          (!category || entry.category === category) &&
          (!needle || `${entry.message}\n${entry.raw ?? ""}`.toLowerCase().includes(needle)),
      ) ?? []
    );
  }, [snapshot, search, level, category]);

  useLayoutEffect(() => {
    const output = outputRef.current;
    if (!output) return;
    if (followLatest) {
      output.scrollTop = output.scrollHeight;
    } else {
      output.scrollTop = Math.max(
        0,
        Math.min(scrollPosition.current, output.scrollHeight - output.clientHeight),
      );
    }
  }, [snapshot, followLatest, visibleEntries.length]);

  const copy = async () => {
    setRefreshFeedback(undefined);
    try {
      await navigator.clipboard.writeText(
        visibleEntries.map((entry) => entry.raw ?? entry.message).join("\n"),
      );
      setCopyFeedback(messagesRef.current.messages.logs.copied);
    } catch {
      setCopyFeedback(messagesRef.current.messages.logs.copyFailed);
    }
  };

  if (error && !snapshot) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "error", detail: error, onRetry: () => void load() }}
      />
    );
  }
  if (!snapshot) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "loading", label: messages.logs.loading }}
      />
    );
  }

  // Render the adapter's canonicalized source, not the possibly-aliased
  // request value: a request for "app" that the adapter canonicalizes to
  // "app-canonical" must show the canonical value, or the select would
  // either show the stale alias or go blank when it isn't in `sources`.
  const selectedSource = snapshot.source || source || "";
  const sourceDetail = snapshot.sources.find(
    (candidate) => candidate.value === selectedSource,
  )?.detail;
  return (
    <section
      className={["admin-kit__logs", className].filter(Boolean).join(" ")}
      aria-label={title}
      aria-busy={isLoading}
    >
      <header className="admin-kit__logs-header">
        <div>
          <h2>{title}</h2>
          <p>
            {messages.logs.matching(snapshot.total, locale)}
            {sourceDetail ? <> · {sourceDetail}</> : null}
            {snapshot.generatedAt ? (
              <>
                {" · "}
                {messages.logs.updated(formatAdminTimestamp(snapshot.generatedAt, formatTimestamp))}
              </>
            ) : null}
          </p>
        </div>
        <div className="admin-kit__logs-actions">
          <button
            className="admin-kit__button"
            type="button"
            role="switch"
            aria-checked={followLatest}
            onClick={() => setFollowLatest((current) => !current)}
          >
            {messages.logs.followLatest(followLatest)}
          </button>
          {pollingInterval ? (
            <button
              className="admin-kit__button"
              type="button"
              role="switch"
              aria-checked={autoRefresh}
              onClick={() => setAutoRefresh((current) => !current)}
            >
              {messages.logs.autoRefresh(autoRefresh)}
            </button>
          ) : null}
          <button
            className="admin-kit__button admin-kit__button--primary"
            disabled={isLoading}
            type="button"
            onClick={() => void load(true)}
          >
            {messages.logs.refresh}
          </button>
        </div>
      </header>
      <form
        className="admin-kit__logs-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
        }}
      >
        {snapshot.sources.length > 1 ? (
          <label>
            <span>{messages.logs.source}</span>
            <select
              value={selectedSource}
              onChange={(event) => {
                setLevel("");
                setCategory("");
                setFollowLatest(true);
                setSource(event.target.value);
              }}
            >
              {snapshot.sources.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {snapshot.levels?.length ? (
          <label>
            <span>{messages.logs.level}</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="">{messages.logs.allLevels}</option>
              {snapshot.levels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {snapshot.categories?.length ? (
          <label>
            <span>{messages.logs.category}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{messages.logs.allCategories}</option>
              {snapshot.categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>{messages.logs.lines}</span>
          <select
            value={limit}
            onChange={(event) => {
              setFollowLatest(true);
              setLimit(Number(event.target.value));
            }}
          >
            {limits.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-kit__logs-search">
          <span>{messages.logs.search}</span>
          <input
            type="search"
            placeholder={messages.logs.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="admin-kit__button" type="submit">
          {messages.logs.apply}
        </button>
      </form>
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : null}
      <div className="admin-kit__logs-summary">
        <span>{messages.logs.showing(visibleEntries.length, snapshot.entries.length, locale)}</span>
        <button
          className="admin-kit__button"
          disabled={visibleEntries.length === 0}
          type="button"
          onClick={() => void copy()}
        >
          {messages.logs.copyVisible}
        </button>
      </div>
      <p className="admin-kit__logs-feedback" aria-live="polite">
        {refreshFeedback ?? copyFeedback}
      </p>
      {visibleEntries.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: messages.logs.empty }} />
      ) : (
        <div
          ref={outputRef}
          className="admin-kit__logs-output"
          role="region"
          aria-label={messages.logs.output(title)}
          aria-busy={isLoading}
          tabIndex={0}
          onScroll={(event) => {
            const output = event.currentTarget;
            scrollPosition.current = output.scrollTop;
            if (output.scrollTop + output.clientHeight < output.scrollHeight - 1)
              setFollowLatest(false);
          }}
        >
          <ol className="admin-kit__logs-list">
            {visibleEntries.map((entry) => (
              <li
                key={entry.id}
                className={`admin-kit__log-line admin-kit__log-line--${entry.level?.tone ?? "neutral"}`}
              >
                <div className="admin-kit__log-context">
                  {entry.timestamp ? (
                    <time dateTime={entry.timestamp}>
                      {formatAdminTimestamp(entry.timestamp, formatTimestamp)}
                    </time>
                  ) : null}
                  {entry.level ? <span>{entry.level.label}</span> : null}
                  {entry.category ? <span>{entry.category}</span> : null}
                </div>
                <pre>{entry.message}</pre>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
