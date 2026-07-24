"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApiKeyForm = AdminApiKeyForm;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminScopePicker_1 = require("./AdminScopePicker");
const EXPIRY_OPTIONS = [
    { label: "30 days", value: 30 },
    { label: "90 days", value: 90 },
    { label: "365 days", value: 365 },
    { label: "Never", value: null },
];
/** Stable string key for the expiry <select> (numbers and the `null` sentinel). */
const expiryKey = (value) => (value === null ? "never" : String(value));
/**
 * The one form behind both built-in credential flows. In `create` mode it
 * collects a name, an expiry, and scopes and emits an `AdminApiKeyCreateRequest`;
 * in `edit` mode it changes scopes only and emits an `AdminApiKeyScopeUpdate` —
 * saving never re-issues a secret, which the copy makes explicit.
 */
function AdminApiKeyForm({ mode, scopeGroups, pending, initialName, initialExpiresInDays, initialScopes, minimumScopeCount = 0, onSubmit, onCancel, submitLabel, }) {
    const [name, setName] = (0, react_1.useState)(initialName ?? "");
    const [expiresInDays, setExpiresInDays] = (0, react_1.useState)(initialExpiresInDays === undefined ? 90 : initialExpiresInDays);
    const [scopes, setScopes] = (0, react_1.useState)([...(initialScopes ?? [])]);
    const scopeSummary = `${scopes.length} ${scopes.length === 1 ? "scope" : "scopes"} selected`;
    const resolvedSubmitLabel = submitLabel ?? (mode === "create" ? "Create API key" : "Save changes");
    const requiredScopeCount = Math.max(0, minimumScopeCount);
    const scopeRequirementUnmet = scopes.length < requiredScopeCount;
    const submitDisabled = pending || (mode === "create" && !name.trim()) || scopeRequirementUnmet;
    const submit = () => {
        if (mode === "create") {
            void onSubmit((0, core_1.validateAdminApiKeyCreateRequest)({ name, expiresInDays, scopes }));
        }
        else {
            void onSubmit((0, core_1.validateAdminApiKeyScopeUpdate)({ scopes }));
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-form", children: [mode === "create" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("p", { className: "admin-kit__key-form-intro", children: "Name the credential, choose how long it should live, and pick the scopes it may use. These settings apply to the key you're about to create." }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-form-grid", children: [(0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__field", children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__field-label", children: "Name" }), (0, jsx_runtime_1.jsx)("input", { disabled: pending, onChange: (event) => setName(event.target.value), placeholder: "e.g. CI deploy", type: "text", value: name })] }), (0, jsx_runtime_1.jsxs)("label", { className: "admin-kit__field", children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__field-label", children: "Expires" }), (0, jsx_runtime_1.jsx)("select", { disabled: pending, onChange: (event) => {
                                            const next = EXPIRY_OPTIONS.find((option) => expiryKey(option.value) === event.target.value);
                                            if (next)
                                                setExpiresInDays(next.value);
                                        }, value: expiryKey(expiresInDays), children: EXPIRY_OPTIONS.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: expiryKey(option.value), children: option.label }, expiryKey(option.value)))) })] })] })] })) : ((0, jsx_runtime_1.jsxs)("p", { className: "admin-kit__key-form-note", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Scopes only." }), " Saving updates what this key can do and takes effect immediately \u2014 it does ", (0, jsx_runtime_1.jsx)("strong", { children: "not" }), " issue a new secret, and the key keeps working. To replace the secret, rotate the key instead."] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("p", { className: "admin-kit__key-form-legend", children: ["Scopes ", (0, jsx_runtime_1.jsx)("span", { children: "\u2014 what this key is allowed to do" })] }), (0, jsx_runtime_1.jsx)(AdminScopePicker_1.AdminScopePicker, { disabled: pending, groups: scopeGroups, onChange: setScopes, value: scopes })] }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-form-footer", children: [(0, jsx_runtime_1.jsxs)("p", { "aria-live": "polite", children: [scopeSummary, mode === "create"
                                ? " · the secret is shown once, right after you create the key."
                                : " · saving changes permissions only — the secret is unchanged.", scopeRequirementUnmet
                                ? ` Select at least ${requiredScopeCount} ${requiredScopeCount === 1 ? "scope" : "scopes"} to continue.`
                                : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-form-actions", children: [onCancel ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", disabled: pending, onClick: onCancel, type: "button", children: "Cancel" })) : null, (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", disabled: submitDisabled, onClick: submit, type: "button", children: resolvedSubmitLabel })] })] })] }));
}
