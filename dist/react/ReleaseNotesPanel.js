"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseNotesPanel = ReleaseNotesPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const releaseNotes_1 = require("../core/releaseNotes");
const AdminLabels_1 = require("./AdminLabels");
const AdminPanelState_1 = require("./AdminPanelState");
const AdminTheme_1 = require("./AdminTheme");
function dateLabel(value, locale) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}
/** Mount in the product's signed-in shell, without an AdminApp or an admin-role gate. */
function ReleaseNotesPanel({ adapter, releaseId, hrefForRelease, listHref, renderNotes, renderLink = (href, children) => (0, jsx_runtime_1.jsx)("a", { href: href, children: children }), pageSize = 10, title: titleProp, }) {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
        throw new Error("Invalid release page size.");
    const { messages, locale } = (0, AdminLabels_1.useAdminMessages)();
    const title = titleProp ?? messages.releaseNotes.title;
    const [page, setPage] = (0, react_1.useState)(1);
    const [retry, setRetry] = (0, react_1.useState)(0);
    const key = JSON.stringify([releaseId, page, pageSize, retry]);
    const [state, setState] = (0, react_1.useState)({ key, kind: "loading" });
    (0, react_1.useEffect)(() => {
        let current = true;
        setState({ key, kind: "loading" });
        const load = async () => {
            try {
                if (releaseId !== undefined) {
                    const data = await adapter.get(releaseId);
                    if (current)
                        setState(data === null
                            ? { key, kind: "missing" }
                            : { key, kind: "detail", data: (0, releaseNotes_1.validateReleaseNoteDetail)(data) });
                }
                else {
                    const data = (0, releaseNotes_1.validateReleaseNotesPage)(await adapter.list({ page, pageSize }));
                    if (data.page !== page || data.pageSize !== pageSize)
                        throw new Error("Mismatched release page.");
                    if (current)
                        setState({ key, kind: "list", data });
                }
            }
            catch {
                if (current)
                    setState({ key, kind: "error" });
            }
        };
        void load();
        return () => {
            current = false;
        };
    }, [adapter, releaseId, page, pageSize, key]);
    const view = state.key === key ? state : { kind: "loading" };
    return ((0, jsx_runtime_1.jsx)(AdminTheme_1.AdminTheme, { children: (0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__release-notes", "aria-label": title, children: [releaseId !== undefined ? ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__release-back", children: renderLink(listHref, messages.releaseNotes.allUpdates) })) : null, view.kind === "loading" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: messages.releaseNotes.loading, skeletonRows: 3 } })) : null, view.kind === "error" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                        kind: "error",
                        title: messages.releaseNotes.errorTitle,
                        detail: messages.releaseNotes.errorDetail,
                        onRetry: () => setRetry((value) => value + 1),
                    } })) : null, view.kind === "missing" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                        kind: "empty",
                        title: messages.releaseNotes.missingTitle,
                        detail: messages.releaseNotes.missingDetail,
                    } })) : null, view.kind === "detail" ? ((0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("time", { className: "admin-kit__release-date", dateTime: view.data.releasedAt, children: dateLabel(view.data.releasedAt, locale) }), (0, jsx_runtime_1.jsxs)("h2", { children: [view.data.product, " ", view.data.version] }), (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__release-summary", children: view.data.summary }), (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__release-body", children: renderNotes(view.data.notesMarkdown) })] })) : null, view.kind === "list" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [view.data.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                                kind: "empty",
                                title: messages.releaseNotes.emptyTitle,
                                detail: messages.releaseNotes.emptyDetail,
                            } })) : ((0, jsx_runtime_1.jsx)("ol", { className: "admin-kit__release-list", children: view.data.items.map((note) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("time", { className: "admin-kit__release-date", dateTime: note.releasedAt, children: dateLabel(note.releasedAt, locale) }), (0, jsx_runtime_1.jsxs)("h2", { children: [note.product, " ", note.version] }), (0, jsx_runtime_1.jsx)("p", { children: note.summary }), renderLink(hrefForRelease(note.id), messages.releaseNotes.fullNotes)] }) }, note.id))) })), page > 1 || view.data.hasMore ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__release-paging", "aria-label": messages.releaseNotes.pagination, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "admin-kit__button", disabled: page === 1, onClick: () => setPage((value) => value - 1), children: messages.releaseNotes.newer }), (0, jsx_runtime_1.jsx)("span", { "aria-live": "polite", children: messages.releaseNotes.page(page, locale) }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "admin-kit__button", disabled: !view.data.hasMore, onClick: () => setPage((value) => value + 1), children: messages.releaseNotes.older })] })) : null] })) : null] }) }));
}
