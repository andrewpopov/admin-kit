import type { AdminPage } from '../core/contracts';
/** Builds a stable page fixture for adapter and consumer-shaped tests. */
export declare function createAdminPageFixture<T>(items: readonly T[], page?: number, pageSize?: number): AdminPage<T>;
