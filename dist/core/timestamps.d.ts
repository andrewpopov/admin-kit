/**
 * Formats a host-supplied timestamp for display without breaking hosts that
 * already deliver human-readable strings (e.g. "2 days ago", "never").
 *
 * Only values that both look like ISO-8601 and parse as a valid date are
 * reformatted; anything else is returned unchanged, byte-for-byte. A host
 * may pass `format` to fully control presentation (e.g. to add a timezone
 * label or relative phrasing); the override always receives the raw value.
 */
export declare function formatAdminTimestamp(value: string, format?: (iso: string) => string): string;
