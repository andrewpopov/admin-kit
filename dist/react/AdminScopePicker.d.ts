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
export declare function AdminScopePicker({ groups, value, onChange, disabled, className, }: AdminScopePickerProps): import("react").JSX.Element;
