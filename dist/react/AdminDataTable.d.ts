import { type ReactNode } from "react";
import { type AdminDataTableColumnPriority } from "./adminDataTableFit";
export type { AdminDataTableColumnPriority } from "./adminDataTableFit";
export interface AdminDataTableColumn<Row> {
    id: string;
    /** Accessible column name; also the resize handle name. */
    header: string;
    /** Visible heading and phone-card label when it needs more than the plain `header` text. */
    headerContent?: ReactNode;
    headerClassName?: string;
    /** Turns the heading into a sort button and sets `aria-sort`. */
    sort?: {
        direction: "ascending" | "descending" | "none";
        onSort: () => void;
    };
    cell: (row: Row) => ReactNode;
    /** px. A preferred width that shrinks to `minWidth` to fit the container. Omit on one column to make it fill the width the sized columns leave. */
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    /** px. The fill column's (no `defaultWidth`) preferred width, default 280: sized columns shrink toward their `minWidth` before it drops below this. */
    fillWidth?: number;
    resizable?: boolean;
    /** One line with an ellipsis; pair with `title` and `renderDetails` so the full value stays reachable. */
    truncate?: boolean;
    title?: (row: Row) => string | undefined;
    className?: string;
    /** Hides tertiary, then secondary, columns before anything scrolls. Default primary. */
    priority?: AdminDataTableColumnPriority;
    /** Where the cell sits in a stacked card; cells without a slot keep the label/value layout. */
    cardSlot?: "title" | "badge" | "meta" | "detail" | "actions";
}
export interface AdminDataTableProps<Row> {
    columns: readonly AdminDataTableColumn<Row>[];
    rows: readonly Row[];
    rowKey: (row: Row) => string;
    label?: string;
    /** Persists column widths per viewer in localStorage. */
    storageKey?: string;
    busy?: boolean;
    /** Adds a disclosure column whose button expands a full-width row with this content. */
    renderDetails?: (row: Row) => ReactNode;
    detailsLabel?: string;
    /** Controls which `renderDetails` rows are open; omit to let the table keep that state. */
    expandedKeys?: readonly string[];
    onExpandedChange?: (keys: readonly string[]) => void;
    /** Marks a row's `<tr>` aria-busy, for rows with a pending action. */
    rowBusy?: (row: Row) => boolean;
    /** Content for a full-width row under the row, shown while it returns a value; the caller controls when. */
    renderExpansion?: (row: Row) => ReactNode;
    rowLabel?: (row: Row) => string;
    className?: string;
    wrapClassName?: string;
    /** Sizes the table to the viewport (its top down to what sits below it, such as pagination and the frame's padding) so it scrolls itself under a pinned header and the page does not. Stacked cards keep the page flow. */
    fill?: boolean;
}
/** Resizable, sticky-header data table that fits its container: columns shrink, low-priority ones hide, and rows become cards when the primary columns cannot fit. */
export declare function AdminDataTable<Row>({ columns, rows, rowKey, label, storageKey, busy, renderDetails, detailsLabel, expandedKeys, onExpandedChange, rowBusy, renderExpansion, rowLabel, className, wrapClassName, fill, }: AdminDataTableProps<Row>): import("react").JSX.Element;
