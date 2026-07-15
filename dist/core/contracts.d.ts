/** A namespaced identifier for a section rendered by a host admin console. */
export type AdminSectionId = string;
/**
 * Router- and UI-independent section metadata. Applications retain control
 * of URL construction and route transitions; admin-kit only needs a stable ID.
 */
export interface AdminSectionDefinition {
    id: AdminSectionId;
    label: string;
    description?: string;
    disabled?: boolean;
}
export interface AdminConsoleDefinition {
    sections: readonly AdminSectionDefinition[];
}
export interface AdminPortalSectionDefinition extends AdminSectionDefinition {
    /** Host-computed capability visibility. This is presentation, never authorization. */
    visible?: boolean;
}
export interface AdminSectionGroupDefinition {
    id: string;
    label: string;
    description?: string;
    /** Host-computed capability visibility. Hidden groups are not rendered. */
    visible?: boolean;
    sections: readonly AdminPortalSectionDefinition[];
}
export interface AdminPortalDefinition {
    groups: readonly AdminSectionGroupDefinition[];
}
/**
 * The generic administration workflows Admin Kit owns. A host may still add
 * product-specific sections, but it must not register a generic workflow more
 * than once under different local names.
 */
export declare const ADMIN_CAPABILITIES: readonly ["users", "sessions", "logs", "events", "feature-flags", "api-keys", "memberships", "backups", "operational-jobs", "settings"];
export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];
export interface AdminAppSectionDefinition extends AdminPortalSectionDefinition {
    /** The workflow this route exposes; this is the consumer's migration registry. */
    capability: AdminCapability;
}
export interface AdminAppGroupDefinition extends Omit<AdminSectionGroupDefinition, 'sections'> {
    sections: readonly AdminAppSectionDefinition[];
}
export interface AdminAppDefinition {
    groups: readonly AdminAppGroupDefinition[];
}
/**
 * Validates configuration at definition time so ambiguous navigation never
 * reaches the UI. Empty section registries and duplicate IDs are programming
 * errors, not recoverable runtime states.
 */
export declare function defineAdminConsole(definition: AdminConsoleDefinition): AdminConsoleDefinition;
/**
 * Validates grouped, router-neutral portal metadata. Section IDs are globally
 * unique because the host maps them to routes independently of their group.
 */
export declare function defineAdminPortal(definition: AdminPortalDefinition): AdminPortalDefinition;
/**
 * Defines the canonical registry for a host administration area. It keeps the
 * portal router-neutral while making duplicate generic workflows a definition
 * error rather than a later migration surprise.
 */
export declare function defineAdminApp(definition: AdminAppDefinition): AdminAppDefinition;
export interface AdminPageQuery {
    page?: number;
    pageSize?: number;
    search?: string;
}
export interface AdminPage<T> {
    items: readonly T[];
    page: number;
    pageSize: number;
    total: number;
}
export interface AdminAdapterFailure {
    message: string;
    retryable: boolean;
    code?: string;
}
/** Normalizes arbitrary transport failures without coupling the package to fetch or an API envelope. */
export declare function normalizeAdminFailure(error: unknown): AdminAdapterFailure;
