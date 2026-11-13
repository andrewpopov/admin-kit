export interface AdminFilterChipProps {
    /** The applied filter, such as "Severity: Error". */
    label: string;
    onRemove: () => void;
    /** Accessible name of the remove button. Defaults to "Remove filter: <label>". */
    removeLabel?: string;
}
/** A removable applied-filter chip; inside a collapsed band, removing it returns focus to the band's toggle. */
export declare function AdminFilterChip({ label, onRemove, removeLabel }: AdminFilterChipProps): import("react").JSX.Element;
