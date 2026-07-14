"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminEventsAdapter = defineAdminEventsAdapter;
exports.validateAdminEventsPage = validateAdminEventsPage;
function defineAdminEventsAdapter(adapter) {
    return Object.freeze({
        ...adapter,
        categories: adapter.categories ? Object.freeze([...adapter.categories]) : undefined,
        severities: adapter.severities ? Object.freeze([...adapter.severities]) : undefined,
        outcomes: adapter.outcomes ? Object.freeze([...adapter.outcomes]) : undefined,
    });
}
function validateAdminEventsPage(page) {
    const ids = new Set();
    for (const event of page.items) {
        if (!event.id.trim())
            throw new Error("Admin event IDs must not be empty.");
        if (!event.occurredAt.trim())
            throw new Error(`Admin event ${event.id} needs a timestamp.`);
        if (!event.category.trim() || !event.action.trim() || !event.message.trim()) {
            throw new Error(`Admin event ${event.id} needs category, action, and message.`);
        }
        if (ids.has(event.id))
            throw new Error(`Duplicate admin event ID: ${event.id}.`);
        ids.add(event.id);
    }
    return Object.freeze({
        ...page,
        items: Object.freeze(page.items.map((event) => Object.freeze({
            ...event,
            actor: event.actor ? Object.freeze({ ...event.actor }) : undefined,
            resource: event.resource ? Object.freeze({ ...event.resource }) : undefined,
            metadata: event.metadata ? Object.freeze({ ...event.metadata }) : undefined,
        }))),
        source: page.source ? Object.freeze({ ...page.source }) : undefined,
    });
}
