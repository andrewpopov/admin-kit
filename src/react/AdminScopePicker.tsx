"use client";
import type { AdminScopeGroup } from "../core";

export interface AdminScopePickerProps {
  groups: readonly AdminScopeGroup[];
  /** The controlled selection: scope values in host-meaningful order. */
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * A controlled, grouped scope selector for host-owned credential forms. The
 * host supplies the vocabulary (`AdminScopeGroup[]`) and owns the selection
 * state; the picker only reports the next selection. Toggling a scope on
 * appends it to the current selection; toggling it off removes it, so a
 * host's existing ordering is preserved.
 */
export function AdminScopePicker({
  groups,
  value,
  onChange,
  disabled,
  className,
}: AdminScopePickerProps) {
  const selected = new Set(value);
  const knownScopes = new Set(groups.flatMap((group) => group.scopes.map((scope) => scope.value)));
  const unmatchedScopes = value.filter((scope) => !knownScopes.has(scope));
  const toggle = (scope: string) => {
    if (disabled) return;
    onChange(
      selected.has(scope) ? value.filter((candidate) => candidate !== scope) : [...value, scope],
    );
  };
  return (
    <div className={["admin-kit__scope-picker", className].filter(Boolean).join(" ")}>
      {groups.map((group) => {
        const groupValues = group.scopes.map((scope) => scope.value);
        const groupSet = new Set(groupValues);
        const selectedCount = groupValues.filter((candidate) => selected.has(candidate)).length;
        const allSelected = group.scopes.length > 0 && selectedCount === group.scopes.length;
        const toggleGroup = () => {
          if (disabled) return;
          onChange(
            allSelected
              ? value.filter((candidate) => !groupSet.has(candidate))
              : [...value, ...groupValues.filter((candidate) => !selected.has(candidate))],
          );
        };
        return (
          <fieldset className="admin-kit__scope-group" disabled={disabled} key={group.id}>
            <legend className="admin-kit__scope-group-legend">{group.label}</legend>
            <div className="admin-kit__scope-group-header">
              {group.description ? (
                <p className="admin-kit__scope-group-description">{group.description}</p>
              ) : null}
              <span aria-hidden="true" className="admin-kit__scope-group-count">
                {selectedCount}/{group.scopes.length}
              </span>
              {group.scopes.length > 0 ? (
                <button
                  className="admin-kit__scope-group-toggle"
                  disabled={disabled}
                  type="button"
                  onClick={toggleGroup}
                >
                  {allSelected ? `Select none in ${group.label}` : `Select all in ${group.label}`}
                </button>
              ) : null}
            </div>
            <ul className="admin-kit__scope-options">
              {group.scopes.map((scope) => {
                const checked = selected.has(scope.value);
                return (
                  <li key={scope.value}>
                    <label
                      className="admin-kit__scope-option"
                      data-selected={checked ? "true" : undefined}
                    >
                      <input
                        checked={checked}
                        disabled={disabled}
                        type="checkbox"
                        value={scope.value}
                        onChange={() => toggle(scope.value)}
                      />
                      <span className="admin-kit__scope-option-copy">
                        <span className="admin-kit__scope-option-label">{scope.label}</span>
                        <code className="admin-kit__scope-option-value">{scope.value}</code>
                        {scope.description ? (
                          <span className="admin-kit__scope-option-description">
                            {scope.description}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
      {unmatchedScopes.length ? (
        <fieldset className="admin-kit__scope-group" disabled={disabled}>
          <legend className="admin-kit__scope-group-legend">Existing scopes</legend>
          <p className="admin-kit__scope-group-description">
            These scopes are not part of the current vocabulary. Keep or remove them explicitly.
          </p>
          <ul className="admin-kit__scope-options">
            {unmatchedScopes.map((scope) => (
              <li key={scope}>
                <label className="admin-kit__scope-option" data-selected="true">
                  <input
                    checked
                    disabled={disabled}
                    type="checkbox"
                    value={scope}
                    onChange={() => toggle(scope)}
                  />
                  <span className="admin-kit__scope-option-copy">
                    <span className="admin-kit__scope-option-label">Existing scope</span>
                    <code className="admin-kit__scope-option-value">{scope}</code>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
    </div>
  );
}
