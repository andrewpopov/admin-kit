"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminPageFixture = createAdminPageFixture;
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
function createAdminPageFixture(items, page = 1, pageSize = items.length, total = items.length) {
    if (total < items.length) {
        throw new Error("createAdminPageFixture: total cannot be smaller than the number of items.");
    }
    const priorItems = (page - 1) * pageSize;
    if (priorItems + items.length > total) {
        throw new Error(`createAdminPageFixture: page ${page} with pageSize ${pageSize} and ${items.length} items exceeds total ${total}.`);
    }
    return Object.freeze({
        items: Object.freeze([...items]),
        page,
        pageSize,
        total,
    });
}
