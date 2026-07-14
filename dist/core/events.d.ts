import type { AdminPage, AdminPageQuery } from "./contracts";
export type AdminEventSeverity = "info" | "warning" | "error";
export type AdminEventOutcome = "success" | "failure" | "unknown";
export interface AdminEventActor {
    id?: string;
    label: string;
}
export interface AdminEventResource {
    id?: string;
    label: string;
}
/** A list-safe, host-normalized administrative event. */
export interface AdminEvent {
    id: string;
    occurredAt: string;
    category: string;
    action: string;
    message: string;
    severity: AdminEventSeverity;
    outcome: AdminEventOutcome;
    actor?: AdminEventActor;
    resource?: AdminEventResource;
    metadata?: Readonly<Record<string, string>>;
}
export interface AdminEventsQuery extends AdminPageQuery {
    category?: string;
    severity?: AdminEventSeverity;
    outcome?: AdminEventOutcome;
}
export interface AdminEventFilterOption {
    value: string;
    label: string;
}
export interface AdminEventsPage extends AdminPage<AdminEvent> {
    source?: {
        label: string;
        updatedAt?: string;
    };
}
export interface AdminEventsAdapter {
    list(query: AdminEventsQuery): Promise<AdminEventsPage>;
    categories?: readonly AdminEventFilterOption[];
    severities?: readonly AdminEventFilterOption[];
    outcomes?: readonly AdminEventFilterOption[];
}
export declare function defineAdminEventsAdapter(adapter: AdminEventsAdapter): AdminEventsAdapter;
export declare function validateAdminEventsPage(page: AdminEventsPage): AdminEventsPage;
