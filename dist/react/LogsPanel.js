"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsPanel = LogsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminPanelState_1 = require("./AdminPanelState");
/** Runtime output viewer; structured audit and authorization events belong in EventsPanel. */
function LogsPanel({ adapter, title = "Runtime logs", pollIntervalMs, defaultAutoRefresh = false, formatTimestamp, className, }) {
    const pollingInterval = pollIntervalMs !== undefined && Number.isFinite(pollIntervalMs) && pollIntervalMs > 0
        ? pollIntervalMs
        : undefined;
    const limits = adapter.lineLimits ?? [100, 200, 500, 1000];
    const [source, setSource] = (0, react_1.useState)(adapter.defaultSource ?? "");
    const [limit, setLimit] = (0, react_1.useState)(adapter.defaultLineLimit ?? limits[0] ?? 100);
    const [level, setLevel] = (0, react_1.useState)("");
    const [category, setCategory] = (0, react_1.useState)("");
    const [search, setSearch] = (0, react_1.useState)("");
    const [appliedSearch, setAppliedSearch] = (0, react_1.useState)("");
    const [snapshot, setSnapshot] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [copyFeedback, setCopyFeedback] = (0, react_1.useState)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [autoRefresh, setAutoRefresh] = (0, react_1.useState)(Boolean(pollingInterval && defaultAutoRefresh));
    const latestLoadId = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setIsLoading(true);
        setError(undefined);
        try {
            const next = (0, core_1.validateAdminLogsSnapshot)(await adapter.read({
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
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setError(reason instanceof Error ? reason.message : "Unable to load runtime logs.");
            }
        }
        finally {
            if (loadId === latestLoadId.current)
                setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        return () => {
            latestLoadId.current += 1;
        };
    }, [adapter, source, limit, level, category, appliedSearch]);
    (0, react_1.useEffect)(() => {
        if (!autoRefresh || !pollingInterval)
            return;
        const timer = window.setInterval(() => void load(), pollingInterval);
        return () => window.clearInterval(timer);
    }, [autoRefresh, pollingInterval, adapter, source, limit, level, category, appliedSearch]);
    (0, react_1.useEffect)(() => {
        if (!snapshot)
            return;
        if (level && snapshot.levels && !snapshot.levels.some((option) => option.value === level))
            setLevel("");
        if (category &&
            snapshot.categories &&
            !snapshot.categories.some((option) => option.value === category))
            setCategory("");
    }, [snapshot, level, category]);
    const visibleEntries = (0, react_1.useMemo)(() => {
        const needle = search.trim().toLowerCase();
        return (snapshot?.entries.filter((entry) => (!level || entry.level?.value === level) &&
            (!category || entry.category === category) &&
            (!needle || `${entry.message}\n${entry.raw ?? ""}`.toLowerCase().includes(needle))) ?? []);
    }, [snapshot, search, level, category]);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(visibleEntries.map((entry) => entry.raw ?? entry.message).join("\n"));
            setCopyFeedback("Visible log output copied.");
        }
        catch {
            setCopyFeedback("Unable to copy log output.");
        }
    };
    if (error && !snapshot) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "error", detail: error, onRetry: () => void load() } }));
    }
    if (!snapshot) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "loading", label: "Loading runtime logs…" } }));
    }
    // Render the adapter's canonicalized source, not the possibly-aliased
    // request value: a request for "app" that the adapter canonicalizes to
    // "app-canonical" must show the canonical value, or the select would
    // either show the stale alias or go blank when it isn't in `sources`.
    const selectedSource = snapshot.source || source || "";
    const sourceDetail = snapshot.sources.find((candidate) => candidate.value === selectedSource)?.detail;
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__logs", className].filter(Boolean).join(" "), "aria-label": title, "aria-busy": isLoading, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__logs-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [snapshot.total, " matching ", snapshot.total === 1 ? "line" : "lines", sourceDetail ? ` · ${sourceDetail}` : "", snapshot.generatedAt
                                        ? ` · Updated ${(0, core_1.formatAdminTimestamp)(snapshot.generatedAt, formatTimestamp)}`
                                        : ""] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__logs-actions", children: [pollingInterval ? ((0, jsx_runtime_1.jsxs)("button", { className: "admin-kit__button", type: "button", role: "switch", "aria-checked": autoRefresh, onClick: () => setAutoRefresh((current) => !current), children: ["Auto-refresh ", autoRefresh ? "on" : "off"] })) : null, (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", disabled: isLoading, type: "button", onClick: () => void load(), children: "Refresh" })] })] }), (0, jsx_runtime_1.jsxs)("form", { className: "admin-kit__logs-filters", onSubmit: (event) => {
                    event.preventDefault();
                    setAppliedSearch(search.trim());
                }, children: [snapshot.sources.length > 1 ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Source" }), (0, jsx_runtime_1.jsx)("select", { value: selectedSource, onChange: (event) => {
                                    setLevel("");
                                    setCategory("");
                                    setSource(event.target.value);
                                }, children: snapshot.sources.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))) })] })) : null, snapshot.levels?.length ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Level" }), (0, jsx_runtime_1.jsxs)("select", { value: level, onChange: (event) => setLevel(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All levels" }), snapshot.levels.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)))] })] })) : null, snapshot.categories?.length ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Category" }), (0, jsx_runtime_1.jsxs)("select", { value: category, onChange: (event) => setCategory(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All categories" }), snapshot.categories.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)))] })] })) : null, (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Lines" }), (0, jsx_runtime_1.jsx)("select", { value: limit, onChange: (event) => setLimit(Number(event.target.value)), children: limits.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option, children: option }, option))) })] }), (0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__logs-search", children: [(0, jsx_runtime_1.jsx)("span", { children: "Search logs" }), (0, jsx_runtime_1.jsx)("input", { type: "search", placeholder: "Message or raw output", value: search, onChange: (event) => setSearch(event.target.value) })] }), (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", type: "submit", children: "Apply" })] }), error ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })) : null, (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__logs-summary", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Showing ", visibleEntries.length, " of ", snapshot.entries.length, " loaded"] }), (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", disabled: visibleEntries.length === 0, type: "button", onClick: () => void copy(), children: "Copy visible" })] }), (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__logs-feedback", "aria-live": "polite", children: copyFeedback }), visibleEntries.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No log lines matched." } })) : ((0, jsx_runtime_1.jsx)("ol", { className: "admin-kit__logs-output", children: visibleEntries.map((entry) => ((0, jsx_runtime_1.jsxs)("li", { className: `admin-kit__log-line admin-kit__log-line--${entry.level?.tone ?? "neutral"}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__log-context", children: [entry.timestamp ? ((0, jsx_runtime_1.jsx)("time", { dateTime: entry.timestamp, children: (0, core_1.formatAdminTimestamp)(entry.timestamp, formatTimestamp) })) : null, entry.level ? (0, jsx_runtime_1.jsx)("span", { children: entry.level.label }) : null, entry.category ? (0, jsx_runtime_1.jsx)("span", { children: entry.category }) : null] }), (0, jsx_runtime_1.jsx)("pre", { children: entry.message })] }, entry.id))) }))] }));
}
