"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAdminTimestamp = formatAdminTimestamp;
/**
 * Values are contractually ISO-8601 (`YYYY-MM-DD`, optionally followed by a
 * `T` or space time component). `new Date(value)` validity alone is not a
 * safe gate here: V8 happily parses many short, non-ISO strings as valid
 * dates (e.g. `new Date("2")` is a valid date in year 2001), which would
 * silently mangle a host's own pre-formatted short value.
 */
const ISO_8601_SHAPE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
/** Matches a bare `YYYY-MM-DD` value with no time component. */
const DATE_ONLY_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;
/**
 * Formats a host-supplied timestamp for display without breaking hosts that
 * already deliver human-readable strings (e.g. "2 days ago", "never").
 *
 * Only values that both look like ISO-8601 and parse as a valid date are
 * reformatted; anything else is returned unchanged, byte-for-byte. A host
 * may pass `format` to fully control presentation (e.g. to add a timezone
 * label or relative phrasing); the override always receives the raw value.
 */
function formatAdminTimestamp(value, format) {
    if (format)
        return format(value);
    if (!ISO_8601_SHAPE.test(value))
        return value;
    const dateOnlyMatch = DATE_ONLY_SHAPE.exec(value);
    if (dateOnlyMatch) {
        // A date-only value has no timezone: format the calendar date the host
        // wrote, without letting `new Date(value)`'s UTC-midnight parse plus
        // local rendering shift it to the previous day west of UTC.
        const [, year, month, day] = dateOnlyMatch;
        const yearNum = Number(year);
        const monthNum = Number(month);
        const dayNum = Number(day);
        const date = new Date(yearNum, monthNum - 1, dayNum);
        // The Date constructor silently normalizes out-of-range components
        // (e.g. 2026-02-31 rolls forward to March 3, month 00/13 rolls into an
        // adjacent year) instead of producing an invalid date. Round-trip the
        // constructed date's own year/month/day back against the parsed
        // components to catch that case; NaN alone is not a sufficient guard.
        if (Number.isNaN(date.getTime()) ||
            date.getFullYear() !== yearNum ||
            date.getMonth() !== monthNum - 1 ||
            date.getDate() !== dayNum) {
            return value;
        }
        return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}
