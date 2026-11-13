"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminFrameHeadingProvider = void 0;
exports.panelHeaderCollapsible = panelHeaderCollapsible;
exports.useAdminBandFocus = useAdminBandFocus;
exports.AdminPanelHeader = AdminPanelHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const adminPanelBand_1 = require("./adminPanelBand");
const AdminFrameHeadingContext = (0, react_1.createContext)(false);
/**
 * Marks that an application frame already renders the page's `h1`, so a
 * `presentation="page"` panel title becomes an `h2` (same look) and the page
 * keeps exactly one `h1`.
 */
exports.AdminFrameHeadingProvider = AdminFrameHeadingContext.Provider;
function panelHeaderCollapsible(options, context, own) {
    if (!options)
        return undefined;
    return {
        storageKey: options.storageKey,
        defaultCollapsed: options.defaultCollapsed,
        activeCount: (own.activeCount ?? 0) + (options.activeCount ?? 0),
        collapsedSummary: options.renderCollapsedSummary && context !== undefined
            ? options.renderCollapsedSummary(context)
            : own.summary,
    };
}
const AdminBandContext = (0, react_1.createContext)(undefined);
/** Lets a control inside the collapsed summary hand focus back to the band's toggle after it acts. */
function useAdminBandFocus() {
    return (0, react_1.useContext)(AdminBandContext)?.focusToggle ?? noop;
}
function noop() { }
/**
 * One title/action band shared by standalone panels and panel-led pages.
 * Renders nothing when `presentation="none"` — see the contract documented
 * on {@link AdminPanelHeaderPresentation}.
 */
function AdminPanelHeader({ title, presentation = "section", detail, summary, actions, toolbar, collapsible, className, }) {
    const frameOwnsH1 = (0, react_1.useContext)(AdminFrameHeadingContext);
    const regionId = (0, react_1.useId)();
    const toggleRef = (0, react_1.useRef)(null);
    const [collapsed, setCollapsed] = (0, adminPanelBand_1.useBandCollapsed)(collapsible?.storageKey, collapsible?.defaultCollapsed);
    const bandFocus = (0, react_1.useMemo)(() => ({ focusToggle: () => toggleRef.current?.focus() }), []);
    if (presentation === "none")
        return null;
    const Heading = (presentation === "page" && !frameOwnsH1 ? "h1" : "h2");
    const hasRegion = Boolean(detail || summary || toolbar);
    const band = collapsible && hasRegion ? collapsible : undefined;
    const activeCount = band?.activeCount ?? 0;
    const regionContent = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [summary ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-header-summary", children: summary }) : null, toolbar ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-toolbar", children: toolbar }) : null] }));
    return ((0, jsx_runtime_1.jsxs)("header", { className: [
            "admin-kit__panel-header",
            `admin-kit__panel-header--${presentation}`,
            toolbar ? "admin-kit__panel-header--with-toolbar" : undefined,
            band ? "admin-kit__panel-header--collapsible" : undefined,
            band && collapsed ? "admin-kit__panel-header--collapsed" : undefined,
            className,
        ]
            .filter(Boolean)
            .join(" "), children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__panel-header-main", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Heading, { children: title }), band ? null : detail] }), band && collapsed ? ((0, jsx_runtime_1.jsx)(AdminBandContext.Provider, { value: bandFocus, children: (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-header-summary-line", children: band.collapsedSummary }) })) : null, actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-header-actions", children: actions }) : null, band ? ((0, jsx_runtime_1.jsxs)("button", { "aria-controls": regionId, "aria-expanded": !collapsed, className: "admin-kit__panel-header-toggle", onClick: () => setCollapsed(!collapsed), ref: toggleRef, type: "button", children: [(0, jsx_runtime_1.jsx)("svg", { "aria-hidden": "true", focusable: "false", height: "16", viewBox: "0 0 16 16", width: "16", children: (0, jsx_runtime_1.jsx)("path", { d: "M4 6l4 4 4-4", fill: "none", stroke: "currentColor", strokeWidth: "1.75" }) }), (0, jsx_runtime_1.jsx)("span", { children: collapsed ? "Show controls" : "Hide controls" }), collapsed && activeCount > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("span", { "aria-hidden": "true", children: ["(", activeCount, ")"] }), (0, jsx_runtime_1.jsxs)("span", { className: "admin-kit__visually-hidden", children: [", ", activeCount, " ", activeCount === 1 ? "filter" : "filters", " applied"] })] })) : null] })) : null] }), band ? ((0, jsx_runtime_1.jsxs)("div", { "aria-label": "Page controls", className: "admin-kit__panel-header-region", hidden: collapsed, id: regionId, role: "group", children: [detail, regionContent] })) : (regionContent)] }));
}
