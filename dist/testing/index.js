"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminPageFixture = createAdminPageFixture;
/** Builds a stable page fixture for adapter and consumer-shaped tests. */
function createAdminPageFixture(items, page = 1, pageSize = items.length) {
    return Object.freeze({
        items: Object.freeze([...items]),
        page,
        pageSize,
        total: items.length,
    });
}
