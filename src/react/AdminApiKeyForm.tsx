"use client";
import { useState } from "react";
import {
  validateAdminApiKeyCreateRequest,
  validateAdminApiKeyScopeUpdate,
  type AdminApiKeyCreateRequest,
  type AdminApiKeyScopeUpdate,
  type AdminScopeGroup,
} from "../core";
import { useAdminMessages } from "./AdminLabels";
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
  onSubmit: (request: AdminApiKeyCreateRequest | AdminApiKeyScopeUpdate) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  /** Host vocabulary for the credential being created or edited. */
  itemNoun?: string;
}

const EXPIRY_OPTIONS = [
  { label: "days30", value: 30 },
  { label: "days90", value: 90 },
  { label: "days365", value: 365 },
  { label: "never", value: null },
] as const;

/** Stable string key for the expiry <select> (numbers and the `null` sentinel). */
const expiryKey = (value: number | null): string => (value === null ? "never" : String(value));

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
  itemNoun,
}: AdminApiKeyFormProps) {
  const [name, setName] = useState(initialName ?? "");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(
    initialExpiresInDays === undefined ? 90 : initialExpiresInDays,
  );
  const [scopes, setScopes] = useState<string[]>([...(initialScopes ?? [])]);

  const { messages, locale } = useAdminMessages();
  const form = messages.apiKeyForm;
  const noun = itemNoun ?? form.defaultNoun;
  const resolvedSubmitLabel =
    submitLabel ?? (mode === "create" ? form.createSubmit(itemNoun) : form.saveChanges);
  const requiredScopeCount = Math.max(0, minimumScopeCount);
  const scopeRequirementUnmet = scopes.length < requiredScopeCount;
  const submitDisabled = pending || (mode === "create" && !name.trim()) || scopeRequirementUnmet;

  const submit = () => {
    if (mode === "create") {
      void onSubmit(validateAdminApiKeyCreateRequest({ name, expiresInDays, scopes }));
    } else {
      void onSubmit(validateAdminApiKeyScopeUpdate({ scopes }));
    }
  };

  return (
    <div className="admin-kit__key-form">
      {mode === "create" ? (
        <>
          <p className="admin-kit__key-form-intro">{form.createIntro(itemNoun)}</p>
          <div className="admin-kit__key-form-grid">
            <label className="admin-kit__field">
              <span className="admin-kit__field-label">{form.nameLabel}</span>
              <input
                disabled={pending}
                onChange={(event) => setName(event.target.value)}
                placeholder={form.namePlaceholder}
                type="text"
                value={name}
              />
            </label>
            <label className="admin-kit__field">
              <span className="admin-kit__field-label">{form.expiresLabel}</span>
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
                    {form.expiry[option.label]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      ) : (
        <p className="admin-kit__key-form-note">
          <strong>{form.editNoteLead}</strong> {form.editNoteBeforeNot(noun)}{" "}
          <strong>{form.editNoteNot}</strong> {form.editNoteAfterNot(noun)}
        </p>
      )}

      <div>
        <p className="admin-kit__key-form-legend">
          {form.scopesLegend} <span>{form.scopesLegendHint(noun)}</span>
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
          {form.scopesSelected(scopes.length, locale)}
          {mode === "create" ? form.createFooter(noun) : form.editFooter}
          {scopeRequirementUnmet ? form.scopesRequired(requiredScopeCount, locale) : null}
        </p>
        <div className="admin-kit__key-form-actions">
          {onCancel ? (
            <button
              className="admin-kit__button"
              disabled={pending}
              onClick={onCancel}
              type="button"
            >
              {messages.common.cancel}
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
