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
export const ADMIN_CAPABILITIES = [
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
] as const;

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

/**
 * Validates grouped, router-neutral portal metadata. Section IDs are globally
 * unique because the host maps them to routes independently of their group.
 */
export function defineAdminPortal(definition: AdminPortalDefinition): AdminPortalDefinition {
  if (definition.groups.length === 0) {
    throw new Error('An admin portal needs at least one section group.');
  }

  const groupIds = new Set<string>();
  const sectionIds = new Set<string>();
  const groups = definition.groups.map((group) => {
    if (!group.id.trim()) throw new Error('Admin section group IDs must not be empty.');
    if (!group.label.trim()) throw new Error(`Admin section group ${group.id} needs a label.`);
    if (groupIds.has(group.id)) throw new Error(`Duplicate admin section group ID: ${group.id}.`);
    if (group.sections.length === 0) {
      throw new Error(`Admin section group ${group.id} needs at least one section.`);
    }
    groupIds.add(group.id);

    const sections = group.sections.map((section) => {
      if (!section.id.trim()) throw new Error('Admin section IDs must not be empty.');
      if (!section.label.trim()) throw new Error(`Admin section ${section.id} needs a label.`);
      if (sectionIds.has(section.id)) throw new Error(`Duplicate admin section ID: ${section.id}.`);
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
export function defineAdminApp(definition: AdminAppDefinition): AdminAppDefinition {
  defineAdminPortal(definition);

  const capabilities = new Set<AdminCapability>();
  for (const group of definition.groups) {
    for (const section of group.sections) {
      if (!ADMIN_CAPABILITIES.includes(section.capability)) {
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
