export type AdminDataTableColumnPriority = "primary" | "secondary" | "tertiary";

export const DEFAULT_MIN_WIDTH = 64;
export const DEFAULT_MAX_WIDTH = 960;
export const DETAILS_COLUMN_WIDTH = 96;
/** Below this container width a stacked card puts each label above its value. */
export const NARROW_CARD_WIDTH = 340;
const FILL_MIN_WIDTH = DEFAULT_MIN_WIDTH * 3;

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

/** Columns hidden at each step, cheapest information first. */
const HIDE_STEPS: readonly (readonly AdminDataTableColumnPriority[])[] = [
  [],
  ["tertiary"],
  ["tertiary", "secondary"],
];

export function columnBounds(column: Pick<FitColumn, "minWidth" | "maxWidth">) {
  return {
    min: column.minWidth ?? DEFAULT_MIN_WIDTH,
    max: column.maxWidth ?? DEFAULT_MAX_WIDTH,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function minimumOf(column: FitColumn) {
  return column.defaultWidth === undefined
    ? (column.minWidth ?? FILL_MIN_WIDTH)
    : columnBounds(column).min;
}

function preferredOf(column: FitColumn) {
  if (column.defaultWidth === undefined) return undefined;
  const { min, max } = columnBounds(column);
  return clamp(column.override ?? column.defaultWidth, min, max);
}

function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Resolves which columns show and how wide they are inside a container.
 * `defaultWidth` is a preferred width that shrinks to `minWidth`; tertiary then
 * secondary columns hide before anything scrolls, and only when the primary
 * columns still do not fit does the table stack. An unmeasured container shows
 * everything at its preferred width.
 */
export function resolveTableFit(
  containerWidth: number | undefined,
  columns: readonly FitColumn[],
  reservedWidth = 0,
): TableFit {
  const available = containerWidth === undefined ? Infinity : containerWidth - reservedWidth;
  const visible =
    HIDE_STEPS.map((hidden) =>
      columns.filter((column) => !hidden.includes(column.priority ?? "primary")),
    ).find((candidate) => sum(candidate.map(minimumOf)) <= available) ?? columns;
  const stacked = sum(visible.map(minimumOf)) > available;

  const overridden = visible.filter((column) => column.override !== undefined);
  const fixedWidth = sum(overridden.map((column) => preferredOf(column) ?? 0));
  const flexible = visible.filter((column) => column.override === undefined);
  const flexibleMinimum = sum(flexible.map(minimumOf));
  const scrolls = !stacked && fixedWidth + flexibleMinimum > available;

  const preferred = flexible.map((column) => preferredOf(column) ?? minimumOf(column));
  const room = available - fixedWidth;
  const deficit = Math.max(0, sum(preferred) - room);
  const slack = flexible.map((column, index) =>
    column.defaultWidth === undefined ? 0 : Math.max(0, (preferred[index] ?? 0) - minimumOf(column)),
  );
  const slackTotal = sum(slack);
  const reduction = (index: number) => {
    const own = slack[index] ?? 0;
    if (scrolls || stacked) return own;
    return slackTotal === 0 ? 0 : Math.ceil((own / slackTotal) * deficit);
  };

  const widths: Record<string, number> = {};
  for (const column of overridden) widths[column.id] = preferredOf(column) ?? 0;
  flexible.forEach((column, index) => {
    if (column.defaultWidth === undefined) return;
    widths[column.id] = Math.max(
      minimumOf(column),
      (preferred[index] ?? 0) - reduction(index),
    );
  });

  const minTableWidth =
    sum(visible.map((column) => widths[column.id] ?? minimumOf(column))) + reservedWidth;
  return { visibleIds: visible.map((column) => column.id), widths, minTableWidth, stacked, scrolls };
}
