"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminConsole = defineAdminConsole;
exports.normalizeAdminFailure = normalizeAdminFailure;
/**
 * Validates configuration at definition time so ambiguous navigation never
 * reaches the UI. Empty section registries and duplicate IDs are programming
 * errors, not recoverable runtime states.
 */
function defineAdminConsole(definition) {
    if (definition.sections.length === 0) {
        throw new Error('An admin console needs at least one section.');
    }
    const ids = new Set();
    for (const section of definition.sections) {
        if (!section.id.trim())
            throw new Error('Admin section IDs must not be empty.');
        if (!section.label.trim())
            throw new Error(`Admin section ${section.id} needs a label.`);
        if (ids.has(section.id))
            throw new Error(`Duplicate admin section ID: ${section.id}.`);
        ids.add(section.id);
    }
    return Object.freeze({
        sections: Object.freeze(definition.sections.map((section) => Object.freeze({ ...section }))),
    });
}
/** Normalizes arbitrary transport failures without coupling the package to fetch or an API envelope. */
function normalizeAdminFailure(error) {
    if (error instanceof Error) {
        return { message: error.message || 'The administration request failed.', retryable: true };
    }
    return { message: 'The administration request failed.', retryable: true };
}
