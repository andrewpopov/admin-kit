import { type AdminApiKeyCreateRequest, type AdminApiKeyScopeUpdate, type AdminScopeGroup } from "../core";
export interface AdminApiKeyFormProps {
    /** `create` shows name + expiry; `edit` is scopes-only with a Cancel action. */
    mode: "create" | "edit";
    scopeGroups: readonly AdminScopeGroup[];
    /** Disables every control while the owning panel's mutation is in flight. */
    pending: boolean;
    initialName?: string;
    initialExpiresInDays?: number | null;
    initialScopes?: readonly string[];
    /** Minimum scopes required before this form can be submitted. Defaults to zero. */
    minimumScopeCount?: number;
    onSubmit: (request: AdminApiKeyCreateRequest | AdminApiKeyScopeUpdate) => void | Promise<void>;
    onCancel?: () => void;
    submitLabel?: string;
}
/**
 * The one form behind both built-in credential flows. In `create` mode it
 * collects a name, an expiry, and scopes and emits an `AdminApiKeyCreateRequest`;
 * in `edit` mode it changes scopes only and emits an `AdminApiKeyScopeUpdate` —
 * saving never re-issues a secret, which the copy makes explicit.
 */
export declare function AdminApiKeyForm({ mode, scopeGroups, pending, initialName, initialExpiresInDays, initialScopes, minimumScopeCount, onSubmit, onCancel, submitLabel, }: AdminApiKeyFormProps): import("react").JSX.Element;
