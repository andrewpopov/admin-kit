"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersPanel = UsersPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminPanelState_1 = require("./AdminPanelState");
/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
function UsersPanel({ adapter, pageSize = 25, query, renderUserActions, }) {
    const [page, setPage] = (0, react_1.useState)(1);
    const [result, setResult] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [pendingUserId, setPendingUserId] = (0, react_1.useState)();
    const load = async () => {
        setError(undefined);
        try {
            setResult(await adapter.list({ ...query, page, pageSize }));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load users.");
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
    }, [adapter, page, pageSize, query?.search]);
    const updateRole = async (userId, role) => {
        if (!adapter.setRole)
            return;
        setPendingUserId(userId);
        setError(undefined);
        try {
            await adapter.setRole.execute({ userId, role });
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to update the user role.");
        }
        finally {
            setPendingUserId(undefined);
        }
    };
    const updateStatus = async (userId, status) => {
        if (!adapter.setStatus)
            return;
        setPendingUserId(userId);
        setError(undefined);
        try {
            await adapter.setStatus.execute({ userId, status });
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to update the user status.");
        }
        finally {
            setPendingUserId(undefined);
        }
    };
    if (error) {
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } });
    }
    if (!result) {
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading users…" } });
    }
    if (result.items.length === 0) {
        return (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No users found." } });
    }
    const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
    return ((0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__users", "aria-label": "Users", children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__users-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Users" }), (0, jsx_runtime_1.jsxs)("p", { children: [result.total, " ", result.total === 1 ? "user" : "users"] })] }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__users-list", children: result.items.map((user) => ((0, jsx_runtime_1.jsxs)("li", { className: "admin-kit__user", "aria-busy": pendingUserId === user.id, children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__user-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: user.label }), user.secondaryLabel ? (0, jsx_runtime_1.jsx)("span", { children: user.secondaryLabel }) : null, user.badges?.length ? (0, jsx_runtime_1.jsx)("span", { children: user.badges.join(" · ") }) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__user-controls", children: [adapter.roles?.length && adapter.setRole && user.role ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Role" }), (0, jsx_runtime_1.jsx)("select", { "aria-label": `Role for ${user.label}`, disabled: pendingUserId === user.id, value: user.role.value, onChange: (event) => void updateRole(user.id, event.target.value), children: adapter.roles.map((role) => (0, jsx_runtime_1.jsx)("option", { value: role.value, children: role.label }, role.value)) })] })) : null, adapter.statuses?.length && adapter.setStatus && user.status ? ((0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Status" }), (0, jsx_runtime_1.jsx)("select", { "aria-label": `Status for ${user.label}`, disabled: pendingUserId === user.id, value: user.status.value, onChange: (event) => void updateStatus(user.id, event.target.value), children: adapter.statuses.map((status) => (0, jsx_runtime_1.jsx)("option", { value: status.value, children: status.label }, status.value)) })] })) : null, renderUserActions ? renderUserActions(user) : null] })] }, user.id))) }), pageCount > 1 ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": "User pagination", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page <= 1, onClick: () => setPage(page - 1), children: "Previous" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page, " of ", pageCount] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page >= pageCount, onClick: () => setPage(page + 1), children: "Next" })] })) : null] }));
}
