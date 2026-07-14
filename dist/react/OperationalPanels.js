"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminStatusSummary = AdminStatusSummary;
exports.OperationalJobsPanel = OperationalJobsPanel;
exports.BackupsPanel = BackupsPanel;
exports.SettingsPanel = SettingsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminPanelState_1 = require("./AdminPanelState");
function AdminStatusSummary({ items }) { return (0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__status-summary", children: items.map(item => (0, jsx_runtime_1.jsxs)("div", { className: `admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`, children: [(0, jsx_runtime_1.jsx)("dt", { children: item.label }), (0, jsx_runtime_1.jsx)("dd", { children: item.value }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }, item.label)) }); }
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
function OperationalJobsPanel({ adapter, title = "Operational jobs", runLabel = "Run now" }) {
    const [items, setItems] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const load = async () => { try {
        setError(undefined);
        setItems((await adapter.list({ page: 1, pageSize: 25 })).items);
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load operational jobs.");
    } };
    (0, react_1.useEffect)(() => { void load(); }, [adapter]);
    if (error && !items)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } });
    if (!items)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading operational jobs…" } });
    return (0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__operations", "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [items.length, " recent runs"] })] }), adapter.run ? (0, jsx_runtime_1.jsx)("button", { disabled: busy, type: "button", onClick: () => void (async () => { setBusy(true); try {
                            await adapter.run.execute();
                            await load();
                        }
                        finally {
                            setBusy(false);
                        } })(), children: runLabel }) : null] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__operations-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Job" }), (0, jsx_runtime_1.jsx)("th", { children: "Started" }), (0, jsx_runtime_1.jsx)("th", { children: "Finished" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map(item => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }), (0, jsx_runtime_1.jsx)("td", { children: item.startedAt }), (0, jsx_runtime_1.jsx)("td", { children: item.finishedAt ?? "In progress" }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) })] }, item.id)) })] }) })] });
}
function BackupsPanel({ adapter, title = "Backups" }) {
    const [items, setItems] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [busy, setBusy] = (0, react_1.useState)(false);
    const load = async () => { try {
        setItems((await adapter.list({ page: 1, pageSize: 25 })).items);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load backups.");
    } };
    (0, react_1.useEffect)(() => { void load(); }, [adapter]);
    if (error && !items)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } });
    if (!items)
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading backups…" } });
    return (0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__operations", "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [items.length, " recent recovery points"] })] }), adapter.run ? (0, jsx_runtime_1.jsx)("button", { disabled: busy, onClick: () => void (async () => { setBusy(true); try {
                            await adapter.run.execute();
                            await load();
                        }
                        finally {
                            setBusy(false);
                        } })(), children: "Run backup" }) : null] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__operations-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Backup" }), (0, jsx_runtime_1.jsx)("th", { children: "Created" }), (0, jsx_runtime_1.jsx)("th", { children: "Size" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", {})] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: items.map(item => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.label }), item.detail ? (0, jsx_runtime_1.jsx)("small", { children: item.detail }) : null] }), (0, jsx_runtime_1.jsx)("td", { children: item.createdAt }), (0, jsx_runtime_1.jsx)("td", { children: item.size ?? "—" }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--${item.state}`, children: item.state }) }), (0, jsx_runtime_1.jsx)("td", { children: adapter.restore ? (0, jsx_runtime_1.jsx)("button", { disabled: busy || item.state !== "completed", onClick: () => void adapter.restore.execute({ backupId: item.id }), children: "Restore" }) : null })] }, item.id)) })] }) })] });
}
function SettingsPanel({ adapter, title = "Settings" }) { const [fields, setFields] = (0, react_1.useState)(); const [values, setValues] = (0, react_1.useState)({}); const [saving, setSaving] = (0, react_1.useState)(false); const [error, setError] = (0, react_1.useState)(); (0, react_1.useEffect)(() => { void adapter.load().then(next => { setFields(next); setValues(Object.fromEntries(next.map(x => [x.id, x.value]))); }).catch(e => setError(e instanceof Error ? e.message : "Unable to load settings.")); }, [adapter]); if (error && !fields)
    return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error } }); if (!fields)
    return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading settings…" } }); return (0, jsx_runtime_1.jsxs)("form", { className: "admin-kit__settings", "aria-label": title, onSubmit: e => { e.preventDefault(); void (async () => { setSaving(true); setError(undefined); try {
        await adapter.save.execute({ values });
    }
    catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to save settings.");
    }
    finally {
        setSaving(false);
    } })(); }, children: [(0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: "Changes are applied when saved." })] }), (0, jsx_runtime_1.jsx)("button", { disabled: saving, children: "Save changes" })] }), error ? (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error } }) : null, fields.map(field => (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: field.label }), field.description ? (0, jsx_runtime_1.jsx)("small", { children: field.description }) : null, field.type === "boolean" ? (0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: Boolean(values[field.id]), onChange: e => setValues(v => ({ ...v, [field.id]: e.target.checked })) }) : (0, jsx_runtime_1.jsx)("input", { type: field.sensitive ? "password" : "text", value: String(values[field.id] ?? ""), onChange: e => setValues(v => ({ ...v, [field.id]: e.target.value })) })] }, field.id))] }); }
