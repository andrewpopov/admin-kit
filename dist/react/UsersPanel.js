"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersPanel = UsersPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
const AdminPanelState_1 = require("./AdminPanelState");
/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
function UsersPanel({ adapter, title = "Users", headerPresentation = "section", pageSize = 25, query, search: searchOptions = false, presentation = "table", columns, defaultSort, renderHeaderActions, renderUserActions, className, }) {
    const [page, setPage] = (0, react_1.useState)(1);
    const [search, setSearch] = (0, react_1.useState)(query?.search ?? "");
    const [result, setResult] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [pendingUserId, setPendingUserId] = (0, react_1.useState)();
    const [sort, setSort] = (0, react_1.useState)(defaultSort);
    const latestLoadId = (0, react_1.useRef)(0);
    const queryKey = JSON.stringify(query ?? null);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setIsLoading(true);
        setLoadError(undefined);
        try {
            const nextResult = await adapter.list({
                ...query,
                search: search || undefined,
                ...(sort ? { sort: sort.columnId, order: sort.direction } : {}),
                page,
                pageSize,
            });
            if (loadId === latestLoadId.current)
                setResult(nextResult);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setLoadError(reason instanceof Error ? reason.message : "Unable to load users.");
            }
        }
        finally {
            if (loadId === latestLoadId.current)
                setIsLoading(false);
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous page/search can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new query hasn't started yet.
        return () => { latestLoadId.current += 1; };
        // `queryKey` is a serialized snapshot of `query` so any field change
        // (not just `search`) triggers a reload; `query` itself is not used
        // directly as a dependency because hosts commonly pass a fresh object
        // each render.
    }, [adapter, page, pageSize, queryKey, search, sort?.columnId, sort?.direction]);
    (0, react_1.useEffect)(() => {
        setSearch(query?.search ?? "");
    }, [query?.search]);
    (0, react_1.useEffect)(() => {
        if (!result)
            return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (page > lastPage)
            setPage(lastPage);
    }, [result, page]);
    const setSearchAndResetPage = (value) => {
        setPage(1);
        setSearch(value);
    };
    const updateSort = (columnId) => {
        setPage(1);
        setSort((current) => ({
            columnId,
            direction: current?.columnId === columnId && current.direction === "asc" ? "desc" : "asc",
        }));
    };
    const updateRole = async (userId, role) => {
        if (!adapter.setRole)
            return;
        setPendingUserId(userId);
        setActionError(undefined);
        try {
            await adapter.setRole.execute({ userId, role });
            await load();
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to update the user role.");
        }
        finally {
            setPendingUserId(undefined);
        }
    };
    const updateStatus = async (userId, status) => {
        if (!adapter.setStatus)
            return;
        setPendingUserId(userId);
        setActionError(undefined);
        try {
            await adapter.setStatus.execute({ userId, status });
            await load();
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to update the user status.");
        }
        finally {
            setPendingUserId(undefined);
        }
    };
    const searchControl = searchOptions !== false ? ((0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__users-search", children: [(0, jsx_runtime_1.jsx)("span", { children: searchOptions.label ?? "Search users" }), (0, jsx_runtime_1.jsx)("input", { onChange: (event) => setSearchAndResetPage(event.target.value), placeholder: searchOptions.placeholder ?? "Search by name or email", type: "search", value: search })] })) : null;
    const hostHeaderActions = renderHeaderActions?.({ reload: load, isLoading });
    const headerActions = (headerPresentation === "page" && searchControl) || hostHeaderActions ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [headerPresentation === "page" ? searchControl : null, hostHeaderActions] })) : null;
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__users", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: headerActions, className: "admin-kit__users-header", detail: result ? (0, jsx_runtime_1.jsxs)("p", { children: [result.total, " ", result.total === 1 ? "user" : "users"] }) : null, presentation: headerPresentation, title: title }), headerPresentation === "section" ? searchControl : null, loadError && !result ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : !result ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading users…" } })) : result.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No users found." } })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError }) : null, presentation === "table" ? (() => {
                        if (columns?.length)
                            return (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__users-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__table admin-kit__users-table admin-kit__users-table--custom", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsx)("tr", { children: columns.map((column) => {
                                                    const direction = sort?.columnId === column.id ? sort.direction : undefined;
                                                    return (0, jsx_runtime_1.jsx)("th", { "aria-sort": column.sortable ? direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none" : undefined, className: column.headerClassName, scope: "col", children: column.sortable ? (0, jsx_runtime_1.jsxs)("button", { className: "admin-kit__sort-button", type: "button", onClick: () => updateSort(column.id), children: [column.label, (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕" })] }) : column.label }, column.id);
                                                }) }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.map((user) => (0, jsx_runtime_1.jsx)("tr", { "aria-busy": pendingUserId === user.id, children: columns.map((column) => (0, jsx_runtime_1.jsx)("td", { className: column.className, children: column.render(user, { reload: load, isPending: pendingUserId === user.id, setRole: (role) => updateRole(user.id, role), setStatus: (status) => updateStatus(user.id, status) }) }, column.id)) }, user.id)) })] }) });
                        const hasDetails = result.items.some((user) => user.details?.length);
                        const hasActions = Boolean(renderUserActions);
                        return (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__users-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: `admin-kit__table admin-kit__users-table${hasDetails ? " admin-kit__users-table--with-details" : ""}`, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "User" }), hasDetails ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Details" }) : null, (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Role" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Status" }), hasActions ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" }) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: result.items.map((user) => ((0, jsx_runtime_1.jsxs)("tr", { "aria-busy": pendingUserId === user.id, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__user-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: user.label }), user.secondaryLabel ? (0, jsx_runtime_1.jsx)("span", { children: user.secondaryLabel }) : null, user.badges?.length ? (0, jsx_runtime_1.jsx)("span", { children: user.badges.join(" · ") }) : null] }) }), hasDetails ? (0, jsx_runtime_1.jsx)("td", { children: user.details?.length ? ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__user-details", children: user.details.map((detail) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: detail.label }), (0, jsx_runtime_1.jsx)("dd", { children: detail.value })] }, detail.label))) })) : (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__user-empty", children: "\u2014" }) }) : null, (0, jsx_runtime_1.jsx)("td", { children: adapter.roles?.length && adapter.setRole && user.role && user.permissions?.canChangeRole !== false ? ((0, jsx_runtime_1.jsx)("select", { "aria-label": `Role for ${user.label}`, disabled: pendingUserId === user.id, value: user.role.value, onChange: (event) => void updateRole(user.id, event.target.value), children: adapter.roles.map((role) => (0, jsx_runtime_1.jsx)("option", { value: role.value, children: role.label }, role.value)) })) : user.role ? (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__user-value", children: user.role.label }) : null }), (0, jsx_runtime_1.jsx)("td", { children: adapter.statuses?.length && adapter.setStatus && user.status && user.permissions?.canChangeStatus !== false ? ((0, jsx_runtime_1.jsx)("select", { "aria-label": `Status for ${user.label}`, disabled: pendingUserId === user.id, value: user.status.value, onChange: (event) => void updateStatus(user.id, event.target.value), children: adapter.statuses.map((status) => (0, jsx_runtime_1.jsx)("option", { value: status.value, children: status.label }, status.value)) })) : user.status ? (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__user-value", children: user.status.label }) : null }), hasActions ? (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__user-controls", children: renderUserActions
                                                            ? renderUserActions(user, {
                                                                reload: load,
                                                                isPending: pendingUserId === user.id,
                                                            })
                                                            : null }) }) : null] }, user.id))) })] }) });
                    })() : null, Math.max(1, Math.ceil(result.total / result.pageSize)) > 1 ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": "User pagination", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page <= 1, onClick: () => setPage(page - 1), children: "Previous" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page, " of ", Math.max(1, Math.ceil(result.total / result.pageSize))] }), (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: page >= Math.max(1, Math.ceil(result.total / result.pageSize)), onClick: () => setPage(page + 1), children: "Next" })] })) : null] }))] }));
}
