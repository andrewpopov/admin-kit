import { type ReactNode } from "react";
export interface AdminDataTableColumn<Row> {
    id: string;
    header: string;
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
    rowLabel?: (row: Row) => string;
    className?: string;
    wrapClassName?: string;
}
/** Resizable, sticky-header data table; below 48rem rows become labelled cards. */
export declare function AdminDataTable<Row>({ columns, rows, rowKey, label, storageKey, busy, renderDetails, detailsLabel, rowLabel, className, wrapClassName, }: AdminDataTableProps<Row>): import("react").JSX.Element;
