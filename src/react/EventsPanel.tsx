"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminEventsAdapter,
  type AdminEventsPage,
  type AdminEventsQuery,
  formatAdminTimestamp,
  validateAdminEventsPage,
} from "../core";
import { useAdminLabels } from "./AdminLabels";
import { AdminDataTable, type AdminDataTableColumn } from "./AdminDataTable";
import { AdminPanelHeader, type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
import { AdminPanelStateView } from "./AdminPanelState";

const SEARCH_DEBOUNCE_MS = 250;

export type EventsPanelColumn = "occurred" | "event" | "actor" | "resource" | "outcome";

const ALL_COLUMNS: readonly EventsPanelColumn[] = [
  "occurred",
  "event",
  "actor",
  "resource",
  "outcome",
];

export interface EventsPanelProps {
  adapter: AdminEventsAdapter;
  title?: string;
  /** Promote the panel heading and primary controls into the route-level header band. */
  headerPresentation?: AdminPanelHeaderPresentation;
  refreshLabel?: string;
  search?: { placeholder?: string };
  pageSize?: number;
  presentation?: "feed" | "table";
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Overrides the default timestamp presentation for occurredAt / source.updatedAt. */
  formatTimestamp?: (iso: string) => string;
  /**
   * Which event fields render, in the table's fixed order. Defaults to all
   * five. The feed presentation honours the same set; `event` (action and
   * message) is always shown there.
   */
  columns?: readonly EventsPanelColumn[];
  /** Replaces the default "No administrative events found." content. */
  emptyState?: ReactNode;
  /** Table presentation: persist this viewer's column widths under this key. */
  storageKey?: string;
}

export function EventsPanel({
  adapter,
  title = "Administrative events",
  headerPresentation = "section",
  refreshLabel = "Refresh",
  search,
  pageSize = 25,
  presentation = "feed",
  className,
  formatTimestamp,
  columns = ALL_COLUMNS,
  emptyState,
  storageKey,
}: EventsPanelProps) {
  const show = (column: EventsPanelColumn) => columns.includes(column);
  const labels = useAdminLabels();
  const [query, setQuery] = useState<AdminEventsQuery>({ page: 1, pageSize });
  const [searchInput, setSearchInput] = useState(query.search ?? "");
  const [result, setResult] = useState<AdminEventsPage>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const latestLoadId = useRef(0);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(
    async (nextQuery = query) => {
      const loadId = ++latestLoadId.current;
      setLoading(true);
      setError(undefined);
      try {
        const nextResult = validateAdminEventsPage(await adapter.list(nextQuery));
        if (loadId === latestLoadId.current) setResult(nextResult);
      } catch (reason) {
        if (loadId === latestLoadId.current) {
          setError(
            reason instanceof Error ? reason.message : "Unable to load administrative events.",
          );
        }
      } finally {
        if (loadId === latestLoadId.current) setLoading(false);
      }
    },
    [adapter, query],
  );

  useEffect(() => {
    void load();
    // Invalidate synchronously with the transition: without this, a request
    // in flight for the previous query/page can still resolve and pass the
    // `loadId === latestLoadId.current` check because the effect that would
    // have bumped it for the new query hasn't started yet.
    return () => {
      latestLoadId.current += 1;
    };
  }, [load]);
  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    [],
  );
  const updateQuery = (patch: Partial<AdminEventsQuery>) =>
    setQuery((current) => ({ ...current, ...patch, page: 1 }));
  const updateSearch = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      updateQuery({ search: value || undefined });
    }, SEARCH_DEBOUNCE_MS);
  };
  const searchControl = search ? (
    <label className="admin-kit__events-search">
      <span>Search</span>
      <input
        type="search"
        placeholder={search.placeholder}
        value={searchInput}
        onChange={(event) => updateSearch(event.target.value)}
      />
    </label>
  ) : null;
  const refresh = (
    <button
      className="admin-kit__button admin-kit__button--primary"
      type="button"
      disabled={loading}
      onClick={() => void load()}
    >
      {refreshLabel}
    </button>
  );
  const panelHeader = (source?: AdminEventsPage["source"]) => (
    <AdminPanelHeader
      actions={
        headerPresentation === "page" ? (
          <>
            {searchControl}
            {refresh}
          </>
        ) : (
          refresh
        )
      }
      className="admin-kit__events-header"
      detail={
        source ? (
          <p>
            Source: {source.label}
            {source.updatedAt
              ? ` · updated ${formatAdminTimestamp(source.updatedAt, formatTimestamp)}`
              : ""}
          </p>
        ) : null
      }
      presentation={headerPresentation}
      title={title}
    />
  );

  if (error && !result)
    return (
      <section
        className={["admin-kit__events", className].filter(Boolean).join(" ")}
        aria-label={title}
      >
        {panelHeader()}
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      </section>
    );
  if (!result)
    return (
      <section
        className={["admin-kit__events", className].filter(Boolean).join(" ")}
        aria-label={title}
      >
        {panelHeader()}
        <AdminPanelStateView state={{ kind: "loading", label: "Loading administrative events…" }} />
      </section>
    );
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const tableColumns = eventTableColumns(columns, formatTimestamp);

  return (
    <section
      className={["admin-kit__events", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      {panelHeader(result.source)}
      <div className="admin-kit__events-filters">
        {headerPresentation === "section" ? searchControl : null}
        {adapter.categories ? (
          <label>
            <span>Category</span>
            <select
              value={query.category ?? ""}
              onChange={(event) => updateQuery({ category: event.target.value || undefined })}
            >
              <option value="">All</option>
              {adapter.categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {adapter.severities ? (
          <label>
            <span>Severity</span>
            <select
              value={query.severity ?? ""}
              onChange={(event) =>
                updateQuery({
                  severity: (event.target.value as AdminEventsQuery["severity"]) || undefined,
                })
              }
            >
              <option value="">All</option>
              {adapter.severities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {adapter.outcomes ? (
          <label>
            <span>Outcome</span>
            <select
              value={query.outcome ?? ""}
              onChange={(event) =>
                updateQuery({
                  outcome: (event.target.value as AdminEventsQuery["outcome"]) || undefined,
                })
              }
            >
              <option value="">All</option>
              {adapter.outcomes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : null}
      {result.items.length === 0 ? (
        (emptyState ?? (
          <AdminPanelStateView
            state={{ kind: "empty", title: "No administrative events found." }}
          />
        ))
      ) : presentation === "table" ? (
        <AdminDataTable
          busy={loading}
          className="admin-kit__events-table"
          columns={tableColumns}
          label={title}
          renderDetails={renderEventDetails}
          rowKey={(event) => event.id}
          rowLabel={(event) =>
            `${event.action} ${formatAdminTimestamp(event.occurredAt, formatTimestamp)}`
          }
          rows={result.items}
          storageKey={storageKey}
          wrapClassName="admin-kit__events-table-wrap"
        />
      ) : (
        <ol className="admin-kit__events-list" aria-busy={loading}>
          {result.items.map((event) => (
            <li key={event.id}>
              <div>
                <strong>{event.action}</strong>
                <p>{event.message}</p>
                <span>
                  {[
                    show("occurred")
                      ? formatAdminTimestamp(event.occurredAt, formatTimestamp)
                      : null,
                    event.category,
                    event.severity,
                    show("outcome") ? event.outcome : null,
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")}
                </span>
                {show("actor") && event.actor ? <span> · actor: {event.actor.label}</span> : null}
                {show("resource") && event.resource ? (
                  <span> · resource: {event.resource.label}</span>
                ) : null}
              </div>
              {event.metadata ? (
                <details>
                  <summary>Details</summary>
                  <dl>
                    {Object.entries(event.metadata).map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      <footer className="admin-kit__events-pagination">
        <span>
          {labels.pageStatus(result.page, pages)} · {result.total} events
        </span>
        <button
          type="button"
          disabled={loading || result.page <= 1}
          onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
        >
          {labels.previousPage}
        </button>
        <button
          type="button"
          disabled={loading || result.page >= pages}
          onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
        >
          {labels.nextPage}
        </button>
      </footer>
    </section>
  );
}

type AdminEvent = AdminEventsPage["items"][number];

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function formatRelative(iso: string, now = Date.now()): string | undefined {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return undefined;
  const seconds = Math.round((time - now) / 1000);
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
  }
  return relativeTime.format(0, "minute");
}

function OccurredCell({
  iso,
  formatTimestamp,
}: {
  iso: string;
  formatTimestamp?: (iso: string) => string;
}) {
  const relative = formatTimestamp ? undefined : formatRelative(iso);
  return (
    <time className="admin-kit__event-time" dateTime={iso} title={iso}>
      <span>{formatAdminTimestamp(iso, formatTimestamp)}</span>
      {relative ? <small>{relative}</small> : null}
    </time>
  );
}

function eventTableColumns(
  visible: readonly EventsPanelColumn[],
  formatTimestamp?: (iso: string) => string,
): AdminDataTableColumn<AdminEvent>[] {
  const all: Record<EventsPanelColumn, AdminDataTableColumn<AdminEvent>> = {
    occurred: {
      id: "occurred",
      header: "Occurred",
      defaultWidth: 184,
      minWidth: 128,
      cell: (event) => <OccurredCell formatTimestamp={formatTimestamp} iso={event.occurredAt} />,
    },
    event: {
      id: "event",
      header: "Event",
      minWidth: 200,
      truncate: true,
      title: (event) => `${event.action}\n${event.message}`,
      cell: (event) => (
        <>
          <strong>{event.action}</strong>
          <small>{event.message}</small>
        </>
      ),
    },
    actor: {
      id: "actor",
      header: "Actor",
      defaultWidth: 168,
      truncate: true,
      title: (event) => event.actor?.label,
      cell: (event) => event.actor?.label ?? "—",
    },
    resource: {
      id: "resource",
      header: "Resource",
      defaultWidth: 240,
      truncate: true,
      title: (event) => event.resource?.label,
      cell: (event) => event.resource?.label ?? "—",
    },
    outcome: {
      id: "outcome",
      header: "Outcome",
      defaultWidth: 136,
      minWidth: 96,
      cell: (event) => (
        <>
          <span className={`admin-kit__event-outcome admin-kit__event-outcome--${event.outcome}`}>
            {event.outcome}
          </span>
          <small>
            {event.severity} · {event.category}
          </small>
        </>
      ),
    },
  };
  return ALL_COLUMNS.filter((column) => visible.includes(column)).map((column) => all[column]);
}

function renderEventDetails(event: AdminEvent) {
  const fields: [string, ReactNode][] = [
    ["Action", event.action],
    ["Message", event.message],
    ["Occurred", event.occurredAt],
    ["Actor", event.actor?.label ?? "—"],
    ["Resource", event.resource?.label ?? "—"],
    ["Outcome", `${event.outcome} · ${event.severity} · ${event.category}`],
    ...Object.entries(event.metadata ?? {}),
  ];
  return (
    <dl className="admin-kit__event-details">
      {fields.map(([label, value], index) => (
        <div key={index}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
