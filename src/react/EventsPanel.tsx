import { useEffect, useState } from "react";
import {
  type AdminEventsAdapter,
  type AdminEventsPage,
  type AdminEventsQuery,
  validateAdminEventsPage,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

export interface EventsPanelProps {
  adapter: AdminEventsAdapter;
  title?: string;
  search?: { placeholder?: string };
  pageSize?: number;
}

export function EventsPanel({ adapter, title = "Administrative events", search, pageSize = 25 }: EventsPanelProps) {
  const [query, setQuery] = useState<AdminEventsQuery>({ page: 1, pageSize });
  const [result, setResult] = useState<AdminEventsPage>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const load = async (nextQuery = query) => {
    setLoading(true);
    setError(undefined);
    try {
      setResult(validateAdminEventsPage(await adapter.list(nextQuery)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load administrative events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [adapter, query]);
  const updateQuery = (patch: Partial<AdminEventsQuery>) => setQuery((current) => ({ ...current, ...patch, page: 1 }));
  if (error && !result) return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  if (!result) return <AdminPanelStateView state={{ kind: "loading", label: "Loading administrative events…" }} />;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className="admin-kit__events" aria-label={title}>
      <header className="admin-kit__events-header">
        <div><h2>{title}</h2>{result.source ? <p>Source: {result.source.label}{result.source.updatedAt ? ` · updated ${result.source.updatedAt}` : ""}</p> : null}</div>
        <button type="button" disabled={loading} onClick={() => void load()}>Refresh</button>
      </header>
      <div className="admin-kit__events-filters">
        {search ? <label><span>Search</span><input type="search" placeholder={search.placeholder} value={query.search ?? ""} onChange={(event) => updateQuery({ search: event.target.value || undefined })} /></label> : null}
        {adapter.categories ? <label><span>Category</span><select value={query.category ?? ""} onChange={(event) => updateQuery({ category: event.target.value || undefined })}><option value="">All</option>{adapter.categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {adapter.severities ? <label><span>Severity</span><select value={query.severity ?? ""} onChange={(event) => updateQuery({ severity: event.target.value as AdminEventsQuery["severity"] || undefined })}><option value="">All</option>{adapter.severities.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
        {adapter.outcomes ? <label><span>Outcome</span><select value={query.outcome ?? ""} onChange={(event) => updateQuery({ outcome: event.target.value as AdminEventsQuery["outcome"] || undefined })}><option value="">All</option>{adapter.outcomes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : null}
      </div>
      {error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}
      {result.items.length === 0 ? <AdminPanelStateView state={{ kind: "empty", title: "No administrative events found." }} /> : <ol className="admin-kit__events-list">{result.items.map((event) => <li key={event.id}><div><strong>{event.action}</strong><p>{event.message}</p><span>{event.occurredAt} · {event.category} · {event.severity} · {event.outcome}</span>{event.actor ? <span> · actor: {event.actor.label}</span> : null}{event.resource ? <span> · resource: {event.resource.label}</span> : null}</div>{event.metadata ? <details><summary>Details</summary><dl>{Object.entries(event.metadata).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details> : null}</li>)}</ol>}
      <footer className="admin-kit__events-pagination"><span>Page {result.page} of {pages} · {result.total} events</span><button type="button" disabled={loading || result.page <= 1} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}>Previous</button><button type="button" disabled={loading || result.page >= pages} onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}>Next</button></footer>
    </section>
  );
}
