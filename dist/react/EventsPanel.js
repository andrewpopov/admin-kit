"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsPanel = EventsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
const AdminPanelState_1 = require("./AdminPanelState");
const SEARCH_DEBOUNCE_MS = 250;
function EventsPanel({ adapter, title = "Administrative events", headerPresentation = "section", refreshLabel = "Refresh", search, pageSize = 25, presentation = "feed", className, formatTimestamp }) {
    const [query, setQuery] = (0, react_1.useState)({ page: 1, pageSize });
    const [searchInput, setSearchInput] = (0, react_1.useState)(query.search ?? "");
    const [result, setResult] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const latestLoadId = (0, react_1.useRef)(0);
    const searchDebounceRef = (0, react_1.useRef)();
    const load = async (nextQuery = query) => {
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
                setError(reason instanceof Error ? reason.message : "Unable to load administrative events.");
            }
        }
        finally {
            if (loadId === latestLoadId.current)
                setLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous query/page can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new query hasn't started yet.
        return () => { latestLoadId.current += 1; };
    }, [adapter, query]);
    (0, react_1.useEffect)(() => () => { if (searchDebounceRef.current)
        clearTimeout(searchDebounceRef.current); }, []);
    const updateQuery = (patch) => setQuery((current) => ({ ...current, ...patch, page: 1 }));
    const updateSearch = (value) => {
        setSearchInput(value);
        if (searchDebounceRef.current)
            clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            updateQuery({ search: value || undefined });
        }, SEARCH_DEBOUNCE_MS);
    };
    const searchControl = search ? (0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__events-search", children: [(0, jsx_runtime_1.jsx)("span", { children: "Search" }), (0, jsx_runtime_1.jsx)("input", { type: "search", placeholder: search.placeholder, value: searchInput, onChange: (event) => updateSearch(event.target.value) })] }) : null;
    const refresh = (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", type: "button", disabled: loading, onClick: () => void load(), children: refreshLabel });
    const panelHeader = (source) => ((0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: headerPresentation === "page" ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [searchControl, refresh] }) : refresh, className: "admin-kit__events-header", detail: source ? (0, jsx_runtime_1.jsxs)("p", { children: ["Source: ", source.label, source.updatedAt ? ` · updated ${(0, core_1.formatAdminTimestamp)(source.updatedAt, formatTimestamp)}` : ""] }) : null, presentation: headerPresentation, title: title }));
    if (error && !result)
        return (0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })] });
    if (!result)
        return (0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading administrative events…" } })] });
    const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__events", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(result.source), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__events-filters", children: [headerPresentation === "section" ? searchControl : null, adapter.categories ? (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Category" }), (0, jsx_runtime_1.jsxs)("select", { value: query.category ?? "", onChange: (event) => updateQuery({ category: event.target.value || undefined }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All" }), adapter.categories.map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))] })] }) : null, adapter.severities ? (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Severity" }), (0, jsx_runtime_1.jsxs)("select", { value: query.severity ?? "", onChange: (event) => updateQuery({ severity: event.target.value || undefined }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All" }), adapter.severities.map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))] })] }) : null, adapter.outcomes ? (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Outcome" }), (0, jsx_runtime_1.jsxs)("select", { value: query.outcome ?? "", onChange: (event) => updateQuery({ outcome: event.target.value || undefined }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All" }), adapter.outcomes.map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))] })] }) : null] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }) : null, result.items.length === 0 ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No administrative events found." } }) : presentation === "table" ? ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__events-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__table admin-kit__events-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Occurred" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Event" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actor" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Resource" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Outcome" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Details" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.map((event) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: (0, core_1.formatAdminTimestamp)(event.occurredAt, formatTimestamp) }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: event.action }), (0, jsx_runtime_1.jsx)("small", { children: event.message })] }), (0, jsx_runtime_1.jsx)("td", { children: event.actor?.label ?? "—" }), (0, jsx_runtime_1.jsx)("td", { children: event.resource?.label ?? "—" }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("span", { className: `admin-kit__event-outcome admin-kit__event-outcome--${event.outcome}`, children: event.outcome }), (0, jsx_runtime_1.jsxs)("small", { children: [event.severity, " \u00B7 ", event.category] })] }), (0, jsx_runtime_1.jsx)("td", { children: event.metadata ? (0, jsx_runtime_1.jsxs)("details", { children: [(0, jsx_runtime_1.jsx)("summary", { children: "View" }), (0, jsx_runtime_1.jsx)("dl", { children: Object.entries(event.metadata).map(([label, value]) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: label }), (0, jsx_runtime_1.jsx)("dd", { children: value })] }, label)) })] }) : "—" })] }, event.id)) })] }) })) : (0, jsx_runtime_1.jsx)("ol", { className: "admin-kit__events-list", children: result.items.map((event) => (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: event.action }), (0, jsx_runtime_1.jsx)("p", { children: event.message }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, core_1.formatAdminTimestamp)(event.occurredAt, formatTimestamp), " \u00B7 ", event.category, " \u00B7 ", event.severity, " \u00B7 ", event.outcome] }), event.actor ? (0, jsx_runtime_1.jsxs)("span", { children: [" \u00B7 actor: ", event.actor.label] }) : null, event.resource ? (0, jsx_runtime_1.jsxs)("span", { children: [" \u00B7 resource: ", event.resource.label] }) : null] }), event.metadata ? (0, jsx_runtime_1.jsxs)("details", { children: [(0, jsx_runtime_1.jsx)("summary", { children: "Details" }), (0, jsx_runtime_1.jsx)("dl", { children: Object.entries(event.metadata).map(([label, value]) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: label }), (0, jsx_runtime_1.jsx)("dd", { children: value })] }, label)) })] }) : null] }, event.id)) }), (0, jsx_runtime_1.jsxs)("footer", { className: "admin-kit__events-pagination", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Page ", result.page, " of ", pages, " \u00B7 ", result.total, " events"] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: loading || result.page <= 1, onClick: () => setQuery((current) => ({ ...current, page: (current.page ?? 1) - 1 })), children: "Previous" }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: loading || result.page >= pages, onClick: () => setQuery((current) => ({ ...current, page: (current.page ?? 1) + 1 })), children: "Next" })] })] }));
}
