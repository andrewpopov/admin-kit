import { type ReactNode } from "react";
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
    /** px. Omit on one column to make it fill the width the sized columns leave. */
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    /** One line with an ellipsis; pair with `title` and `renderDetails` so the full value stays reachable. */
    truncate?: boolean;
    title?: (row: Row) => string | undefined;
    className?: string;
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
    /** Marks a row's `<tr>` aria-busy, for rows with a pending action. */
    rowBusy?: (row: Row) => boolean;
    /** Content for a full-width row under the row, shown while it returns a value; the caller controls when. */
    renderExpansion?: (row: Row) => ReactNode;
    rowLabel?: (row: Row) => string;
    className?: string;
    wrapClassName?: string;
}
/** Resizable, sticky-header data table; below 48rem rows become labelled cards. */
export declare function AdminDataTable<Row>({ columns, rows, rowKey, label, storageKey, busy, renderDetails, detailsLabel, rowBusy, renderExpansion, rowLabel, className, wrapClassName, }: AdminDataTableProps<Row>): import("react").JSX.Element;
