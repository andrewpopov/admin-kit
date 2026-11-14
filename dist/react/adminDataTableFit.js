"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FILL_WIDTH = exports.NARROW_CARD_WIDTH = exports.TIMESTAMP_COLUMN_WIDTH = exports.DETAILS_COLUMN_WIDTH = exports.DEFAULT_MAX_WIDTH = exports.DEFAULT_MIN_WIDTH = void 0;
exports.columnBounds = columnBounds;
exports.clamp = clamp;
exports.resolveTableFit = resolveTableFit;
exports.DEFAULT_MIN_WIDTH = 64;
exports.DEFAULT_MAX_WIDTH = 960;
exports.DETAILS_COLUMN_WIDTH = 96;
/** A column that holds the default `formatAdminTimestamp` text on one line: its widest form (e.g. "May 30, 2026, 12:59 AM", about 178px in the kit font) plus the cell's 2 x 16px padding. */
exports.TIMESTAMP_COLUMN_WIDTH = 216;
/** Below this container width a stacked card puts each label above its value. */
exports.NARROW_CARD_WIDTH = 340;
const FILL_MIN_WIDTH = exports.DEFAULT_MIN_WIDTH * 3;
/** The width a fill column asks for when it sets no `fillWidth`, before sized columns keep their own preferred widths. */
exports.DEFAULT_FILL_WIDTH = 280;
/** Columns hidden at each step, cheapest information first. */
const HIDE_STEPS = [
    [],
    ["tertiary"],
    ["tertiary", "secondary"],
];
function columnBounds(column) {
    return {
        min: column.minWidth ?? exports.DEFAULT_MIN_WIDTH,
        max: column.maxWidth ?? exports.DEFAULT_MAX_WIDTH,
    };
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(value)));
}
function minimumOf(column) {
    return column.defaultWidth === undefined
        ? (column.minWidth ?? FILL_MIN_WIDTH)
        : columnBounds(column).min;
}
function preferredOf(column) {
    if (column.defaultWidth === undefined)
        return undefined;
    const { min, max } = columnBounds(column);
    return clamp(column.override ?? column.defaultWidth, min, max);
}
function fillPreferredOf(column) {
    return Math.max(minimumOf(column), column.fillWidth ?? exports.DEFAULT_FILL_WIDTH);
}
function sum(values) {
    return values.reduce((total, value) => total + value, 0);
}
/**
 * Resolves which columns show and how wide they are inside a container.
 * `defaultWidth` is a preferred width that shrinks to `minWidth`; a fill column
 * prefers `fillWidth`, and sized columns shrink before it is starved; tertiary then
 * secondary columns hide before anything scrolls, and only when the primary
 * columns still do not fit does the table stack. An unmeasured container shows
 * everything at its preferred width.
 */
function resolveTableFit(containerWidth, columns, reservedWidth = 0) {
    const available = containerWidth === undefined ? Infinity : containerWidth - reservedWidth;
    const visible = HIDE_STEPS.map((hidden) => columns.filter((column) => !hidden.includes(column.priority ?? "primary"))).find((candidate) => sum(candidate.map(minimumOf)) <= available) ?? columns;
    const stacked = sum(visible.map(minimumOf)) > available;
    const overridden = visible.filter((column) => column.override !== undefined);
    const fixedWidth = sum(overridden.map((column) => preferredOf(column) ?? 0));
    const flexible = visible.filter((column) => column.override === undefined);
    const flexibleMinimum = sum(flexible.map(minimumOf));
    const scrolls = !stacked && fixedWidth + flexibleMinimum > available;
    const preferred = flexible.map((column) => preferredOf(column) ?? fillPreferredOf(column));
    const room = available - fixedWidth;
    const deficit = Math.max(0, sum(preferred) - room);
    const slack = flexible.map((column, index) => column.defaultWidth === undefined ? 0 : Math.max(0, (preferred[index] ?? 0) - minimumOf(column)));
    const slackTotal = sum(slack);
    const reduction = (index) => {
        const own = slack[index] ?? 0;
        if (scrolls || stacked)
            return own;
        return slackTotal === 0 ? 0 : Math.ceil((own / slackTotal) * deficit);
    };
    const widths = {};
    for (const column of overridden)
        widths[column.id] = preferredOf(column) ?? 0;
    flexible.forEach((column, index) => {
        if (column.defaultWidth === undefined)
            return;
        widths[column.id] = Math.max(minimumOf(column), (preferred[index] ?? 0) - reduction(index));
    });
    const minTableWidth = sum(visible.map((column) => widths[column.id] ?? minimumOf(column))) + reservedWidth;
    return { visibleIds: visible.map((column) => column.id), widths, minTableWidth, stacked, scrolls };
}
