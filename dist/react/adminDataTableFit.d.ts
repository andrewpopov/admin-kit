export type AdminDataTableColumnPriority = "primary" | "secondary" | "tertiary";
export declare const DEFAULT_MIN_WIDTH = 64;
export declare const DEFAULT_MAX_WIDTH = 960;
export declare const DETAILS_COLUMN_WIDTH = 96;
export interface FitColumn {
    id: string;
    priority?: AdminDataTableColumnPriority;
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    /** A viewer-resized width; unlike `defaultWidth` it never shrinks to fit. */
    override?: number;
}
export interface TableFit {
    visibleIds: readonly string[];
    /** Rendered px width per sized visible column; fill columns have none. */
    widths: Readonly<Record<string, number>>;
    /** The smallest width the visible columns can render at. */
    minTableWidth: number;
    /** Primary columns do not fit the container: render each row as a card. */
    stacked: boolean;
    /** Viewer-resized widths exceed the container: the wrap scrolls sideways. */
    scrolls: boolean;
}
export declare function columnBounds(column: Pick<FitColumn, "minWidth" | "maxWidth">): {
    min: number;
    max: number;
};
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Resolves which columns show and how wide they are inside a container.
 * `defaultWidth` is a preferred width that shrinks to `minWidth`; tertiary then
 * secondary columns hide before anything scrolls, and only when the primary
 * columns still do not fit does the table stack. An unmeasured container shows
 * everything at its preferred width.
 */
export declare function resolveTableFit(containerWidth: number | undefined, columns: readonly FitColumn[], reservedWidth?: number): TableFit;
