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
function UsersPanel({ adapter, pageSize = 25, query, search: searchOptions = false, presentation = "table", renderHeaderActions, renderUserActions, className, }) {
    const [page, setPage] = (0, react_1.useState)(1);
    const [search, setSearch] = (0, react_1.useState)(query?.search ?? "");
    const [result, setResult] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [pendingUserId, setPendingUserId] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setIsLoading(true);
        setError(undefined);
        try {
            const nextResult = await adapter.list({
                ...query,
                search: search || undefined,
                page,
                pageSize,
            });
            if (loadId === latestLoadId.current)
                setResult(nextResult);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setError(reason instanceof Error ? reason.message : "Unable to load users.");
            }
        }
        finally {
            if (loadId === latestLoadId.current)
                setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
    }, [adapter, page, pageSize, query?.search, search]);
    (0, react_1.useEffect)(() => {
        setSearch(query?.search ?? "");
    }, [query?.search]);
    const setSearchAndResetPage = (value) => {
        setPage(1);
        setSearch(value);
    };
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
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__users", className].filter(Boolean).join(" "), "aria-label": "Users", children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__users-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Users" }), result ? (0, jsx_runtime_1.jsxs)("p", { children: [result.total, " ", result.total === 1 ? "user" : "users"] }) : null] }), renderHeaderActions ? renderHeaderActions({ reload: load, isLoading }) : null] }), searchOptions !== false ? ((0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__users-search", children: [(0, jsx_runtime_1.jsx)("span", { children: searchOptions.label ?? "Search users" }), (0, jsx_runtime_1.jsx)("input", { onChange: (event) => setSearchAndResetPage(event.target.value), placeholder: searchOptions.placeholder ?? "Search by name or email", type: "search", value: search })] })) : null, error ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } })) : !result ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading users…" } })) : result.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No users found." } })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [presentation === "table" ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__users-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__users-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "User" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Details" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Role" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Status" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.map((user) => ((0, jsx_runtime_1.jsxs)("tr", { "aria-busy": pendingUserId === user.id, children: [(0, jsx_runtime_1.jsxs)("td", { className: "admin-kit__user-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: user.label }), user.secondaryLabel ? (0, jsx_runtime_1.jsx)("span", { children: user.secondaryLabel }) : null, user.badges?.length ? (0, jsx_runtime_1.jsx)("span", { children: user.badges.join(" · ") }) : null] }), (0, jsx_runtime_1.jsx)("td", { children: user.details?.length ? ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__user-details", children: user.details.map((detail) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: detail.label }), (0, jsx_runtime_1.jsx)("dd", { children: detail.value })] }, detail.label))) })) : null }), (0, jsx_runtime_1.jsx)("td", { children: adapter.roles?.length && adapter.setRole && user.role ? ((0, jsx_runtime_1.jsx)("select", { "aria-label": `Role for ${user.label}`, disabled: pendingUserId === user.id, value: user.role.value, onChange: (event) => void updateRole(user.id, event.target.value), children: adapter.roles.map((role) => (0, jsx_runtime_1.jsx)("option", { value: role.value, children: role.label }, role.value)) })) : user.role ? (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__user-value", children: user.role.label }) : null }), (0, jsx_runtime_1.jsx)("td", { children: adapter.statuses?.length && adapter.setStatus && user.status ? ((0, jsx_runtime_1.jsx)("select", { "aria-label": `Status for ${user.label}`, disabled: pendingUserId === user.id, value: user.status.value, onChange: (event) => void updateStatus(user.id, event.target.value), children: adapter.statuses.map((status) => (0, jsx_runtime_1.jsx)("option", { value: status.value, children: status.label }, status.value)) })) : user.status ? (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__user-value", children: user.status.label }) : null }), (0, jsx_runtime_1.jsx)("td", { className: "admin-kit__user-controls", children: renderUserActions
                                                    ? renderUserActions(user, {
                                                        reload: load,
                                                        isPending: pendingUserId === user.id,
                                                    })
                                                    : null })] }, user.id))) })] }) }) : null, Math.max(1, Math.ceil(result.total / result.pageSize)) > 1 ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": "User pagination", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page <= 1, onClick: () => setPage(page - 1), children: "Previous" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page, " of ", Math.max(1, Math.ceil(result.total / result.pageSize))] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page >= Math.max(1, Math.ceil(result.total / result.pageSize)), onClick: () => setPage(page + 1), children: "Next" })] })) : null] }))] }));
}
