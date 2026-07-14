export interface AdminSessionScope {
    id: string;
    label: string;
    kind: string;
}
export interface AdminSessionDetail {
    label: string;
    value: string;
}
/** Safe presentation data for one active host-owned session. */
export interface AdminSessionSummary {
    id: string;
    label: string;
    secondaryLabel?: string;
    createdAt: string;
    lastSeenAt?: string | null;
    expiresAt?: string | null;
    current?: boolean;
    details?: readonly AdminSessionDetail[];
    permissions?: {
        canRevoke?: boolean;
    };
}
export interface AdminSessionMutation<Input> {
    execute(input: Input): Promise<void>;
}
export interface AdminSessionBulkAction {
    label: string;
    confirmTitle: string;
    confirmDescription: string;
    execute(): Promise<void>;
}
export interface AdminSessionsAdapter<Session extends AdminSessionSummary = AdminSessionSummary> {
    scope: AdminSessionScope;
    list(): Promise<readonly Session[]>;
    revoke?: AdminSessionMutation<{
        sessionId: string;
    }>;
    bulkRevoke?: AdminSessionBulkAction;
}
export declare function defineAdminSessionsAdapter<Session extends AdminSessionSummary = AdminSessionSummary>(adapter: AdminSessionsAdapter<Session>): AdminSessionsAdapter<Session>;
export declare function validateAdminSessions<Session extends AdminSessionSummary>(sessions: readonly Session[]): readonly Session[];
