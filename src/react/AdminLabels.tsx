"use client";
import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";

export interface AdminLabels {
  loading: string;
  errorTitle: string;
  retry: string;
  cancel: string;
  previousPage: string;
  nextPage: string;
  skipToContent: string;
  pageStatus: (page: number, pageCount: number) => string;
}

/** Renders a count with its noun, e.g. `(3, "en")` becomes "3 scopes". */
export type AdminCountMessage = (count: number, locale?: string) => string;

export function formatAdminCount(count: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(count);
}

type PluralForms = { other: string } & Partial<
  Record<Exclude<Intl.LDMLPluralRule, "other">, string>
>;

/** Builds a count message from per-category nouns chosen by `Intl.PluralRules`. */
export function adminCountMessage(forms: PluralForms): AdminCountMessage {
  return (count, locale) => {
    const category = new Intl.PluralRules(locale).select(count);
    return `${formatAdminCount(count, locale)} ${forms[category] ?? forms.other}`;
  };
}

const scopeCount = adminCountMessage({ one: "scope", other: "scopes" });

const defaultMessageCatalog = {
  common: {
    loading: "Loading…",
    errorTitle: "Unable to load this section",
    retry: "Try again",
    cancel: "Cancel",
    previousPage: "Previous",
    nextPage: "Next",
    skipToContent: "Skip to content",
    pageStatus: (page: number, pageCount: number, locale?: string) =>
      `Page ${formatAdminCount(page, locale)} of ${formatAdminCount(pageCount, locale)}`,
    scopeCount,
  },
  dialog: { close: "Close dialog" },
  shell: {
    navigationLabel: "Administration sections",
    mobileNavigationLabel: "Browse administration",
  },
  portal: {
    mobileNavigationLabel: "Menu",
    empty: "No administration sections are available.",
    unavailable: "This administration section is unavailable.",
  },
  switch: { on: "On", off: "Off" },
  filterChip: { remove: (label: string) => `Remove filter: ${label}` },
  band: {
    showControls: "Show controls",
    hideControls: "Hide controls",
    controlsGroup: "Page controls",
    filtersApplied: (count: number, locale?: string) =>
      `, ${adminCountMessage({ one: "filter", other: "filters" })(count, locale)} applied`,
  },
  table: {
    detailsLabel: "Details",
    resizeColumn: (header: string) => `Resize ${header} column`,
    widthValue: (width: number, locale?: string) => `${formatAdminCount(width, locale)} pixels`,
    resizeHint:
      "Click for a width menu, or drag or use the arrow keys to resize. Home or double-click resets.",
    columnWidth: (header: string) => `${header} column width`,
    narrowColumn: (header: string) => `Narrow ${header} column`,
    widenColumn: (header: string) => `Widen ${header} column`,
    resetColumn: (header: string) => `Reset ${header} column width`,
    narrower: "Narrower",
    wider: "Wider",
    resetWidth: "Reset width",
    view: "View",
    hide: "Hide",
    toggleDetails: (open: boolean, detailsLabel: string, rowLabel: string, locale?: string) =>
      `${open ? "Hide" : "View"} ${detailsLabel.toLocaleLowerCase(locale)} for ${rowLabel}`,
  },
  scopePicker: {
    selectAll: (group: string) => `Select all in ${group}`,
    selectNone: (group: string) => `Select none in ${group}`,
    existingScopes: "Existing scopes",
    existingScope: "Existing scope",
    unmatchedHelp:
      "These scopes are not part of the current vocabulary. Keep or remove them explicitly.",
  },
  apiKeyForm: {
    expiry: { days30: "30 days", days90: "90 days", days365: "365 days", never: "Never" },
    createIntro: (noun?: string) =>
      noun
        ? `Name the ${noun}, choose how long it should live, and pick the scopes it may use. These settings apply to the ${noun} you're about to create.`
        : "Name the credential, choose how long it should live, and pick the scopes it may use. These settings apply to the key you're about to create.",
    nameLabel: "Name",
    namePlaceholder: "e.g. CI deploy",
    expiresLabel: "Expires",
    editNoteLead: "Scopes only.",
    editNoteBeforeNot: (noun: string) =>
      `Saving updates what this ${noun} can do and takes effect immediately — it does`,
    editNoteNot: "not",
    editNoteAfterNot: (noun: string) =>
      `issue a new secret, and the ${noun} keeps working. To replace the secret, rotate the ${noun} instead.`,
    defaultNoun: "key",
    scopesLegend: "Scopes",
    scopesLegendHint: (noun: string) => `— what this ${noun} is allowed to do`,
    scopesSelected: (count: number, locale?: string) => `${scopeCount(count, locale)} selected`,
    createFooter: (noun: string) =>
      ` · the secret is shown once, right after you create the ${noun}.`,
    editFooter: " · saving changes permissions only — the secret is unchanged.",
    scopesRequired: (count: number, locale?: string) =>
      ` Select at least ${scopeCount(count, locale)} to continue.`,
    createSubmit: (noun?: string) => `Create ${noun ?? "API key"}`,
    saveChanges: "Save changes",
  },
  users: {
    title: "Users",
    searchLabel: "Search users",
    searchPlaceholder: "Search by name or email",
    loading: "Loading users…",
    empty: "No users found.",
    loadFailed: "Unable to load users.",
    roleUpdateFailed: "Unable to update the user role.",
    statusUpdateFailed: "Unable to update the user status.",
    count: adminCountMessage({ one: "user", other: "users" }),
    detailCount: (count: number, locale?: string) =>
      `${count} ${new Intl.PluralRules(locale).select(count) === "one" ? "user" : "users"}`,
    searchChip: (search: string) => `Search: ${search}`,
    roleFor: (label: string) => `Role for ${label}`,
    statusFor: (label: string) => `Status for ${label}`,
    pagination: "User pagination",
    columns: {
      user: "User",
      details: "Details",
      role: "Role",
      status: "Status",
      actions: "Actions",
    },
  },
  events: {
    title: "Administrative events",
    refresh: "Refresh",
    search: "Search",
    all: "All",
    loading: "Loading administrative events…",
    empty: "No administrative events found.",
    loadFailed: "Unable to load administrative events.",
    details: "Details",
    total: (count: number, locale?: string) => `${formatAdminCount(count, locale)} events`,
    source: (label: string, updated?: string) =>
      `Source: ${label}${updated ? ` · updated ${updated}` : ""}`,
    actor: (label: string) => ` · actor: ${label}`,
    resource: (label: string) => ` · resource: ${label}`,
    returnedStatus: (status: number) => `returned ${status}`,
    chips: {
      search: (value: string) => `Search: ${value}`,
      category: (value: string) => `Category: ${value}`,
      severity: (value: string) => `Severity: ${value}`,
      outcome: (value: string) => `Outcome: ${value}`,
    },
    columns: {
      occurred: "Occurred",
      event: "Event",
      actor: "Actor",
      resource: "Resource",
      outcome: "Outcome",
      category: "Category",
      severity: "Severity",
      action: "Action",
      message: "Message",
    },
  },
  logs: {
    title: "Runtime logs",
    loading: "Loading runtime logs…",
    loadFailed: "Unable to load runtime logs.",
    refreshed: (count: number, locale?: string) =>
      `Refreshed: ${adminCountMessage({ one: "new log line", other: "new log lines" })(count, locale)}.`,
    refreshFailed: "Refresh failed. The previously loaded output remains available.",
    copied: "Visible log output copied.",
    copyFailed: "Unable to copy log output.",
    matching: (count: number, locale?: string) =>
      adminCountMessage({ one: "matching line", other: "matching lines" })(count, locale),
    updated: (timestamp: string) => `Updated ${timestamp}`,
    followLatest: (on: boolean) => `Follow latest ${on ? "on" : "off"}`,
    autoRefresh: (on: boolean) => `Auto-refresh ${on ? "on" : "off"}`,
    refresh: "Refresh",
    source: "Source",
    level: "Level",
    category: "Category",
    lines: "Lines",
    allLevels: "All levels",
    allCategories: "All categories",
    search: "Search logs",
    searchPlaceholder: "Message or raw output",
    apply: "Apply",
    showing: (shown: number, loaded: number, locale?: string) =>
      `Showing ${formatAdminCount(shown, locale)} of ${formatAdminCount(loaded, locale)} loaded`,
    copyVisible: "Copy visible",
    empty: "No log lines matched.",
    output: (title: string) => `${title} output`,
  },
  sessions: {
    title: "Active sessions",
    loading: "Loading active sessions…",
    empty: "No active sessions.",
    loadFailed: "Unable to load active sessions.",
    revokeFailed: "Unable to revoke the session.",
    revokeAllFailed: "Unable to revoke sessions.",
    count: adminCountMessage({ one: "session", other: "sessions" }),
    current: "Current",
    revoke: "Revoke",
    revokeTitle: "Revoke session",
    revokeConfirm: "Revoke session",
    revokeDescription: (label: string) =>
      `Revoke the session for ${label}? That client will need to sign in again.`,
    columns: {
      session: "Session",
      details: "Details",
      created: "Created",
      lastActive: "Last active",
      expires: "Expires",
      actions: "Actions",
    },
  },
  memberships: {
    title: "Members",
    loading: "Loading members…",
    empty: "No members found.",
    loadFailed: "Unable to load members.",
    addFailed: "Unable to add the member.",
    roleUpdateFailed: "Unable to update the member role.",
    removeFailed: "Unable to remove the member.",
    count: adminCountMessage({ one: "member", other: "members" }),
    inherited: "Inherited",
    direct: "Direct",
    roleFor: (label: string) => `Role for ${label}`,
    remove: "Remove",
    removeTitle: "Remove member",
    removeConfirm: "Remove member",
    removeDescription: (label: string, scopeLabel: string) =>
      `Remove ${label} from ${scopeLabel}? Their access through this direct membership will end.`,
    columns: { member: "Member", access: "Access", role: "Role", actions: "Actions" },
  },
  featureFlags: {
    title: "Feature flags",
    loading: "Loading feature flags…",
    loadFailed: "Unable to load feature flags.",
    updateFailed: "Unable to update the feature flag.",
    storeHealth: "Store health:",
    source: (label: string) => `Source: ${label}`,
    sources: {
      store: "Store override",
      environment: "Environment controlled",
      default: "Default value",
      "store-error-policy": "Store unavailable policy",
    },
  },
  releaseNotes: {
    title: "What's new",
    allUpdates: "All updates",
    loading: "Loading release notes…",
    errorTitle: "Couldn't load release notes",
    errorDetail: "Try again in a moment.",
    missingTitle: "Release notes not found",
    missingDetail: "Choose another update from the history.",
    emptyTitle: "No updates yet",
    emptyDetail: "Release notes will appear here when an update ships.",
    fullNotes: "Full release notes",
    pagination: "Release history pages",
    newer: "Newer",
    older: "Older",
    page: (page: number, locale?: string) => `Page ${formatAdminCount(page, locale)}`,
  },
  jobs: {
    title: "Operational jobs",
    runLabel: "Run now",
    loading: "Loading operational jobs…",
    empty: "No operational runs yet.",
    loadFailed: "Unable to load operational jobs.",
    runFailed: "Unable to run the operational job.",
    recentRuns: (count: number, locale?: string) =>
      `${formatAdminCount(count, locale)} recent runs`,
    inProgress: "In progress",
    pagination: "Operational jobs pagination",
    columns: { job: "Job", started: "Started", finished: "Finished", status: "Status" },
  },
  backups: {
    title: "Backups",
    runLabel: "Run backup",
    loading: "Loading backups…",
    loadFailed: "Unable to load backups.",
    runFailed: "Unable to run backup.",
    restoreFailed: "Unable to restore backup.",
    recoveryPoints: (count: number, locale?: string) =>
      `${formatAdminCount(count, locale)} recent recovery points`,
    emptyTitle: "No backups yet",
    emptyDetail: "Run a backup to create your first recovery point.",
    restore: "Restore",
    restoreTitle: "Restore backup",
    restoreConfirm: "Restore backup",
    restoreDescription: (label: string) =>
      `This will overwrite the current database with the recovery point "${label}". This action is destructive and cannot be reversed.`,
    pagination: "Backups pagination",
    columns: {
      backup: "Backup",
      created: "Created",
      size: "Size",
      status: "Status",
      actions: "Actions",
    },
  },
  settings: {
    title: "Settings",
    loading: "Loading settings…",
    loadFailed: "Unable to load settings.",
    saveFailed: "Unable to save settings.",
    intro: "Changes are applied when saved.",
    save: "Save changes",
    saving: "Saving…",
    saved: "Changes saved.",
    enabled: "Enabled",
    disabled: "Disabled",
  },
  apiKeys: {
    title: "API keys",
    singular: "API key",
    plural: "API keys",
    credentialSingular: "credential",
    credentialPlural: "credentials",
    loading: (plural: string) => `Loading ${plural}…`,
    empty: (plural: string) => `No ${plural} yet.`,
    loadFailed: (plural: string) => `Unable to load ${plural}.`,
    createFailed: (singular: string) => `Unable to create ${singular}.`,
    updateFailed: (singular: string) => `Unable to update ${singular}.`,
    rotateFailed: (singular: string) => `Unable to rotate ${singular}.`,
    revokeFailed: (singular: string) => `Unable to revoke ${singular}.`,
    count: (count: number, singular: string, plural: string, locale?: string) =>
      `${formatAdminCount(count, locale)} ${new Intl.PluralRules(locale).select(count) === "one" ? singular : plural}`,
    active: (count: number, locale?: string) => `${formatAdminCount(count, locale)} active`,
    copied: "Copied",
    copyFailed: "Copy failed. Select and copy the secret manually.",
    secretNotice: "Copy this secret now. It will not be shown again.",
    copySecret: "Copy secret",
    secretCopied: "I copied it",
    editScopes: "Edit scopes",
    editScopesFor: (name: string) => `Edit scopes for ${name}`,
    rotate: "Rotate",
    rotateKey: (name: string) => `Rotate ${name}`,
    revoke: "Revoke",
    revokeKey: (name: string) => `Revoke ${name}`,
    scopesAndDetailsFor: (name: string) => `Scopes and details for ${name}`,
    noScopes: "No scopes assigned.",
    never: "never",
    createNew: (noun: string) => `Create a new ${noun}`,
    createButton: (singular: string) => `Create ${singular}`,
    rotateTitle: (singular: string) => `Rotate ${singular}`,
    revokeTitle: (singular: string) => `Revoke ${singular}`,
    rotateDescription: (noun: string) =>
      `The current ${noun} will stop working. Copy the replacement secret immediately after rotating it.`,
    revokeDescription: (noun: string) =>
      `This ${noun} will stop working immediately and cannot be restored.`,
    rotateConfirm: (noun: string) => `Rotate ${noun}`,
    revokeConfirm: (noun: string) => `Revoke ${noun}`,
    columns: {
      key: "Key",
      scope: "Scope",
      details: "Details",
      state: "State",
      created: "Created",
      lastUsed: "Last used",
      expires: "Expires",
      actions: "Actions",
    },
  },
};

/** The typed message catalog: every user-visible string the React surface renders, grouped by component or panel. */
export type AdminMessages = typeof defaultMessageCatalog;

type Leaf = string | number | boolean | ((...args: never[]) => unknown);
export type AdminMessagesOverride<T = AdminMessages> = {
  [K in keyof T]?: T[K] extends Leaf ? T[K] : AdminMessagesOverride<T[K]>;
};

/** What `AdminLabelsProvider` accepts: the original flat label keys plus a deep partial of the catalog. */
export type AdminLabelsOverride = Partial<AdminLabels> & AdminMessagesOverride;

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export const defaultAdminMessages: AdminMessages = deepFreeze(defaultMessageCatalog);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function mergeMessages(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (isRecord(base) && isRecord(override)) {
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, mergeMessages(value, override[key])]),
    );
  }
  return override;
}

/** Each original flat label key is an alias for one catalog entry. */
function flatLabelsAsCatalog(labels: Partial<AdminLabels>): AdminMessagesOverride {
  const { pageStatus, ...strings } = labels;
  return { common: { ...strings, pageStatus } };
}

function resolveMessages(base: AdminMessages, override: AdminLabelsOverride): AdminMessages {
  const flatKeys: readonly (keyof AdminLabels)[] = [
    "loading",
    "errorTitle",
    "retry",
    "cancel",
    "previousPage",
    "nextPage",
    "skipToContent",
    "pageStatus",
  ];
  const flat = Object.fromEntries(flatKeys.map((key) => [key, override[key]]));
  const grouped = Object.fromEntries(
    Object.entries(override).filter(([key]) => !flatKeys.includes(key as keyof AdminLabels)),
  );
  const withFlat = mergeMessages(base, flatLabelsAsCatalog(flat));
  return mergeMessages(withFlat, grouped) as AdminMessages;
}

function flatLabels(messages: AdminMessages, locale: string | undefined): AdminLabels {
  const { common } = messages;
  return {
    loading: common.loading,
    errorTitle: common.errorTitle,
    retry: common.retry,
    cancel: common.cancel,
    previousPage: common.previousPage,
    nextPage: common.nextPage,
    skipToContent: common.skipToContent,
    pageStatus: (page, pageCount) => common.pageStatus(page, pageCount, locale),
  };
}

export const defaultAdminLabels: AdminLabels = Object.freeze(
  flatLabels(defaultAdminMessages, undefined),
);

export interface AdminMessageContext {
  messages: AdminMessages;
  /** BCP 47 tag for plurals and number formatting; `undefined` is the runtime default. */
  locale: string | undefined;
}

const defaultMessageContext: AdminMessageContext = {
  messages: defaultAdminMessages,
  locale: undefined,
};

const AdminLabelsContext = createContext<AdminMessageContext>(defaultMessageContext);

/**
 * Localizes Admin Kit's user-visible strings for every descendant. `labels`
 * takes the original flat keys (`loading`, `cancel`, ...) and a deep partial of
 * the grouped catalog; both layer over what is already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and
 * `undefined` overrides keep the inherited value rather than blanking it.
 * `locale` feeds plural rules and number formatting.
 */
export function AdminLabelsProvider({
  labels,
  locale,
  children,
}: {
  labels?: AdminLabelsOverride;
  locale?: string;
  children: ReactNode;
}) {
  const inherited = useAdminMessages();
  const value = useMemo<AdminMessageContext>(() => {
    if (!labels && locale === undefined) return inherited;
    return {
      messages: labels ? resolveMessages(inherited.messages, labels) : inherited.messages,
      locale: locale ?? inherited.locale,
    };
  }, [inherited, labels, locale]);

  return <AdminLabelsContext.Provider value={value}>{children}</AdminLabelsContext.Provider>;
}

export function useAdminMessages(): AdminMessageContext {
  return useContext(AdminLabelsContext);
}

/** The latest messages for async callbacks that must not re-run when the catalog changes. */
export function useAdminMessagesRef(): { readonly current: AdminMessageContext } {
  const context = useAdminMessages();
  const ref = useRef(context);
  ref.current = context;
  return ref;
}

export function useAdminLabels(): AdminLabels {
  const { messages, locale } = useAdminMessages();
  return useMemo(() => flatLabels(messages, locale), [messages, locale]);
}
