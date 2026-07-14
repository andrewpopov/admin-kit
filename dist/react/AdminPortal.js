"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPortal = AdminPortal;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * A grouped shell for routed administration areas. The host owns URLs,
 * navigation, and authorization; the portal owns grouping, selection,
 * responsive layout, disabled behavior, and accessible page semantics.
 */
function AdminPortal({ activeSection, groups, onSectionChange, renderNavigationItem, ariaLabel = 'Administration sections', className, emptyState = 'No administration sections are available.', inactiveSectionState, }) {
    if (!renderNavigationItem && !onSectionChange) {
        throw new Error('AdminPortal default navigation needs onSectionChange.');
    }
    const visibleGroups = groups
        .filter((group) => group.visible !== false)
        .map((group) => ({
        ...group,
        sections: group.sections.filter((section) => section.visible !== false),
    }))
        .filter((group) => group.sections.length > 0);
    const sections = visibleGroups.flatMap((group) => group.sections);
    const active = sections.find((section) => section.id === activeSection);
    if (!active) {
        return ((0, jsx_runtime_1.jsx)("section", { className: ['admin-kit', 'admin-kit__portal-empty', className].filter(Boolean).join(' '), children: sections.length === 0 ? emptyState : inactiveSectionState?.(activeSection) ?? 'This administration section is unavailable.' }));
    }
    return ((0, jsx_runtime_1.jsxs)("section", { className: ['admin-kit', 'admin-kit__portal', className].filter(Boolean).join(' '), children: [(0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, className: "admin-kit__portal-navigation", children: visibleGroups.map((group) => ((0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__portal-group", children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__portal-group-header", children: [(0, jsx_runtime_1.jsx)("p", { className: "admin-kit__portal-group-label", children: group.label }), group.description ? (0, jsx_runtime_1.jsx)("p", { children: group.description }) : null] }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__portal-list", children: group.sections.map((section) => {
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
                                    className: 'admin-kit__portal-link',
                                    ariaCurrent: isActive ? 'page' : undefined,
                                    ariaDisabled: section.disabled ? true : undefined,
                                    tabIndex: section.disabled ? -1 : undefined,
                                    onClick,
                                };
                                return ((0, jsx_runtime_1.jsx)("li", { children: renderNavigationItem ? (renderNavigationItem(navigationProps)) : ((0, jsx_runtime_1.jsxs)("button", { "aria-current": navigationProps.ariaCurrent, className: navigationProps.className, disabled: section.disabled, onClick: onClick, type: "button", children: [(0, jsx_runtime_1.jsx)("span", { children: section.label }), section.description ? (0, jsx_runtime_1.jsx)("small", { children: section.description }) : null] })) }, section.id));
                            }) })] }, group.id))) }), (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__portal-content", "data-admin-section": active.id, children: active.render() })] }));
}
