import { useState } from "react";
import {
  validateAdminApiKeyCreateRequest,
  validateAdminApiKeyScopeUpdate,
  type AdminApiKeyCreateRequest,
  type AdminApiKeyScopeUpdate,
  type AdminScopeGroup,
} from "../core";
import { AdminScopePicker } from "./AdminScopePicker";

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
  onSubmit: (
    request: AdminApiKeyCreateRequest | AdminApiKeyScopeUpdate,
  ) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

interface ExpiryOption {
  label: string;
  value: number | null;
}

const EXPIRY_OPTIONS: readonly ExpiryOption[] = [
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
  { label: "Never", value: null },
];

/** Stable string key for the expiry <select> (numbers and the `null` sentinel). */
const expiryKey = (value: number | null): string =>
  value === null ? "never" : String(value);

/**
 * The one form behind both built-in credential flows. In `create` mode it
 * collects a name, an expiry, and scopes and emits an `AdminApiKeyCreateRequest`;
 * in `edit` mode it changes scopes only and emits an `AdminApiKeyScopeUpdate` —
 * saving never re-issues a secret, which the copy makes explicit.
 */
export function AdminApiKeyForm({
  mode,
  scopeGroups,
  pending,
  initialName,
  initialExpiresInDays,
  initialScopes,
  minimumScopeCount = 0,
  onSubmit,
  onCancel,
  submitLabel,
}: AdminApiKeyFormProps) {
  const [name, setName] = useState(initialName ?? "");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(
    initialExpiresInDays === undefined ? 90 : initialExpiresInDays,
  );
  const [scopes, setScopes] = useState<string[]>([...(initialScopes ?? [])]);

  const scopeSummary = `${scopes.length} ${scopes.length === 1 ? "scope" : "scopes"} selected`;
  const resolvedSubmitLabel =
    submitLabel ?? (mode === "create" ? "Create API key" : "Save changes");
  const requiredScopeCount = Math.max(0, minimumScopeCount);
  const scopeRequirementUnmet = scopes.length < requiredScopeCount;
  const submitDisabled = pending || (mode === "create" && !name.trim()) || scopeRequirementUnmet;

  const submit = () => {
    if (mode === "create") {
      void onSubmit(
        validateAdminApiKeyCreateRequest({ name, expiresInDays, scopes }),
      );
    } else {
      void onSubmit(validateAdminApiKeyScopeUpdate({ scopes }));
    }
  };

  return (
    <div className="admin-kit__key-form">
      {mode === "create" ? (
        <>
          <p className="admin-kit__key-form-intro">
            Name the credential, choose how long it should live, and pick the
            scopes it may use. These settings apply to the key you&apos;re about
            to create.
          </p>
          <div className="admin-kit__key-form-grid">
            <label className="admin-kit__field">
              <span className="admin-kit__field-label">Name</span>
              <input
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. CI deploy"
                type="text"
                value={name}
              />
            </label>
            <label className="admin-kit__field">
              <span className="admin-kit__field-label">Expires</span>
              <select
                disabled={pending}
                onChange={(event) => {
                  const next = EXPIRY_OPTIONS.find(
                    (option) => expiryKey(option.value) === event.target.value,
                  );
                  if (next) setExpiresInDays(next.value);
                }}
                value={expiryKey(expiresInDays)}
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={expiryKey(option.value)} value={expiryKey(option.value)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <p className="admin-kit__key-form-note">
          <strong>Scopes only.</strong> Saving updates what this key can do and
          takes effect immediately — it does <strong>not</strong> issue a new
          secret, and the key keeps working. To replace the secret, rotate the
          key instead.
        </p>
      )}

      <div>
        <p className="admin-kit__key-form-legend">
          Scopes <span>— what this key is allowed to do</span>
        </p>
        <AdminScopePicker
          disabled={pending}
          groups={scopeGroups}
          onChange={setScopes}
          value={scopes}
        />
      </div>

      <div className="admin-kit__key-form-footer">
        <p aria-live="polite">
          {scopeSummary}
          {mode === "create"
            ? " · the secret is shown once, right after you create the key."
            : " · saving changes permissions only — the secret is unchanged."}
          {scopeRequirementUnmet
            ? ` Select at least ${requiredScopeCount} ${requiredScopeCount === 1 ? "scope" : "scopes"} to continue.`
            : null}
        </p>
        <div className="admin-kit__key-form-actions">
          {onCancel ? (
            <button
              className="admin-kit__button"
              disabled={pending}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          ) : null}
          <button
            className="admin-kit__button admin-kit__button--primary"
            disabled={submitDisabled}
            onClick={submit}
            type="button"
          >
            {resolvedSubmitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
