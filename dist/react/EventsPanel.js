"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsPanel = EventsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminLabels_1 = require("./AdminLabels");
const AdminDataTable_1 = require("./AdminDataTable");
const AdminFilterChip_1 = require("./AdminFilterChip");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
const adminDataTableFit_1 = require("./adminDataTableFit");
const AdminPanelState_1 = require("./AdminPanelState");
const SEARCH_DEBOUNCE_MS = 250;
const ALL_COLUMNS = [
    "occurred",
    "event",
    "actor",
    "resource",
    "outcome",
];
function EventsPanel({ adapter, title: titleProp, headerPresentation = "section", refreshLabel: refreshLabelProp, search, pageSize = 25, presentation = "feed", className, formatTimestamp, columns = ALL_COLUMNS, emptyState, storageKey, tableFill, headerCollapsible, headerSummary, }) {
    const show = (column) => columns.includes(column);
    const messagesRef = (0, AdminLabels_1.useAdminMessagesRef)();
    const { messages, locale } = messagesRef.current;
    const title = titleProp ?? messages.events.title;
    const refreshLabel = refreshLabelProp ?? messages.events.refresh;
    const [query, setQuery] = (0, react_1.useState)({ page: 1, pageSize });
    const [searchInput, setSearchInput] = (0, react_1.useState)(query.search ?? "");
    const [result, setResult] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const latestLoadId = (0, react_1.useRef)(0);
    const searchDebounceRef = (0, react_1.useRef)();
    const load = (0, react_1.useCallback)(async (nextQuery = query) => {
        const loadId = ++latestLoadId.current;
        setLoading(true);
        setError(undefined);
        try {
            const nextResult = (0, core_1.validateAdminEventsPage)(await adapter.list(nextQuery));
            if (loadId === latestLoadId.current)
                setResult(nextResult);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setError(reason instanceof Error
                    ? reason.message
                    : messagesRef.current.messages.events.loadFailed);
            }
        }
        finally {
            if (loadId === latestLoadId.current)
                setLoading(false);
        }
    }, [adapter, query, messagesRef]);
    (0, react_1.useEffect)(() => {
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous query/page can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new query hasn't started yet.
        return () => {
            latestLoadId.current += 1;
        };
    }, [load]);
    (0, react_1.useEffect)(() => () => {
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
    }, []);
    const updateQuery = (patch) => setQuery((current) => ({ ...current, ...patch, page: 1 }));
    const updateSearch = (value) => {
        setSearchInput(value);
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            updateQuery({ search: value || undefined });
        }, SEARCH_DEBOUNCE_MS);
    };
    const clearSearch = () => {
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
        setSearchInput("");
        updateQuery({ search: undefined });
    };
    const searchControl = search ? ((0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__events-search", children: [(0, jsx_runtime_1.jsx)("span", { children: messages.events.search }), (0, jsx_runtime_1.jsx)("input", { type: "search", placeholder: search.placeholder, value: searchInput, onChange: (event) => updateSearch(event.target.value) })] })) : null;
    const refresh = ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", type: "button", disabled: loading, onClick: () => void load(), children: refreshLabel }));
    const optionLabel = (options, value) => options?.find((option) => option.value === value)?.label ?? value;
    const appliedFilters = [
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
    const chips = appliedFilters.map((filter) => ((0, jsx_runtime_1.jsx)(AdminFilterChip_1.AdminFilterChip, { label: filter.label, onRemove: filter.remove }, filter.key)));
    const filterControls = adapter.categories || adapter.severities || adapter.outcomes ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__events-filters", children: [adapter.categories ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: messages.events.columns.category }), (0, jsx_runtime_1.jsxs)("select", { value: query.category ?? "", onChange: (event) => updateQuery({ category: event.target.value || undefined }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: messages.events.all }), adapter.categories.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)))] })] })) : null, adapter.severities ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: messages.events.columns.severity }), (0, jsx_runtime_1.jsxs)("select", { value: query.severity ?? "", onChange: (event) => updateQuery({
                            severity: event.target.value || undefined,
                        }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: messages.events.all }), adapter.severities.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)))] })] })) : null, adapter.outcomes ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: messages.events.columns.outcome }), (0, jsx_runtime_1.jsxs)("select", { value: query.outcome ?? "", onChange: (event) => updateQuery({
                            outcome: event.target.value || undefined,
                        }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: messages.events.all }), adapter.outcomes.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)))] })] })) : null] })) : null;
    const panelHeader = (result) => ((0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: refresh, className: "admin-kit__events-header", collapsible: (0, AdminPanelHeader_1.panelHeaderCollapsible)(headerCollapsible, result ? { query, total: result.total, chips } : undefined, {
            summary: ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [result ? (0, jsx_runtime_1.jsx)("span", { children: messages.events.total(result.total, locale) }) : null, chips] })),
            activeCount: appliedFilters.length,
        }), detail: result?.source ? ((0, jsx_runtime_1.jsx)("p", { children: messages.events.source(result.source.label, result.source.updatedAt
                ? (0, core_1.formatAdminTimestamp)(result.source.updatedAt, formatTimestamp)
                : undefined) })) : null, presentation: headerPresentation, summary: headerSummary, title: title, toolbar: searchControl || filterControls ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [searchControl, filterControls] })) : null }));
    if (error && !result)
        return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })] }));
    if (!result)
        return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: messages.events.loading } })] }));
    const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
    const tableColumns = eventTableColumns(columns, messages, formatTimestamp);
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(result), error ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })) : null, result.items.length === 0 ? ((emptyState ?? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: messages.events.empty } })))) : presentation === "table" ? ((0, jsx_runtime_1.jsx)(AdminDataTable_1.AdminDataTable, { busy: loading, className: "admin-kit__events-table", columns: tableColumns, label: title, renderDetails: (event) => renderEventDetails(event, messages), rowKey: (event) => event.id, rowLabel: (event) => `${event.action} ${(0, core_1.formatAdminTimestamp)(event.occurredAt, formatTimestamp)}`, rows: result.items, storageKey: storageKey, fill: tableFill, wrapClassName: "admin-kit__events-table-wrap" })) : ((0, jsx_runtime_1.jsx)("ol", { className: "admin-kit__events-list", "aria-busy": loading, children: result.items.map((event) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: event.action }), (0, jsx_runtime_1.jsx)("p", { children: event.message }), (0, jsx_runtime_1.jsx)("span", { children: [
                                        show("occurred")
                                            ? (0, core_1.formatAdminTimestamp)(event.occurredAt, formatTimestamp)
                                            : null,
                                        event.category,
                                        event.severity,
                                        show("outcome") ? event.outcome : null,
                                    ]
                                        .filter((part) => part !== null)
                                        .join(" · ") }), show("actor") && event.actor ? ((0, jsx_runtime_1.jsx)("span", { children: messages.events.actor(event.actor.label) })) : null, show("resource") && event.resource ? ((0, jsx_runtime_1.jsx)("span", { children: messages.events.resource(event.resource.label) })) : null] }), event.metadata ? ((0, jsx_runtime_1.jsxs)("details", { children: [(0, jsx_runtime_1.jsx)("summary", { children: messages.events.details }), (0, jsx_runtime_1.jsx)("dl", { children: Object.entries(event.metadata).map(([label, value]) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: label }), (0, jsx_runtime_1.jsx)("dd", { children: value })] }, label))) })] })) : null] }, event.id))) })), (0, jsx_runtime_1.jsxs)("footer", { className: "admin-kit__events-pagination", children: [(0, jsx_runtime_1.jsxs)("span", { children: [messages.common.pageStatus(result.page, pages, locale), " \u00B7", " ", messages.events.total(result.total, locale)] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: loading || result.page <= 1, onClick: () => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 })), children: messages.common.previousPage }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: loading || result.page >= pages, onClick: () => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 })), children: messages.common.nextPage })] })] }));
}
const RELATIVE_UNITS = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
];
function formatRelative(iso, locale, now = Date.now()) {
    const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const time = Date.parse(iso);
    if (Number.isNaN(time))
        return undefined;
    const seconds = Math.round((time - now) / 1000);
    for (const [unit, size] of RELATIVE_UNITS) {
        if (Math.abs(seconds) >= size)
            return relativeTime.format(Math.round(seconds / size), unit);
    }
    return relativeTime.format(0, "minute");
}
function OccurredCell({ iso, formatTimestamp, }) {
    const { locale } = (0, AdminLabels_1.useAdminMessages)();
    const relative = formatTimestamp ? undefined : formatRelative(iso, locale);
    return ((0, jsx_runtime_1.jsxs)("time", { className: "admin-kit__event-time", dateTime: iso, title: iso, children: [(0, jsx_runtime_1.jsx)("span", { children: (0, core_1.formatAdminTimestamp)(iso, formatTimestamp) }), relative ? (0, jsx_runtime_1.jsx)("small", { children: relative }) : null] }));
}
function eventSubline(event, messages) {
    const status = Number(event.metadata?.status);
    return Number.isInteger(status) && status >= 100 && status <= 599
        ? messages.events.returnedStatus(status)
        : event.message;
}
function eventTableColumns(visible, messages, formatTimestamp) {
    const all = {
        occurred: {
            id: "occurred",
            header: messages.events.columns.occurred,
            ...(formatTimestamp
                ? { defaultWidth: 184, minWidth: 128 }
                : { defaultWidth: adminDataTableFit_1.TIMESTAMP_COLUMN_WIDTH, minWidth: adminDataTableFit_1.TIMESTAMP_COLUMN_WIDTH }),
            cell: (event) => (0, jsx_runtime_1.jsx)(OccurredCell, { formatTimestamp: formatTimestamp, iso: event.occurredAt }),
        },
        event: {
            id: "event",
            header: messages.events.columns.event,
            minWidth: 200,
            truncate: true,
            title: (event) => `${event.action}\n${event.message}`,
            cell: (event) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("strong", { children: event.action }), (0, jsx_runtime_1.jsx)("small", { children: eventSubline(event, messages) })] })),
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
            cell: (event) => event.resource ? ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__events-resource", children: event.resource.label })) : ("—"),
        },
        outcome: {
            id: "outcome",
            header: messages.events.columns.outcome,
            defaultWidth: 136,
            minWidth: 96,
            cell: (event) => ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: `admin-kit__event-outcome admin-kit__event-outcome--${event.outcome}`, children: event.outcome }), (0, jsx_runtime_1.jsxs)("small", { children: [event.severity, " \u00B7 ", event.category] })] })),
        },
    };
    return ALL_COLUMNS.filter((column) => visible.includes(column)).map((column) => all[column]);
}
function renderEventDetails(event, messages) {
    const columns = messages.events.columns;
    const fields = [
        [columns.action, event.action],
        [columns.message, event.message],
        [columns.occurred, event.occurredAt],
        [columns.actor, event.actor?.label ?? "—"],
        [columns.resource, event.resource?.label ?? "—"],
        [columns.outcome, `${event.outcome} · ${event.severity} · ${event.category}`],
        ...Object.entries(event.metadata ?? {}),
    ];
    return ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__event-details", children: fields.map(([label, value], index) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: label }), (0, jsx_runtime_1.jsx)("dd", { children: value })] }, index))) }));
}
