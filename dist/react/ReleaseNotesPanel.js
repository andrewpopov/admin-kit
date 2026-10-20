"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseNotesPanel = ReleaseNotesPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const releaseNotes_1 = require("../core/releaseNotes");
const AdminPanelState_1 = require("./AdminPanelState");
const AdminTheme_1 = require("./AdminTheme");
function dateLabel(value) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}
/** Mount in the product's signed-in shell, without an AdminApp or an admin-role gate. */
function ReleaseNotesPanel({ adapter, releaseId, hrefForRelease, listHref, renderNotes, renderLink = (href, children) => (0, jsx_runtime_1.jsx)("a", { href: href, children: children }), pageSize = 10, title = "What's new", }) {
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
        throw new Error("Invalid release page size.");
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
    return ((0, jsx_runtime_1.jsx)(AdminTheme_1.AdminTheme, { children: (0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__release-notes", "aria-label": title, children: [releaseId !== undefined ? ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__release-back", children: renderLink(listHref, "All updates") })) : null, view.kind === "loading" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading release notes…", skeletonRows: 3 } })) : null, view.kind === "error" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                        kind: "error",
                        title: "Couldn't load release notes",
                        detail: "Try again in a moment.",
                        onRetry: () => setRetry((value) => value + 1),
                    } })) : null, view.kind === "missing" ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                        kind: "empty",
                        title: "Release notes not found",
                        detail: "Choose another update from the history.",
                    } })) : null, view.kind === "detail" ? ((0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("time", { className: "admin-kit__release-date", dateTime: view.data.releasedAt, children: dateLabel(view.data.releasedAt) }), (0, jsx_runtime_1.jsxs)("h2", { children: [view.data.product, " ", view.data.version] }), (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__release-summary", children: view.data.summary }), (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__release-body", children: renderNotes(view.data.notesMarkdown) })] })) : null, view.kind === "list" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [view.data.items.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: {
                                kind: "empty",
                                title: "No updates yet",
                                detail: "Release notes will appear here when an update ships.",
                            } })) : ((0, jsx_runtime_1.jsx)("ol", { className: "admin-kit__release-list", children: view.data.items.map((note) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("time", { className: "admin-kit__release-date", dateTime: note.releasedAt, children: dateLabel(note.releasedAt) }), (0, jsx_runtime_1.jsxs)("h2", { children: [note.product, " ", note.version] }), (0, jsx_runtime_1.jsx)("p", { children: note.summary }), renderLink(hrefForRelease(note.id), "Full release notes")] }) }, note.id))) })), page > 1 || view.data.hasMore ? ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__release-paging", "aria-label": "Release history pages", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "admin-kit__button", disabled: page === 1, onClick: () => setPage((value) => value - 1), children: "Newer" }), (0, jsx_runtime_1.jsxs)("span", { "aria-live": "polite", children: ["Page ", page] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "admin-kit__button", disabled: !view.data.hasMore, onClick: () => setPage((value) => value + 1), children: "Older" })] })) : null] })) : null] }) }));
}
