"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminStatusSummary = AdminStatusSummary;
exports.OperationalJobsPanel = OperationalJobsPanel;
exports.BackupsPanel = BackupsPanel;
exports.SettingsPanel = SettingsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminDataTable_1 = require("./AdminDataTable");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
const AdminLabels_1 = require("./AdminLabels");
const AdminPagination_1 = require("./AdminPagination");
const AdminPanelState_1 = require("./AdminPanelState");
const AdminPrimitives_1 = require("./AdminPrimitives");
function AdminStatusSummary({ items }) {
    return ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__status-summary", children: items.map((item) => ((0, jsx_runtime_1.jsxs)("div", { className: `admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`, "data-admin-kit-part": "status", "data-admin-kit-tone": item.tone ?? "neutral", children: [(0, jsx_runtime_1.jsx)("dt", { children: item.label }), (0, jsx_runtime_1.jsx)("dd", { children: item.value }), item.detail ? ((0, jsx_runtime_1.jsx)("dd", { children: (0, jsx_runtime_1.jsx)("small", { children: item.detail }) })) : null] }, item.label))) }));
}
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
function OperationalJobsPanel({ adapter, title: titleProp, runLabel: runLabelProp, pageSize = 25, className, formatTimestamp, emptyState: emptyStateProp, storageKey, tableFill, headerPresentation = "section", headerCollapsible, headerSummary, }) {
    const messagesRef = (0, AdminLabels_1.useAdminMessagesRef)();
    const { messages, locale } = messagesRef.current;
    const title = titleProp ?? messages.jobs.title;
    const runLabel = runLabelProp ?? messages.jobs.runLabel;
    const emptyState = emptyStateProp ?? { title: messages.jobs.empty };
    const [result, setResult] = (0, react_1.useState)();
    const [page, setPage] = (0, react_1.useState)(1);
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const latestLoadId = (0, react_1.useRef)(0);
    const load = (0, react_1.useCallback)(async () => {
        const loadId = ++latestLoadId.current;
        setIsLoading(true);
        try {
            setError(undefined);
            const next = await adapter.list({ page, pageSize });
            if (loadId === latestLoadId.current)
                setResult({ items: next.items, total: next.total });
        }
        catch (reason) {
            if (loadId === latestLoadId.current)
                setError(reason instanceof Error ? reason.message : messagesRef.current.messages.jobs.loadFailed);
        }
        finally {
            if (loadId === latestLoadId.current)
                setIsLoading(false);
        }
    }, [adapter, page, pageSize, messagesRef]);
    (0, react_1.useEffect)(() => {
        void load();
        // See BackupsPanel: invalidate synchronously with the transition so a
        // stale in-flight request for the previous page can't slip past the
        // loadId check before the effect for the new page has even started.
        return () => {
            latestLoadId.current += 1;
        };
    }, [load]);
    (0, react_1.useEffect)(() => {
        if (!result)
            return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage)
            setPage(lastPage);
    }, [result, page, pageSize]);
    if (error && !result)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className }));
    if (!result)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: messages.jobs.loading }, className: className }));
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const jobColumns = [
        {
            id: "job",
            header: messages.jobs.columns.job,
            minWidth: 224,
            cell: (item) => ((0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? ((0, jsx_runtime_1.jsx)("dd", { children: (0, jsx_runtime_1.jsx)("small", { children: item.detail }) })) : null] })),
        },
        {
            id: "started",
            header: messages.jobs.columns.started,
            defaultWidth: 184,
            minWidth: 128,
            cell: (item) => (0, jsx_runtime_1.jsx)("span", { children: (0, core_1.formatAdminTimestamp)(item.startedAt, formatTimestamp) }),
        },
        {
            id: "finished",
            header: messages.jobs.columns.finished,
            defaultWidth: 184,
            minWidth: 128,
            cell: (item) => ((0, jsx_runtime_1.jsx)("span", { children: item.finishedAt
                    ? (0, core_1.formatAdminTimestamp)(item.finishedAt, formatTimestamp)
                    : messages.jobs.inProgress })),
        },
        {
            id: "status",
            header: messages.jobs.columns.status,
            defaultWidth: 128,
            minWidth: 96,
            cell: (item) => ((0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) })),
        },
    ];
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__operations", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: adapter.run ? ((0, jsx_runtime_1.jsx)("button", { disabled: busy, type: "button", onClick: () => void (async () => {
                        setBusy(true);
                        try {
                            await adapter.run.execute();
                            await load();
                        }
                        catch (reason) {
                            setError(reason instanceof Error
                                ? reason.message
                                : messagesRef.current.messages.jobs.runFailed);
                        }
                        finally {
                            setBusy(false);
                        }
                    })(), children: runLabel })) : null, collapsible: (0, AdminPanelHeader_1.panelHeaderCollapsible)(headerCollapsible, { total: result.total }, { summary: (0, jsx_runtime_1.jsx)("span", { children: messages.jobs.recentRuns(result.total, locale) }) }), detail: (0, jsx_runtime_1.jsx)("p", { children: messages.jobs.recentRuns(result.total, locale) }), presentation: headerPresentation, summary: headerSummary, title: title }), error ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })) : null, result.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: emptyState.title, detail: emptyState.detail } })) : ((0, jsx_runtime_1.jsx)(AdminDataTable_1.AdminDataTable, { busy: busy || isLoading, className: "admin-kit__operations-table", columns: jobColumns, rowKey: (item) => item.id, rows: result.items, storageKey: storageKey, fill: tableFill, wrapClassName: "admin-kit__operations-table-wrap" })), (0, jsx_runtime_1.jsx)(AdminPagination_1.AdminPagination, { label: messages.jobs.pagination, page: page, pageCount: totalPages, onPageChange: setPage })] }));
}
function BackupsPanel({ adapter, title: titleProp, runLabel: runLabelProp, pageSize = 25, className, formatTimestamp, storageKey, tableFill, }) {
    const messagesRef = (0, AdminLabels_1.useAdminMessagesRef)();
    const { messages, locale } = messagesRef.current;
    const title = titleProp ?? messages.backups.title;
    const runLabel = runLabelProp ?? messages.backups.runLabel;
    const [result, setResult] = (0, react_1.useState)();
    const [page, setPage] = (0, react_1.useState)(1);
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [restoreTarget, setRestoreTarget] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    const load = (0, react_1.useCallback)(async () => {
        const loadId = ++latestLoadId.current;
        setIsLoading(true);
        try {
            setError(undefined);
            const next = await adapter.list({ page, pageSize });
            if (loadId === latestLoadId.current)
                setResult({ items: next.items, total: next.total });
        }
        catch (reason) {
            if (loadId === latestLoadId.current)
                setError(reason instanceof Error
                    ? reason.message
                    : messagesRef.current.messages.backups.loadFailed);
        }
        finally {
            if (loadId === latestLoadId.current)
                setIsLoading(false);
        }
    }, [adapter, page, pageSize, messagesRef]);
    const run = async () => {
        if (!adapter.run)
            return;
        setBusy(true);
        try {
            await adapter.run.execute();
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : messagesRef.current.messages.backups.runFailed);
        }
        finally {
            setBusy(false);
        }
    };
    const restore = async (backupId) => {
        if (!adapter.restore)
            return;
        setBusy(true);
        try {
            await adapter.restore.execute({ backupId });
            await load();
            setRestoreTarget(undefined);
        }
        catch (reason) {
            setError(reason instanceof Error
                ? reason.message
                : messagesRef.current.messages.backups.restoreFailed);
            setRestoreTarget(undefined);
        }
        finally {
            setBusy(false);
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        // Invalidate synchronously with the transition (see load()'s loadId
        // guard): otherwise a stale in-flight request for the previous
        // page/adapter can resolve after the new query starts and still pass
        // the loadId check, because the effect that bumps it for the new page
        // hasn't run yet.
        return () => {
            latestLoadId.current += 1;
        };
    }, [load]);
    (0, react_1.useEffect)(() => {
        if (!result)
            return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage)
            setPage(lastPage);
    }, [result, page, pageSize]);
    if (error && !result)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className }));
    if (!result)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: messages.backups.loading }, className: className }));
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const backupColumns = [
        {
            id: "backup",
            header: messages.backups.columns.backup,
            minWidth: 224,
            cell: (item) => ((0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? ((0, jsx_runtime_1.jsx)("dd", { children: (0, jsx_runtime_1.jsx)("small", { children: item.detail }) })) : null] })),
        },
        {
            id: "created",
            header: messages.backups.columns.created,
            defaultWidth: 184,
            minWidth: 128,
            cell: (item) => (0, jsx_runtime_1.jsx)("span", { children: (0, core_1.formatAdminTimestamp)(item.createdAt, formatTimestamp) }),
        },
        {
            id: "size",
            header: messages.backups.columns.size,
            defaultWidth: 112,
            minWidth: 80,
            cell: (item) => (0, jsx_runtime_1.jsx)("span", { children: item.size ?? "—" }),
        },
        {
            id: "status",
            header: messages.backups.columns.status,
            defaultWidth: 128,
            minWidth: 96,
            cell: (item) => ((0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) })),
        },
        ...(adapter.restore
            ? [
                {
                    id: "actions",
                    header: messages.backups.columns.actions,
                    defaultWidth: 128,
                    resizable: false,
                    cell: (item) => ((0, jsx_runtime_1.jsx)("button", { disabled: busy || item.state !== "completed", type: "button", onClick: () => setRestoreTarget(item), children: messages.backups.restore })),
                },
            ]
            : []),
    ];
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__operations", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: messages.backups.recoveryPoints(result.total, locale) })] }), adapter.run ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", disabled: busy, type: "button", onClick: () => void run(), children: runLabel })) : null] }), error ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })) : null, result.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                    kind: "empty",
                    title: messages.backups.emptyTitle,
                    detail: messages.backups.emptyDetail,
                } })) : ((0, jsx_runtime_1.jsx)(AdminDataTable_1.AdminDataTable, { busy: busy || isLoading, className: "admin-kit__operations-table admin-kit__backups-table", columns: backupColumns, rowKey: (item) => item.id, rows: result.items, storageKey: storageKey, fill: tableFill, wrapClassName: "admin-kit__operations-table-wrap admin-kit__backups-table-wrap" })), (0, jsx_runtime_1.jsx)(AdminPagination_1.AdminPagination, { label: messages.backups.pagination, page: page, pageCount: totalPages, onPageChange: setPage }), adapter.restore ? ((0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { open: Boolean(restoreTarget), title: messages.backups.restoreTitle, description: restoreTarget ? messages.backups.restoreDescription(restoreTarget.label) : "", confirmLabel: messages.backups.restoreConfirm, danger: true, pending: busy, onCancel: () => setRestoreTarget(undefined), onConfirm: () => restoreTarget && void restore(restoreTarget.id) })) : null] }));
}
function SettingsPanel({ adapter, title: titleProp, className }) {
    const messagesRef = (0, AdminLabels_1.useAdminMessagesRef)();
    const { messages } = messagesRef.current;
    const title = titleProp ?? messages.settings.title;
    const [fields, setFields] = (0, react_1.useState)();
    const [values, setValues] = (0, react_1.useState)({});
    const [initialValues, setInitialValues] = (0, react_1.useState)({});
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [saved, setSaved] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    const load = (0, react_1.useCallback)(async () => {
        const loadId = ++latestLoadId.current;
        // A failed load under the new adapter must not fall through to
        // displaying the previous adapter's fields, and a retried or
        // newly-successful load must not leave a stale error behind.
        setFields(undefined);
        setError(undefined);
        try {
            const next = await adapter.load();
            if (loadId !== latestLoadId.current)
                return;
            const loaded = Object.fromEntries(next.map((field) => [field.id, field.value]));
            setFields(next);
            setValues(loaded);
            setInitialValues(loaded);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setError(reason instanceof Error
                    ? reason.message
                    : messagesRef.current.messages.settings.loadFailed);
            }
        }
    }, [adapter, messagesRef]);
    (0, react_1.useEffect)(() => {
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous adapter can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new adapter hasn't started yet.
        return () => {
            latestLoadId.current += 1;
        };
    }, [load]);
    if (error && !fields)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className }));
    if (!fields)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: messages.settings.loading }, className: className }));
    const dirty = Object.keys(values).some((key) => values[key] !== initialValues[key]);
    const save = async () => {
        setSaving(true);
        setSaved(false);
        setError(undefined);
        try {
            await adapter.save.execute({ values });
            setInitialValues(values);
            setSaved(true);
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : messagesRef.current.messages.settings.saveFailed);
        }
        finally {
            setSaving(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("form", { className: ["admin-kit__settings", className].filter(Boolean).join(" "), "aria-label": title, onSubmit: (event) => {
            event.preventDefault();
            void save();
        }, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: messages.settings.intro })] }), (0, jsx_runtime_1.jsx)("button", { disabled: saving || !dirty, children: saving ? messages.settings.saving : messages.settings.save })] }), (0, jsx_runtime_1.jsx)("p", { "aria-live": "polite", className: "admin-kit__settings-feedback", children: saved ? messages.settings.saved : null }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error } }) : null, fields.map((field) => field.type === "boolean" ? ((0, jsx_runtime_1.jsx)(AdminPrimitives_1.AdminSwitch, { checked: Boolean(values[field.id]), className: "admin-kit__settings-toggle", description: field.description, label: field.label, onClick: () => {
                    setSaved(false);
                    setValues((current) => ({ ...current, [field.id]: !current[field.id] }));
                }, statusLabel: values[field.id] ? messages.settings.enabled : messages.settings.disabled }, field.id)) : ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: field.label }), field.description ? (0, jsx_runtime_1.jsx)("small", { children: field.description }) : null, (0, jsx_runtime_1.jsx)("input", { type: field.sensitive ? "password" : "text", value: String(values[field.id] ?? ""), onChange: (event) => {
                            setSaved(false);
                            setValues((current) => ({ ...current, [field.id]: event.target.value }));
                        } })] }, field.id)))] }));
}
