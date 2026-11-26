import { mount } from "./data-table-harness";

export const chipsBand = mount(
  `React.createElement(Kit.AdminPanelHeader, {
    title: "Audit events",
    presentation: "page",
    actions: React.createElement("button", { type: "button" }, "Refresh"),
    toolbar: React.createElement("input", { "aria-label": "Search", type: "search" }),
    collapsible: {
      storageKey: "chips",
      defaultCollapsed: true,
      collapsedSummary: React.createElement(React.Fragment, null,
        React.createElement("span", null, "48,213 events"),
        ["Severity: Error (5xx)", "Outcome: Failure", "Search: /api/agent/sessions", "Category: Request"].map((label) =>
          React.createElement(Kit.AdminFilterChip, { key: label, label, onRemove() {} }))),
    },
  })`,
);
