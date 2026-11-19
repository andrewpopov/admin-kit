"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminEventsAdapter,
  type AdminEventsPage,
  type AdminEventsQuery,
  formatAdminTimestamp,
  validateAdminEventsPage,
} from "../core";
import { useAdminMessages, useAdminMessagesRef, type AdminMessages } from "./AdminLabels";
import { AdminDataTable, type AdminDataTableColumn } from "./AdminDataTable";
import { AdminFilterChip } from "./AdminFilterChip";
import {
  AdminPanelHeader,
  panelHeaderCollapsible,
  type AdminPanelBandOptions,
  type AdminPanelHeaderPresentation,
} from "./AdminPanelHeader";
import { TIMESTAMP_COLUMN_WIDTH } from "./adminDataTableFit";
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
  /** Table presentation: the table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
  tableFill?: boolean;
  /** Adds the Hide/Show controls toggle: the source line, search and filters collapse, and the summary line keeps applied filters as removable chips. */
  headerCollapsible?: AdminPanelBandOptions<EventsPanelSummaryContext>;
  /** Status content between the source line and the filters; collapses with them. */
  headerSummary?: ReactNode;
}

export interface EventsPanelSummaryContext {
  query: AdminEventsQuery;
  total: number;
  /** The applied filters as removable chips. */
  chips: ReactNode;
}

export function EventsPanel({
  adapter,
  title: titleProp,
  headerPresentation = "section",
  refreshLabel: refreshLabelProp,
  search,
  pageSize = 25,
  presentation = "feed",
  className,
  formatTimestamp,
  columns = ALL_COLUMNS,
  emptyState,
  storageKey,
  tableFill,
  headerCollapsible,
  headerSummary,
}: EventsPanelProps) {
  const show = (column: EventsPanelColumn) => columns.includes(column);
  const messagesRef = useAdminMessagesRef();
  const { messages, locale } = messagesRef.current;
  const title = titleProp ?? messages.events.title;
  const refreshLabel = refreshLabelProp ?? messages.events.refresh;
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
            reason instanceof Error
              ? reason.message
              : messagesRef.current.messages.events.loadFailed,
          );
        }
      } finally {
        if (loadId === latestLoadId.current) setLoading(false);
      }
    },
    [adapter, query, messagesRef],
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
  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput("");
    updateQuery({ search: undefined });
  };
  const searchControl = search ? (
    <label className="admin-kit__events-search">
      <span>{messages.events.search}</span>
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
      className="admin-kit__button"
      type="button"
      disabled={loading}
      onClick={() => void load()}
    >
      {refreshLabel}
    </button>
  );
  const optionLabel = (options: AdminEventsAdapter["categories"], value: string) =>
    options?.find((option) => option.value === value)?.label ?? value;
  const appliedFilters: { key: string; label: string; remove: () => void }[] = [
    query.search
      ? { key: "search", label: messages.events.chips.search(query.search), remove: clearSearch }
      : undefined,
    query.category
      ? {
          key: "category",
          label: messages.events.chips.category(optionLabel(adapter.categories, query.category)),
          remove: () => updateQuery({ category: undefined }),
        }
      : undefined,
    query.severity
      ? {
          key: "severity",
          label: messages.events.chips.severity(optionLabel(adapter.severities, query.severity)),
          remove: () => updateQuery({ severity: undefined }),
        }
      : undefined,
    query.outcome
      ? {
          key: "outcome",
          label: messages.events.chips.outcome(optionLabel(adapter.outcomes, query.outcome)),
          remove: () => updateQuery({ outcome: undefined }),
        }
      : undefined,
  ].filter((filter) => filter !== undefined);
  const chips = appliedFilters.map((filter) => (
    <AdminFilterChip key={filter.key} label={filter.label} onRemove={filter.remove} />
  ));
  const filterControls =
    adapter.categories || adapter.severities || adapter.outcomes ? (
      <div className="admin-kit__events-filters">
        {adapter.categories ? (
          <label>
            <span>{messages.events.columns.category}</span>
            <select
              value={query.category ?? ""}
              onChange={(event) => updateQuery({ category: event.target.value || undefined })}
            >
              <option value="">{messages.events.all}</option>
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
            <span>{messages.events.columns.severity}</span>
            <select
              value={query.severity ?? ""}
              onChange={(event) =>
                updateQuery({
                  severity: (event.target.value as AdminEventsQuery["severity"]) || undefined,
                })
              }
            >
              <option value="">{messages.events.all}</option>
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
            <span>{messages.events.columns.outcome}</span>
            <select
              value={query.outcome ?? ""}
              onChange={(event) =>
                updateQuery({
                  outcome: (event.target.value as AdminEventsQuery["outcome"]) || undefined,
                })
              }
            >
              <option value="">{messages.events.all}</option>
              {adapter.outcomes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    ) : null;
  const panelHeader = (result?: AdminEventsPage) => (
    <AdminPanelHeader
      actions={refresh}
      className="admin-kit__events-header"
      collapsible={panelHeaderCollapsible(
        headerCollapsible,
        result ? { query, total: result.total, chips } : undefined,
        {
          summary: (
            <>
              {result ? <span>{messages.events.total(result.total, locale)}</span> : null}
              {chips}
            </>
          ),
          activeCount: appliedFilters.length,
        },
      )}
      detail={
        result?.source ? (
          <p>
            {messages.events.source(
              result.source.label,
              result.source.updatedAt
                ? formatAdminTimestamp(result.source.updatedAt, formatTimestamp)
                : undefined,
            )}
          </p>
        ) : null
      }
      presentation={headerPresentation}
      summary={headerSummary}
      title={title}
      toolbar={
        searchControl || filterControls ? (
          <>
            {searchControl}
            {filterControls}
          </>
        ) : null
      }
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
        <AdminPanelStateView state={{ kind: "loading", label: messages.events.loading }} />
      </section>
    );
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const tableColumns = eventTableColumns(columns, messages, formatTimestamp);

  return (
    <section
      className={["admin-kit__events", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      {panelHeader(result)}
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : null}
      {result.items.length === 0 ? (
        (emptyState ?? (
          <AdminPanelStateView state={{ kind: "empty", title: messages.events.empty }} />
        ))
      ) : presentation === "table" ? (
        <AdminDataTable
          busy={loading}
          className="admin-kit__events-table"
          columns={tableColumns}
          label={title}
          renderDetails={(event) => renderEventDetails(event, messages)}
          rowKey={(event) => event.id}
          rowLabel={(event) =>
            `${event.action} ${formatAdminTimestamp(event.occurredAt, formatTimestamp)}`
          }
          rows={result.items}
          storageKey={storageKey}
          fill={tableFill}
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
                {show("actor") && event.actor ? (
                  <span>{messages.events.actor(event.actor.label)}</span>
                ) : null}
                {show("resource") && event.resource ? (
                  <span>{messages.events.resource(event.resource.label)}</span>
                ) : null}
              </div>
              {event.metadata ? (
                <details>
                  <summary>{messages.events.details}</summary>
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
          {messages.common.pageStatus(result.page, pages, locale)} ·{" "}
          {messages.events.total(result.total, locale)}
        </span>
        <button
          type="button"
          disabled={loading || result.page <= 1}
          onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
        >
          {messages.common.previousPage}
        </button>
        <button
          type="button"
          disabled={loading || result.page >= pages}
          onClick={() => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
        >
          {messages.common.nextPage}
        </button>
      </footer>
    </section>
  );
}

type AdminEvent = AdminEventsPage["items"][number];

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function formatRelative(iso: string, locale?: string, now = Date.now()): string | undefined {
  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
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
  const { locale } = useAdminMessages();
  const relative = formatTimestamp ? undefined : formatRelative(iso, locale);
  return (
    <time className="admin-kit__event-time" dateTime={iso} title={iso}>
      <span>{formatAdminTimestamp(iso, formatTimestamp)}</span>
      {relative ? <small>{relative}</small> : null}
    </time>
  );
}

function eventSubline(event: AdminEvent, messages: AdminMessages): string {
  const status = Number(event.metadata?.status);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? messages.events.returnedStatus(status)
    : event.message;
}

function eventTableColumns(
  visible: readonly EventsPanelColumn[],
  messages: AdminMessages,
  formatTimestamp?: (iso: string) => string,
): AdminDataTableColumn<AdminEvent>[] {
  const all: Record<EventsPanelColumn, AdminDataTableColumn<AdminEvent>> = {
    occurred: {
      id: "occurred",
      header: messages.events.columns.occurred,
      ...(formatTimestamp
        ? { defaultWidth: 184, minWidth: 128 }
        : { defaultWidth: TIMESTAMP_COLUMN_WIDTH, minWidth: TIMESTAMP_COLUMN_WIDTH }),
      cell: (event) => <OccurredCell formatTimestamp={formatTimestamp} iso={event.occurredAt} />,
    },
    event: {
      id: "event",
      header: messages.events.columns.event,
      minWidth: 200,
      truncate: true,
      title: (event) => `${event.action}\n${event.message}`,
      cell: (event) => (
        <>
          <strong>{event.action}</strong>
          <small>{eventSubline(event, messages)}</small>
        </>
      ),
    },
    actor: {
      id: "actor",
      header: messages.events.columns.actor,
      defaultWidth: 168,
      truncate: true,
      title: (event) => event.actor?.label,
      cell: (event) => event.actor?.label ?? "—",
    },
    resource: {
      id: "resource",
      header: messages.events.columns.resource,
      defaultWidth: 240,
      title: (event) => event.resource?.label,
      cell: (event) =>
        event.resource ? (
          <span className="admin-kit__events-resource">{event.resource.label}</span>
        ) : (
          "—"
        ),
    },
    outcome: {
      id: "outcome",
      header: messages.events.columns.outcome,
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

function renderEventDetails(event: AdminEvent, messages: AdminMessages) {
  const columns = messages.events.columns;
  const fields: [string, ReactNode][] = [
    [columns.action, event.action],
    [columns.message, event.message],
    [columns.occurred, event.occurredAt],
    [columns.actor, event.actor?.label ?? "—"],
    [columns.resource, event.resource?.label ?? "—"],
    [columns.outcome, `${event.outcome} · ${event.severity} · ${event.category}`],
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
