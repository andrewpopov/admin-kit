"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminConsole = AdminConsole;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
/**
 * A controlled admin shell. It intentionally has no router, data client, or
 * authorization dependency: the host determines navigation, supplies panels,
 * and enforces every action on the server.
 */
/** @deprecated Use AdminApp with grouped sections and a capability registry. */
function AdminConsole({ activeSection, sections, onSectionChange, ariaLabel = "Administration sections", className, }) {
    const idBase = (0, react_1.useId)();
    const active = sections.find((section) => section.id === activeSection) ?? sections[0];
    if (!active) {
        throw new Error("AdminConsole needs at least one rendered section.");
    }
    const tabRefs = (0, react_1.useRef)(new Map());
    const tabId = (sectionId) => `${idBase}-tab-${sectionId}`;
    const panelId = (sectionId) => `${idBase}-panel-${sectionId}`;
    const focusTab = (sectionId) => {
        tabRefs.current.get(sectionId)?.focus();
    };
    const enabledSections = () => sections.filter((section) => !section.disabled);
    const handleTabKeyDown = (event, sectionId) => {
        const focusable = enabledSections();
        if (focusable.length === 0)
            return;
        const currentIndex = focusable.findIndex((section) => section.id === sectionId);
        let nextIndex;
        switch (event.key) {
            case "ArrowRight":
                nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % focusable.length;
                break;
            case "ArrowLeft":
                nextIndex =
                    currentIndex === -1 ? 0 : (currentIndex - 1 + focusable.length) % focusable.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = focusable.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const nextSection = focusable[nextIndex];
        if (!nextSection)
            return;
        onSectionChange(nextSection.id);
        focusTab(nextSection.id);
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit", className].filter(Boolean).join(" "), children: [(0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, className: "admin-kit__navigation", children: (0, jsx_runtime_1.jsx)("div", { role: "tablist", "aria-orientation": "horizontal", className: "admin-kit__tabs", children: sections.map((section) => {
                        const selected = section.id === active.id;
                        return ((0, jsx_runtime_1.jsx)("button", { "aria-controls": panelId(section.id), "aria-selected": selected, className: "admin-kit__tab", disabled: section.disabled, id: tabId(section.id), onClick: () => onSectionChange(section.id), onKeyDown: (event) => handleTabKeyDown(event, section.id), ref: (element) => {
                                if (element)
                                    tabRefs.current.set(section.id, element);
                                else
                                    tabRefs.current.delete(section.id);
                            }, role: "tab", tabIndex: selected ? 0 : -1, type: "button", children: section.label }, section.id));
                    }) }) }), (0, jsx_runtime_1.jsx)("div", { "aria-labelledby": tabId(active.id), className: "admin-kit__panel", id: panelId(active.id), role: "tabpanel", children: active.render() })] }));
}
