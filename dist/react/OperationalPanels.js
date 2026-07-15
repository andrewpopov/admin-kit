"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminStatusSummary = AdminStatusSummary;
exports.OperationalJobsPanel = OperationalJobsPanel;
exports.BackupsPanel = BackupsPanel;
exports.SettingsPanel = SettingsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminPanelState_1 = require("./AdminPanelState");
const AdminPrimitives_1 = require("./AdminPrimitives");
function AdminStatusSummary({ items }) { return (0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__status-summary", children: items.map(item => (0, jsx_runtime_1.jsxs)("div", { className: `admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`, children: [(0, jsx_runtime_1.jsx)("dt", { children: item.label }), (0, jsx_runtime_1.jsx)("dd", { children: item.value }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }, item.label)) }); }
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
function OperationalJobsPanel({ adapter, title = "Operational jobs", runLabel = "Run now", pageSize = 25, className, formatTimestamp, emptyState = { title: "No operational runs yet." } }) {
    const [result, setResult] = (0, react_1.useState)();
    const [page, setPage] = (0, react_1.useState)(1);
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const latestLoadId = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        try {
            setError(undefined);
            const next = await adapter.list({ page, pageSize });
            if (loadId === latestLoadId.current)
                setResult({ items: next.items, total: next.total });
        }
        catch (reason) {
            if (loadId === latestLoadId.current)
                setError(reason instanceof Error ? reason.message : "Unable to load operational jobs.");
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        // See BackupsPanel: invalidate synchronously with the transition so a
        // stale in-flight request for the previous page can't slip past the
        // loadId check before the effect for the new page has even started.
        return () => { latestLoadId.current += 1; };
    }, [adapter, page, pageSize]);
    (0, react_1.useEffect)(() => {
        if (!result)
            return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage)
            setPage(lastPage);
    }, [result, page, pageSize]);
    if (error && !result)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className });
    if (!result)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading operational jobs…" }, className: className });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return (0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__operations", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [result.total, " recent runs"] })] }), adapter.run ? (0, jsx_runtime_1.jsx)("button", { disabled: busy, type: "button", onClick: () => void (async () => { setBusy(true); try {
                            await adapter.run.execute();
                            await load();
                        }
                        catch (reason) {
                            setError(reason instanceof Error ? reason.message : "Unable to run the operational job.");
                        }
                        finally {
                            setBusy(false);
                        } })(), children: runLabel }) : null] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }) : null, result.items.length === 0 ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: emptyState.title, detail: emptyState.detail } }) : (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__operations-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__table admin-kit__operations-table", "aria-busy": busy, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Job" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Started" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Finished" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.map(item => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }), (0, jsx_runtime_1.jsx)("td", { children: (0, core_1.formatAdminTimestamp)(item.startedAt, formatTimestamp) }), (0, jsx_runtime_1.jsx)("td", { children: item.finishedAt ? (0, core_1.formatAdminTimestamp)(item.finishedAt, formatTimestamp) : "In progress" }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) })] }, item.id)) })] }) }), totalPages > 1 ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": "Operational jobs pagination", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page <= 1, onClick: () => setPage(page - 1), children: "Previous" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page, " of ", totalPages] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page >= totalPages, onClick: () => setPage(page + 1), children: "Next" })] })) : null] });
}
function BackupsPanel({ adapter, title = "Backups", runLabel = "Run backup", pageSize = 25, className, formatTimestamp }) {
    const [result, setResult] = (0, react_1.useState)();
    const [page, setPage] = (0, react_1.useState)(1);
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const [restoreTarget, setRestoreTarget] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        try {
            setError(undefined);
            const next = await adapter.list({ page, pageSize });
            if (loadId === latestLoadId.current)
                setResult({ items: next.items, total: next.total });
        }
        catch (reason) {
            if (loadId === latestLoadId.current)
                setError(reason instanceof Error ? reason.message : "Unable to load backups.");
        }
    };
    const run = async () => {
        if (!adapter.run)
            return;
        setBusy(true);
        try {
            await adapter.run.execute();
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to run backup.");
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
            setError(reason instanceof Error ? reason.message : "Unable to restore backup.");
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
        return () => { latestLoadId.current += 1; };
    }, [adapter, page, pageSize]);
    (0, react_1.useEffect)(() => {
        if (!result)
            return;
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
        if (page > lastPage)
            setPage(lastPage);
    }, [result, page, pageSize]);
    if (error && !result)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className });
    if (!result)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading backups…" }, className: className });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const columnCount = adapter.restore ? 5 : 4;
    return (0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__operations", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [result.total, " recent recovery points"] })] }), adapter.run ? (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", disabled: busy, type: "button", onClick: () => void run(), children: runLabel }) : null] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__operations-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__table admin-kit__operations-table", "aria-busy": busy, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Backup" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Created" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Size" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Status" }), adapter.restore ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" }) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.length === 0 ? (0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { className: "admin-kit__operations-empty", colSpan: columnCount, children: "No backups yet. Run a backup to create your first recovery point." }) }) : result.items.map(item => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }), (0, jsx_runtime_1.jsx)("td", { children: (0, core_1.formatAdminTimestamp)(item.createdAt, formatTimestamp) }), (0, jsx_runtime_1.jsx)("td", { children: item.size ?? "—" }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) }), adapter.restore ? (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("button", { disabled: busy || item.state !== "completed", type: "button", onClick: () => setRestoreTarget(item), children: "Restore" }) }) : null] }, item.id)) })] }) }), totalPages > 1 ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": "Backups pagination", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page <= 1, onClick: () => setPage(page - 1), children: "Previous" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page, " of ", totalPages] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page >= totalPages, onClick: () => setPage(page + 1), children: "Next" })] })) : null, adapter.restore ? (0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { open: Boolean(restoreTarget), title: "Restore backup", description: restoreTarget ? `This will overwrite the current database with the recovery point "${restoreTarget.label}". This action is destructive and cannot be reversed.` : "", confirmLabel: "Restore backup", danger: true, pending: busy, onCancel: () => setRestoreTarget(undefined), onConfirm: () => restoreTarget && void restore(restoreTarget.id) }) : null] });
}
function SettingsPanel({ adapter, title = "Settings", className }) {
    const [fields, setFields] = (0, react_1.useState)();
    const [values, setValues] = (0, react_1.useState)({});
    const [initialValues, setInitialValues] = (0, react_1.useState)({});
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [saved, setSaved] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => { void adapter.load().then(next => { const loaded = Object.fromEntries(next.map(field => [field.id, field.value])); setFields(next); setValues(loaded); setInitialValues(loaded); }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load settings.")); }, [adapter]);
    if (error && !fields)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error }, className: className });
    if (!fields)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading settings…" }, className: className });
    const dirty = Object.keys(values).some(key => values[key] !== initialValues[key]);
    const save = async () => { setSaving(true); setSaved(false); setError(undefined); try {
        await adapter.save.execute({ values });
        setInitialValues(values);
        setSaved(true);
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to save settings.");
    }
    finally {
        setSaving(false);
    } };
    return (0, jsx_runtime_1.jsxs)("form", { className: ["admin-kit__settings", className].filter(Boolean).join(" "), "aria-label": title, onSubmit: event => { event.preventDefault(); void save(); }, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: "Changes are applied when saved." })] }), (0, jsx_runtime_1.jsx)("button", { disabled: saving || !dirty, children: saving ? "Saving…" : "Save changes" })] }), (0, jsx_runtime_1.jsx)("p", { "aria-live": "polite", className: "admin-kit__settings-feedback", children: saved ? "Changes saved." : null }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error } }) : null, fields.map(field => field.type === "boolean" ? (0, jsx_runtime_1.jsx)(AdminPrimitives_1.AdminSwitch, { checked: Boolean(values[field.id]), className: "admin-kit__settings-toggle", description: field.description, label: field.label, onClick: () => { setSaved(false); setValues(current => ({ ...current, [field.id]: !Boolean(current[field.id]) })); }, statusLabel: Boolean(values[field.id]) ? "Enabled" : "Disabled" }, field.id) : (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: field.label }), field.description ? (0, jsx_runtime_1.jsx)("small", { children: field.description }) : null, (0, jsx_runtime_1.jsx)("input", { type: field.sensitive ? "password" : "text", value: String(values[field.id] ?? ""), onChange: event => { setSaved(false); setValues(current => ({ ...current, [field.id]: event.target.value })); } })] }, field.id))] });
}
