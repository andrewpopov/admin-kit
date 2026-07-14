/**
 * Values are contractually ISO-8601 (`YYYY-MM-DD`, optionally followed by a
 * `T` or space time component). `new Date(value)` validity alone is not a
 * safe gate here: V8 happily parses many short, non-ISO strings as valid
 * dates (e.g. `new Date("2")` is a valid date in year 2001), which would
 * silently mangle a host's own pre-formatted short value.
 */
const ISO_8601_SHAPE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Formats a host-supplied timestamp for display without breaking hosts that
 * already deliver human-readable strings (e.g. "2 days ago", "never").
 *
 * Only values that both look like ISO-8601 and parse as a valid date are
 * reformatted; anything else is returned unchanged, byte-for-byte. A host
 * may pass `format` to fully control presentation (e.g. to add a timezone
 * label or relative phrasing); the override always receives the raw value.
 */
export function formatAdminTimestamp(
  value: string,
  format?: (iso: string) => string,
): string {
  if (format) return format(value);
  if (!ISO_8601_SHAPE.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
