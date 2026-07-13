import type { AdminPage } from '../core/contracts';

/** Builds a stable page fixture for adapter and consumer-shaped tests. */
export function createAdminPageFixture<T>(items: readonly T[], page = 1, pageSize = items.length): AdminPage<T> {
  return Object.freeze({
    items: Object.freeze([...items]),
    page,
    pageSize,
    total: items.length,
  });
}
