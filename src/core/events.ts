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

const ADMIN_EVENT_SEVERITIES: readonly AdminEventSeverity[] = ["info", "warning", "error"];
const ADMIN_EVENT_OUTCOMES: readonly AdminEventOutcome[] = ["success", "failure", "unknown"];

export function validateAdminEventsPage(page: AdminEventsPage): AdminEventsPage {
  if (!Number.isInteger(page.total) || page.total < page.items.length) {
    throw new Error(
      "Admin events page total must be an integer at least as large as the returned items.",
    );
  }
  if (!Number.isInteger(page.page) || page.page < 1) {
    throw new Error("Admin events page number must be a positive integer.");
  }
  if (!Number.isInteger(page.pageSize) || page.pageSize < 1) {
    throw new Error("Admin events page size must be a positive integer.");
  }
  if (page.items.length > page.pageSize) {
    throw new Error("Admin events page cannot return more items than its page size.");
  }

  const ids = new Set<string>();
  for (const event of page.items) {
    if (!event.id.trim()) throw new Error("Admin event IDs must not be empty.");
    if (!event.occurredAt.trim()) throw new Error(`Admin event ${event.id} needs a timestamp.`);
    if (!event.category.trim() || !event.action.trim() || !event.message.trim()) {
      throw new Error(`Admin event ${event.id} needs category, action, and message.`);
    }
    if (!ADMIN_EVENT_SEVERITIES.includes(event.severity)) {
      throw new Error(`Admin event ${event.id} has an invalid severity.`);
    }
    if (!ADMIN_EVENT_OUTCOMES.includes(event.outcome)) {
      throw new Error(`Admin event ${event.id} has an invalid outcome.`);
    }
    if (ids.has(event.id)) throw new Error(`Duplicate admin event ID: ${event.id}.`);
    ids.add(event.id);
  }
  return Object.freeze({
    ...page,
    items: Object.freeze(
      page.items.map((event) =>
        Object.freeze({
          ...event,
          actor: event.actor ? Object.freeze({ ...event.actor }) : undefined,
          resource: event.resource ? Object.freeze({ ...event.resource }) : undefined,
          metadata: event.metadata ? Object.freeze({ ...event.metadata }) : undefined,
        }),
      ),
    ),
    source: page.source ? Object.freeze({ ...page.source }) : undefined,
  });
}
