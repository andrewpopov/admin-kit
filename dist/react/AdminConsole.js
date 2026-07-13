"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminConsole = AdminConsole;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
/**
 * A controlled admin shell. It intentionally has no router, data client, or
 * authorization dependency: the host determines navigation, supplies panels,
 * and enforces every action on the server.
 */
function AdminConsole({ activeSection, sections, onSectionChange, ariaLabel = 'Administration sections', className, }) {
    const idBase = (0, react_1.useId)();
    const active = sections.find((section) => section.id === activeSection) ?? sections[0];
    if (!active) {
        throw new Error('AdminConsole needs at least one rendered section.');
    }
    const tabId = (sectionId) => `${idBase}-tab-${sectionId}`;
    const panelId = (sectionId) => `${idBase}-panel-${sectionId}`;
    return ((0, jsx_runtime_1.jsxs)("section", { className: ['admin-kit', className].filter(Boolean).join(' '), children: [(0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, className: "admin-kit__navigation", children: (0, jsx_runtime_1.jsx)("div", { role: "tablist", "aria-orientation": "horizontal", className: "admin-kit__tabs", children: sections.map((section) => {
                        const selected = section.id === active.id;
                        return ((0, jsx_runtime_1.jsx)("button", { "aria-controls": panelId(section.id), "aria-selected": selected, className: "admin-kit__tab", disabled: section.disabled, id: tabId(section.id), onClick: () => onSectionChange(section.id), role: "tab", type: "button", children: section.label }, section.id));
                    }) }) }), (0, jsx_runtime_1.jsx)("div", { "aria-labelledby": tabId(active.id), className: "admin-kit__panel", id: panelId(active.id), role: "tabpanel", children: active.render() })] }));
}
