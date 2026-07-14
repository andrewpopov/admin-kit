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
  permissions?: { canRevoke?: boolean };
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
  revoke?: AdminSessionMutation<{ sessionId: string }>;
  bulkRevoke?: AdminSessionBulkAction;
}

function requireText(value: string, description: string): void {
  if (!value.trim()) throw new Error(`${description} must not be empty.`);
}

export function defineAdminSessionsAdapter<Session extends AdminSessionSummary = AdminSessionSummary>(
  adapter: AdminSessionsAdapter<Session>,
): AdminSessionsAdapter<Session> {
  requireText(adapter.scope.id, "Session scope id");
  requireText(adapter.scope.label, "Session scope label");
  requireText(adapter.scope.kind, "Session scope kind");
  if (adapter.bulkRevoke) {
    requireText(adapter.bulkRevoke.label, "Bulk session action label");
    requireText(adapter.bulkRevoke.confirmTitle, "Bulk session confirmation title");
    requireText(adapter.bulkRevoke.confirmDescription, "Bulk session confirmation description");
  }
  return Object.freeze({ ...adapter, scope: Object.freeze({ ...adapter.scope }) });
}

export function validateAdminSessions<Session extends AdminSessionSummary>(
  sessions: readonly Session[],
): readonly Session[] {
  const ids = new Set<string>();
  return Object.freeze(sessions.map((session) => {
    requireText(session.id, "Session id");
    requireText(session.label, `Session ${session.id} label`);
    requireText(session.createdAt, `Session ${session.id} created timestamp`);
    if (ids.has(session.id)) throw new Error(`Duplicate active session: ${session.id}.`);
    ids.add(session.id);
    const details = session.details?.map((detail) => {
      requireText(detail.label, `Session ${session.id} detail label`);
      requireText(detail.value, `Session ${session.id} detail ${detail.label}`);
      return Object.freeze({ ...detail });
    });
    return Object.freeze({
      ...session,
      details: details ? Object.freeze(details) : undefined,
      permissions: session.permissions ? Object.freeze({ ...session.permissions }) : undefined,
    }) as Session;
  }));
}
