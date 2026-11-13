"use client";
import { useAdminBandFocus } from "./AdminPanelHeader";

export interface AdminFilterChipProps {
  /** The applied filter, such as "Severity: Error". */
  label: string;
  onRemove: () => void;
  /** Accessible name of the remove button. Defaults to "Remove filter: <label>". */
  removeLabel?: string;
}

/** A removable applied-filter chip; inside a collapsed band, removing it returns focus to the band's toggle. */
export function AdminFilterChip({ label, onRemove, removeLabel }: AdminFilterChipProps) {
  const focusToggle = useAdminBandFocus();
  return (
    <span className="admin-kit__filter-chip">
      <span>{label}</span>
      <button
        aria-label={removeLabel ?? `Remove filter: ${label}`}
        onClick={() => {
          onRemove();
          focusToggle();
        }}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}
