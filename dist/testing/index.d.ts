import type { AdminPage } from "../core/contracts";
/**
 * Builds a stable page fixture for adapter and consumer-shaped tests.
 *
 * Defaults to a single, complete page (`total = items.length`) when `total`
 * is omitted. Pass `total` explicitly to model a page drawn from a larger
 * collection (e.g. page 2 of 10 total) — `items.length` alone cannot express
 * that a later page exists, so an explicit `total` smaller than what `page`
 * and `pageSize` imply is rejected rather than silently producing an
 * inconsistent fixture.
 */
export declare function createAdminPageFixture<T>(items: readonly T[], page?: number, pageSize?: number, total?: number): AdminPage<T>;
