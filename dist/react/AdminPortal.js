"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPortal = AdminPortal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminSkipLink_1 = require("./AdminSkipLink");
const AdminThemeContext_1 = require("./AdminThemeContext");
/**
 * A grouped shell for routed administration areas. The host owns URLs,
 * navigation, and authorization; the portal owns grouping, selection,
 * responsive layout, disabled behavior, and accessible page semantics.
 */
function AdminPortal({ activeSection, groups, onSectionChange, renderNavigationItem, ariaLabel = "Administration sections", mobileNavigationLabel = "Menu", className, emptyState = "No administration sections are available.", inactiveSectionState, }) {
    if (!renderNavigationItem && !onSectionChange) {
        throw new Error("AdminPortal default navigation needs onSectionChange.");
    }
    const [mobileNavigationOpen, setMobileNavigationOpen] = (0, react_1.useState)(false);
    const mobileNavigationId = `admin-kit-portal-navigation-${(0, react_1.useId)().replace(/:/g, "")}`;
    const toggleRef = (0, react_1.useRef)(null);
    // An AdminApp skip link targets this id; standalone portals mint their own.
    const ownContentId = `admin-kit-content-${(0, react_1.useId)().replace(/:/g, "")}`;
    const contentId = (0, AdminSkipLink_1.useAdminContentTargetId)() ?? ownContentId;
    const closeMobileNavigation = () => {
        setMobileNavigationOpen(false);
        toggleRef.current?.focus();
    };
    const closeOnEscape = (event) => {
        if (event.key === "Escape" && mobileNavigationOpen)
            closeMobileNavigation();
    };
    const closeOnNavigate = (event) => {
        const target = event.target.closest("a, button");
        if (!mobileNavigationOpen || !target || target.matches('[aria-disabled="true"], :disabled')) {
            return;
        }
        closeMobileNavigation();
    };
    const visibleGroups = groups
        .filter((group) => group.visible !== false)
        .map((group) => ({
        ...group,
        sections: group.sections.filter((section) => section.visible !== false),
    }))
        .filter((group) => group.sections.length > 0);
    const sections = visibleGroups.flatMap((group) => group.sections);
    const active = sections.find((section) => section.id === activeSection);
    // One section leaves nothing to navigate to: no rail, no Menu toggle, content at full width.
    const hasNavigation = sections.length > 1;
    if (!active) {
        return ((0, jsx_runtime_1.jsx)("section", { className: ["admin-kit", "admin-kit--theme-core", "admin-kit__portal-empty", className]
                .filter(Boolean)
                .join(" "), "data-admin-kit-theme": "core", id: contentId, tabIndex: -1, children: (0, jsx_runtime_1.jsx)(AdminSkipLink_1.AdminContentTargetReset, { children: sections.length === 0
                    ? emptyState
                    : (inactiveSectionState?.(activeSection) ??
                        "This administration section is unavailable.") }) }));
    }
    return ((0, jsx_runtime_1.jsx)(AdminSkipLink_1.AdminContentTargetReset, { children: (0, jsx_runtime_1.jsx)(AdminThemeContext_1.AdminThemeProvider, { theme: "core", children: (0, jsx_runtime_1.jsxs)("section", { className: [
                    "admin-kit",
                    "admin-kit--theme-core",
                    "admin-kit__portal",
                    hasNavigation ? null : "admin-kit__portal--single",
                    className,
                ]
                    .filter(Boolean)
                    .join(" "), "data-admin-kit-theme": "core", children: [hasNavigation ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { "aria-controls": mobileNavigationId, "aria-expanded": mobileNavigationOpen, className: "admin-kit__app-shell-mobile-toggle", onClick: () => setMobileNavigationOpen((open) => !open), onKeyDown: closeOnEscape, ref: toggleRef, type: "button", children: mobileNavigationLabel }), (0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, className: "admin-kit__portal-navigation", "data-open": mobileNavigationOpen ? "" : undefined, id: mobileNavigationId, onClick: closeOnNavigate, onKeyDown: closeOnEscape, children: visibleGroups.map((group) => ((0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__portal-group", children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__portal-group-header", children: [(0, jsx_runtime_1.jsx)("p", { className: "admin-kit__portal-group-label", children: group.label }), group.description ? (0, jsx_runtime_1.jsx)("p", { children: group.description }) : null] }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__portal-list", children: group.sections.map((section) => {
                                                const isActive = section.id === active.id;
                                                const onClick = (event) => {
                                                    if (section.disabled) {
                                                        event.preventDefault();
                                                        return;
                                                    }
                                                    onSectionChange?.(section.id);
                                                };
                                                const navigationProps = {
                                                    section,
                                                    active: isActive,
                                                    className: "admin-kit__portal-link",
                                                    ariaCurrent: isActive ? "page" : undefined,
                                                    ariaDisabled: section.disabled ? true : undefined,
                                                    tabIndex: section.disabled ? -1 : undefined,
                                                    onClick,
                                                };
                                                return ((0, jsx_runtime_1.jsx)("li", { children: renderNavigationItem ? (renderNavigationItem(navigationProps)) : ((0, jsx_runtime_1.jsxs)("button", { "aria-current": navigationProps.ariaCurrent, className: navigationProps.className, disabled: section.disabled, onClick: onClick, type: "button", children: [(0, jsx_runtime_1.jsx)("span", { children: section.label }), section.description ? (0, jsx_runtime_1.jsx)("small", { children: section.description }) : null] })) }, section.id));
                                            }) })] }, group.id))) })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__portal-content", "data-admin-section": active.id, id: contentId, tabIndex: -1, children: active.render() })] }) }) }));
}
