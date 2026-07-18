"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminScopePicker = AdminScopePicker;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * A controlled, grouped scope selector for host-owned credential forms. The
 * host supplies the vocabulary (`AdminScopeGroup[]`) and owns the selection
 * state; the picker only reports the next selection. Toggling a scope on
 * appends it to the current selection; toggling it off removes it, so a
 * host's existing ordering is preserved.
 */
function AdminScopePicker({ groups, value, onChange, disabled, className, }) {
    const selected = new Set(value);
    const toggle = (scope) => {
        if (disabled)
            return;
        onChange(selected.has(scope)
            ? value.filter((candidate) => candidate !== scope)
            : [...value, scope]);
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: ["admin-kit__scope-picker", className].filter(Boolean).join(" "), children: groups.map((group) => {
            const groupValues = group.scopes.map((scope) => scope.value);
            const groupSet = new Set(groupValues);
            const selectedCount = groupValues.filter((candidate) => selected.has(candidate)).length;
            const allSelected = group.scopes.length > 0 && selectedCount === group.scopes.length;
            const toggleGroup = () => {
                if (disabled)
                    return;
                onChange(allSelected
                    ? value.filter((candidate) => !groupSet.has(candidate))
                    : [...value, ...groupValues.filter((candidate) => !selected.has(candidate))]);
            };
            return ((0, jsx_runtime_1.jsxs)("fieldset", { className: "admin-kit__scope-group", disabled: disabled, children: [(0, jsx_runtime_1.jsx)("legend", { className: "admin-kit__scope-group-legend", children: group.label }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__scope-group-header", children: [group.description ? ((0, jsx_runtime_1.jsx)("p", { className: "admin-kit__scope-group-description", children: group.description })) : null, (0, jsx_runtime_1.jsxs)("span", { "aria-hidden": "true", className: "admin-kit__scope-group-count", children: [selectedCount, "/", group.scopes.length] }), group.scopes.length > 0 ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__scope-group-toggle", disabled: disabled, type: "button", onClick: toggleGroup, children: allSelected ? `Select none in ${group.label}` : `Select all in ${group.label}` })) : null] }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__scope-options", children: group.scopes.map((scope) => {
                            const checked = selected.has(scope.value);
                            return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__scope-option", "data-selected": checked ? "true" : undefined, children: [(0, jsx_runtime_1.jsx)("input", { checked: checked, disabled: disabled, type: "checkbox", value: scope.value, onChange: () => toggle(scope.value) }), (0, jsx_runtime_1.jsxs)("span", { className: "admin-kit__scope-option-copy", children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__scope-option-label", children: scope.label }), (0, jsx_runtime_1.jsx)("code", { className: "admin-kit__scope-option-value", children: scope.value }), scope.description ? ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__scope-option-description", children: scope.description })) : null] })] }) }, scope.value));
                        }) })] }, group.id));
        }) }));
}
