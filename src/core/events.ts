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

export function defineAdminEventsAdapter(adapter: AdminEventsAdapter): AdminEventsAdapter {
  return Object.freeze({
    ...adapter,
    categories: adapter.categories ? Object.freeze([...adapter.categories]) : undefined,
    severities: adapter.severities ? Object.freeze([...adapter.severities]) : undefined,
    outcomes: adapter.outcomes ? Object.freeze([...adapter.outcomes]) : undefined,
  });
}

export function validateAdminEventsPage(page: AdminEventsPage): AdminEventsPage {
  const ids = new Set<string>();
  for (const event of page.items) {
    if (!event.id.trim()) throw new Error("Admin event IDs must not be empty.");
    if (!event.occurredAt.trim()) throw new Error(`Admin event ${event.id} needs a timestamp.`);
    if (!event.category.trim() || !event.action.trim() || !event.message.trim()) {
      throw new Error(`Admin event ${event.id} needs category, action, and message.`);
    }
    if (ids.has(event.id)) throw new Error(`Duplicate admin event ID: ${event.id}.`);
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
