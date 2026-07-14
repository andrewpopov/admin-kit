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
