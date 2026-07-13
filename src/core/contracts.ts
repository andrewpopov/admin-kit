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

/**
 * Validates configuration at definition time so ambiguous navigation never
 * reaches the UI. Empty section registries and duplicate IDs are programming
 * errors, not recoverable runtime states.
 */
export function defineAdminConsole(definition: AdminConsoleDefinition): AdminConsoleDefinition {
  if (definition.sections.length === 0) {
    throw new Error('An admin console needs at least one section.');
  }

  const ids = new Set<string>();
  for (const section of definition.sections) {
    if (!section.id.trim()) throw new Error('Admin section IDs must not be empty.');
    if (!section.label.trim()) throw new Error(`Admin section ${section.id} needs a label.`);
    if (ids.has(section.id)) throw new Error(`Duplicate admin section ID: ${section.id}.`);
    ids.add(section.id);
  }

  return Object.freeze({
    sections: Object.freeze(definition.sections.map((section) => Object.freeze({ ...section }))),
  });
}

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
export function normalizeAdminFailure(error: unknown): AdminAdapterFailure {
  if (error instanceof Error) {
    return { message: error.message || 'The administration request failed.', retryable: true };
  }

  return { message: 'The administration request failed.', retryable: true };
}
