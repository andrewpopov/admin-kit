import { useEffect, useRef, useState } from "react";
import {
  type AdminEventsAdapter,
  type AdminEventsPage,
  type AdminEventsQuery,
  formatAdminTimestamp,
  validateAdminEventsPage,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

const SEARCH_DEBOUNCE_MS = 250;

export interface EventsPanelProps {
  adapter: AdminEventsAdapter;
  title?: string;
  search?: { placeholder?: string };
  pageSize?: number;
  presentation?: "feed" | "table";
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Overrides the default timestamp presentation for occurredAt / source.updatedAt. */
  formatTimestamp?: (iso: string) => string;
}

export function EventsPanel({ adapter, title = "Administrative events", search, pageSize = 25, presentation = "feed", className, formatTimestamp }: EventsPanelProps) {
  const [query, setQuery] = useState<AdminEventsQuery>({ page: 1, pageSize });
  const [searchInput, setSearchInput] = useState(query.search ?? "");
  const [result, setResult] = useState<AdminEventsPage>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const latestLoadId = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const load = async (nextQuery = query) => {
    const loadId = ++latestLoadId.current;
    setLoading(true);
    setError(undefined);
    try {
      const nextResult = validateAdminEventsPage(await adapter.list(nextQuery));
      if (loadId === latestLoadId.current) setResult(nextResult);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setError(reason instanceof Error ? reason.message : "Unable to load administrative events.");
      }
    } finally {
      if (loadId === latestLoadId.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Invalidate synchronously with the transition: without this, a request
    // in flight for the previous query/page can still resolve and pass the
    // `loadId === latestLoadId.current` check because the effect that would
    // have bumped it for the new query hasn't started yet.
    return () => { latestLoadId.current += 1; };
  }, [adapter, query]);
  useEffect(() => () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); }, []);
  const updateQuery = (patch: Partial<AdminEventsQuery>) => setQuery((current) => ({ ...current, ...patch, page: 1 }));
  const updateSearch = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateQuery({ search: value || undefined });
    }, SEARCH_DEBOUNCE_MS);
  };
  if (error && !result) return <AdminPanelStateView className={className} state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  if (!result) return <AdminPanelStateView className={className} state={{ kind: "loading", label: "Loading administrative events…" }} />;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className={["admin-kit__events", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="admin-kit__events-header">
        <div><h2>{title}</h2>{result.source ? <p>Source: {result.source.label}{result.source.updatedAt ? ` · updated ${formatAdminTimestamp(result.source.updatedAt, formatTimestamp)}` : ""}</p> : null}</div>
        <button type="button" disabled={loading} onClick={() => void load()}>Refresh</button>
      </header>
      <div className="admin-kit__events-filters">
        {search ? <label><span>Search</span><input type="search" placeholder={search.placeholder} value={searchInput} onChange={(event) => updateSearch(event.target.value)} /></label> : null}
        {adapter.categories ? <label><span>Category</span><select value={query.category ?? ""} onChange={(event) => updateQuery({ category: event.target.value || undefined })}><option value="">All</option>{adapter.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {adapter.severities ? <label><span>Severity</span><select value={query.severity ?? ""} onChange={(event) => updateQuery({ severity: event.target.value as AdminEventsQuery["severity"] || undefined })}><option value="">All</option>{adapter.severities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {adapter.outcomes ? <label><span>Outcome</span><select value={query.outcome ?? ""} onChange={(event) => updateQuery({ outcome: event.target.value as AdminEventsQuery["outcome"] || undefined })}><option value="">All</option>{adapter.outcomes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      </div>
      {error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}
      {result.items.length === 0 ? <AdminPanelStateView state={{ kind: "empty", title: "No administrative events found." }} /> : presentation === "table" ? (
        <div className="admin-kit__table-wrap admin-kit__events-table-wrap"><table className="admin-kit__table admin-kit__events-table"><thead><tr><th scope="col">Occurred</th><th scope="col">Event</th><th scope="col">Actor</th><th scope="col">Resource</th><th scope="col">Outcome</th><th scope="col">Details</th></tr></thead><tbody>{result.items.map((event) => <tr key={event.id}><td>{formatAdminTimestamp(event.occurredAt, formatTimestamp)}</td><td><strong>{event.action}</strong><small>{event.message}</small></td><td>{event.actor?.label ?? "—"}</td><td>{event.resource?.label ?? "—"}</td><td><span className={`admin-kit__event-outcome admin-kit__event-outcome--${event.outcome}`}>{event.outcome}</span><small>{event.severity} · {event.category}</small></td><td>{event.metadata ? <details><summary>View</summary><dl>{Object.entries(event.metadata).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details> : "—"}</td></tr>)}</tbody></table></div>
      ) : <ol className="admin-kit__events-list">{result.items.map((event) => <li key={event.id}><div><strong>{event.action}</strong><p>{event.message}</p><span>{formatAdminTimestamp(event.occurredAt, formatTimestamp)} · {event.category} · {event.severity} · {event.outcome}</span>{event.actor ? <span> · actor: {event.actor.label}</span> : null}{event.resource ? <span> · resource: {event.resource.label}</span> : null}</div>{event.metadata ? <details><summary>Details</summary><dl>{Object.entries(event.metadata).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details> : null}</li>)}</ol>}
      <footer className="admin-kit__events-pagination"><span>Page {result.page} of {pages} · {result.total} events</span><button type="button" disabled={loading || result.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}>Previous</button><button type="button" disabled={loading || result.page >= pages} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}>Next</button></footer>
    </section>
  );
}
