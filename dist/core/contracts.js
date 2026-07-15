"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_CAPABILITIES = void 0;
exports.defineAdminConsole = defineAdminConsole;
exports.defineAdminPortal = defineAdminPortal;
exports.defineAdminApp = defineAdminApp;
exports.normalizeAdminFailure = normalizeAdminFailure;
/**
 * The generic administration workflows Admin Kit owns. A host may still add
 * product-specific sections, but it must not register a generic workflow more
 * than once under different local names.
 */
exports.ADMIN_CAPABILITIES = [
    'users',
    'sessions',
    'logs',
    'events',
    'feature-flags',
    'api-keys',
    'memberships',
    'backups',
    'operational-jobs',
    'settings',
];
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
/**
 * Validates grouped, router-neutral portal metadata. Section IDs are globally
 * unique because the host maps them to routes independently of their group.
 */
function defineAdminPortal(definition) {
    if (definition.groups.length === 0) {
        throw new Error('An admin portal needs at least one section group.');
    }
    const groupIds = new Set();
    const sectionIds = new Set();
    const groups = definition.groups.map((group) => {
        if (!group.id.trim())
            throw new Error('Admin section group IDs must not be empty.');
        if (!group.label.trim())
            throw new Error(`Admin section group ${group.id} needs a label.`);
        if (groupIds.has(group.id))
            throw new Error(`Duplicate admin section group ID: ${group.id}.`);
        if (group.sections.length === 0) {
            throw new Error(`Admin section group ${group.id} needs at least one section.`);
        }
        groupIds.add(group.id);
        const sections = group.sections.map((section) => {
            if (!section.id.trim())
                throw new Error('Admin section IDs must not be empty.');
            if (!section.label.trim())
                throw new Error(`Admin section ${section.id} needs a label.`);
            if (sectionIds.has(section.id))
                throw new Error(`Duplicate admin section ID: ${section.id}.`);
            sectionIds.add(section.id);
            return Object.freeze({ ...section });
        });
        return Object.freeze({ ...group, sections: Object.freeze(sections) });
    });
    return Object.freeze({ groups: Object.freeze(groups) });
}
/**
 * Defines the canonical registry for a host administration area. It keeps the
 * portal router-neutral while making duplicate generic workflows a definition
 * error rather than a later migration surprise.
 */
function defineAdminApp(definition) {
    defineAdminPortal(definition);
    const capabilities = new Set();
    for (const group of definition.groups) {
        for (const section of group.sections) {
            const isCustomCapability = section.capability.startsWith('custom:')
                && section.capability.slice('custom:'.length).trim().length > 0;
            if (!isCustomCapability && !exports.ADMIN_CAPABILITIES.includes(section.capability)) {
                throw new Error(`Unknown admin capability: ${section.capability}.`);
            }
            if (capabilities.has(section.capability)) {
                throw new Error(`Duplicate admin capability: ${section.capability}.`);
            }
            capabilities.add(section.capability);
        }
    }
    return Object.freeze({
        groups: Object.freeze(definition.groups.map((group) => Object.freeze({
            ...group,
            sections: Object.freeze(group.sections.map((section) => Object.freeze({ ...section }))),
        }))),
    });
}
/** Normalizes arbitrary transport failures without coupling the package to fetch or an API envelope. */
function normalizeAdminFailure(error) {
    if (error instanceof Error) {
        return { message: error.message || 'The administration request failed.', retryable: true };
    }
    return { message: 'The administration request failed.', retryable: true };
}
