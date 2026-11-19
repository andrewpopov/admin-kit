// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  AdminApiKey,
  AdminBackupSummary,
  AdminEventsPage,
  AdminFeatureFlagsSnapshot,
  AdminLogsSnapshot,
  AdminOperationalJob,
  AdminScopeGroup,
  AdminSessionSummary,
  AdminSettingField,
  AdminUserSummary,
  ReleaseNoteDetail,
} from "../core";
import {
  AdminApp,
  AdminAppShell,
  AdminConfirmationDialog,
  AdminConsole,
  AdminDataTable,
  AdminDialog,
  AdminFilterChip,
  AdminLabelsProvider,
  AdminPagination,
  AdminPanelHeader,
  AdminPanelStateView,
  AdminPortal,
  AdminScopePicker,
  AdminSwitch,
  AdminWorkspace,
  ApiKeysPanel,
  BackupsPanel,
  EventsPanel,
  FeatureFlagsPanel,
  LogsPanel,
  MembershipsPanel,
  OperationalJobsPanel,
  ReleaseNotesPanel,
  SessionsPanel,
  SettingsPanel,
  UsersPanel,
  defaultAdminMessages,
  type AdminLabelsOverride,
} from "../react";
import { AdminApiKeyForm } from "../react/AdminApiKeyForm";
import { AdminContentTargetProvider, AdminSkipLink } from "../react/AdminSkipLink";

afterEach(cleanup);

const WRAP_OPEN = "⟦";
const WRAP_CLOSE = "⟧";
const WRAPPED = /^⟦[\s\S]*⟧$/;
const TEXT_ATTRIBUTES = [
  "aria-label",
  "aria-valuetext",
  "aria-description",
  "aria-roledescription",
  "title",
  "placeholder",
  "alt",
];

function wrapMessages<T>(value: T): T {
  if (typeof value === "string") return `${WRAP_OPEN}${value}${WRAP_CLOSE}` as T;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => wrapMessages(fn(...args))) as T;
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, wrapMessages(entry)]),
    ) as T;
  }
  return value;
}

const pseudoCatalog = wrapMessages(defaultAdminMessages) as AdminLabelsOverride;

function collectStrings(value: unknown, into: Set<string> = new Set()): Set<string> {
  if (typeof value === "string") into.add(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, into));
  else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((entry) => collectStrings(entry, into));
  }
  return into;
}

function unwrappedTexts(hostData: ReadonlySet<string>): string[] {
  const data = [...hostData].sort((a, b) => b.length - a.length);
  const isHostDataOnly = (text: string) =>
    !/\p{L}/u.test(data.reduce((rest, value) => rest.split(value).join(""), text));
  const accepted = (text: string) => {
    const trimmed = text.trim();
    return trimmed === "" || WRAPPED.test(trimmed) || isHostDataOnly(trimmed);
  };
  const offenders: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (
      parent &&
      !["SCRIPT", "STYLE"].includes(parent.tagName) &&
      !accepted(node.textContent ?? "")
    ) {
      offenders.push(`text "${node.textContent}" in <${parent.tagName.toLowerCase()}>`);
    }
  }
  document.body.querySelectorAll("*").forEach((element) => {
    for (const name of TEXT_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value !== null && !accepted(value)) {
        offenders.push(`${name} "${value}" on <${element.tagName.toLowerCase()}>`);
      }
    }
  });
  return offenders;
}

function wrappedCount(): number {
  let count = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (WRAPPED.test((node.textContent ?? "").trim())) count += 1;
  }
  document.body.querySelectorAll("*").forEach((element) => {
    for (const name of TEXT_ATTRIBUTES) if (WRAPPED.test(element.getAttribute(name) ?? "")) count += 1;
  });
  return count;
}

const click = (text: string | RegExp) => {
  const matches = (candidate: string) =>
    typeof text === "string" ? candidate === text : text.test(candidate);
  const buttons = Array.from(document.body.querySelectorAll("button"));
  const button = buttons.find((candidate) => matches(candidate.textContent ?? ""));
  if (!button) {
    throw new Error(
      `No button with text ${String(text)}; found ${buttons.map((b) => b.textContent).join(" | ")}`,
    );
  }
  fireEvent.click(button);
};
const settle = () => act(async () => undefined);
const failWithNonError = () => Promise.reject("boom");

const ts = "2026-07-13T00:00:00.000Z";
const formatTimestamp = (iso: string) => iso;

const scopeGroups: readonly AdminScopeGroup[] = [
  {
    id: "library",
    label: "Library",
    description: "Read and manage the catalog.",
    scopes: [
      { value: "library.read", label: "Read catalog", description: "List books." },
      { value: "library.write", label: "Manage catalog" },
    ],
  },
  { id: "empty", label: "Nothing", scopes: [] },
];

const users: AdminUserSummary[] = [
  {
    id: "u1",
    label: "Ada Lovelace",
    secondaryLabel: "ada@example.test",
    role: { value: "admin", label: "Administrator" },
    status: { value: "active", label: "Enabled" },
    badges: ["founder"],
    details: [{ label: "Region", value: "North" }],
  },
];
const roles = [
  { value: "admin", label: "Administrator" },
  { value: "viewer", label: "Viewer" },
];
const statuses = [
  { value: "active", label: "Enabled" },
  { value: "paused", label: "Paused" },
];
const usersAdapter = {
  list: () => Promise.resolve({ items: users, page: 1, pageSize: 1, total: 2 }),
  roles,
  statuses,
  setRole: { execute: () => Promise.resolve(users[0]!) },
  setStatus: { execute: () => Promise.resolve(users[0]!) },
};

const eventsPage: AdminEventsPage = {
  items: [
    {
      id: "event-1",
      occurredAt: ts,
      category: "security",
      action: "SIGN_IN",
      message: "Sign-in succeeded",
      severity: "info",
      outcome: "success",
      actor: { label: "Ada" },
      resource: { label: "Console" },
      metadata: { ip: "127.0.0.1", status: "404" },
    },
  ],
  page: 1,
  pageSize: 1,
  total: 2,
  source: { label: "Security audit log", updatedAt: ts },
};
const eventsAdapter = {
  list: () => Promise.resolve(eventsPage),
  categories: [{ value: "security", label: "Security" }],
  severities: [{ value: "info", label: "Info level" }],
  outcomes: [{ value: "success", label: "Succeeded" }],
};

const logsSnapshot: AdminLogsSnapshot = {
  source: "app",
  sources: [
    { value: "app", label: "Application", detail: "app.log" },
    { value: "worker", label: "Worker" },
  ],
  entries: [
    {
      id: "l1",
      message: "Booted service",
      timestamp: ts,
      level: { value: "info", label: "INFO" },
      category: "core",
    },
  ],
  total: 5,
  generatedAt: ts,
  levels: [{ value: "info", label: "INFO" }],
  categories: [{ value: "core", label: "Core" }],
};

const sessions: AdminSessionSummary[] = [
  {
    id: "s1",
    label: "Chrome on Mac",
    secondaryLabel: "10.0.0.1",
    createdAt: ts,
    lastSeenAt: ts,
    expiresAt: ts,
    current: true,
    details: [{ label: "Agent", value: "Chrome" }],
  },
];
const sessionsAdapter = {
  scope: { id: "ws", label: "Workspace", kind: "workspace" },
  list: () => Promise.resolve(sessions),
  revoke: { execute: () => Promise.resolve() },
  bulkRevoke: {
    label: "Revoke everywhere",
    confirmTitle: "Revoke all sessions",
    confirmDescription: "This signs out every device.",
    execute: () => Promise.resolve(),
  },
};

const membershipsAdapter = {
  scope: { id: "ws", label: "Workspace", kind: "workspace" },
  roles: [
    { value: "owner", label: "Owner" },
    { value: "viewer", label: "Viewer", tone: "neutral" as const },
  ],
  list: () =>
    Promise.resolve([
      {
        memberId: "m1",
        label: "Ada",
        secondaryLabel: "ada@example.test",
        role: "owner",
        source: "explicit" as const,
        mutable: true,
      },
      {
        memberId: "m2",
        label: "Grace",
        role: "viewer",
        source: "inherited" as const,
        mutable: false,
      },
    ]),
  setRole: { execute: () => Promise.resolve() },
  remove: { execute: () => Promise.resolve() },
};

const flags: AdminFeatureFlagsSnapshot = {
  storeHealth: "healthy",
  flags: [
    {
      key: "beta",
      label: "Beta flag",
      description: "Early access.",
      enabled: true,
      source: "store",
      mutable: true,
    },
    { key: "env", label: "Env flag", enabled: false, source: "environment", mutable: false },
    { key: "def", label: "Default flag", enabled: false, source: "default", mutable: false },
    {
      key: "pol",
      label: "Policy flag",
      enabled: false,
      source: "store-error-policy",
      mutable: false,
    },
  ],
};

const releaseNote = {
  id: "r1",
  product: "Cairn",
  version: "1.2.0",
  releasedAt: ts,
  summary: "Faster lists",
};
const releaseDetail: ReleaseNoteDetail = { ...releaseNote, notesMarkdown: "# Notes body" };
const releaseProps = {
  hrefForRelease: (id: string) => `/updates/${id}`,
  listHref: "/updates",
  renderNotes: (markdown: string) => <p>{markdown}</p>,
};
const releaseDate = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(ts));

const jobs: AdminOperationalJob[] = [
  { id: "j1", label: "Retention sweep", startedAt: ts, state: "running", detail: "Nightly" },
  { id: "j2", label: "Export", startedAt: ts, finishedAt: ts, state: "completed" },
];
const backups: AdminBackupSummary[] = [
  {
    id: "b1",
    label: "Snapshot A",
    createdAt: ts,
    size: "1.2 GB",
    state: "completed",
    detail: "Full",
  },
];
const settingFields: AdminSettingField[] = [
  { id: "site", label: "Site name", value: "Atlas", description: "Shown in the header." },
  {
    id: "flag",
    label: "Maintenance mode",
    type: "boolean",
    value: false,
    description: "Pauses jobs.",
  },
];

const apiKeys: AdminApiKey[] = [
  {
    id: "k1",
    name: "ci-deploy",
    maskedKey: "ak_1234",
    state: "active",
    scopes: ["library.read", "legacy.scope"],
    createdAt: ts,
    details: [{ label: "Owner", value: "Platform" }],
  },
  { id: "k2", name: "old-key", maskedKey: "ak_5678", state: "revoked", scopes: [], createdAt: ts },
];
const apiKeysAdapter = {
  list: () => Promise.resolve(apiKeys),
  create: () => Promise.resolve({ key: apiKeys[0]!, secret: "sk_secret_value" }),
  rotate: () => Promise.resolve({ key: apiKeys[0]!, secret: "sk_rotated_value" }),
  revoke: () => Promise.resolve(),
  update: () => Promise.resolve(apiKeys[0]!),
};

interface Scenario {
  name: string;
  ui: ReactElement;
  drive?: () => Promise<void> | void;
}

const tableRows = [{ id: "r1", name: "Ada", note: "Long note" }];
const tableColumns = [
  {
    id: "name",
    header: "Name",
    defaultWidth: 160,
    minWidth: 96,
    cell: (row: (typeof tableRows)[number]) => row.name,
  },
  {
    id: "note",
    header: "Note",
    sort: { direction: "ascending" as const, onSort: () => undefined },
    cell: (row: (typeof tableRows)[number]) => row.note,
  },
];
const sections = [
  { id: "overview", label: "Overview", render: () => <p>Overview body</p> },
  { id: "audit", label: "Audit", disabled: true, render: () => <p>Audit body</p> },
];
const groups = [{ id: "ops", label: "Operations", description: "Run things.", sections }];
const appGroups = [
  {
    id: "ops",
    label: "Operations",
    sections: sections.map((section) => ({ ...section, capability: `custom:${section.id}` as const })),
  },
];
const noop = () => undefined;

const HOST_DATA = collectStrings([
  users,
  roles,
  statuses,
  eventsPage,
  eventsAdapter,
  logsSnapshot,
  sessions,
  sessionsAdapter.scope,
  sessionsAdapter.bulkRevoke,
  membershipsAdapter.scope,
  membershipsAdapter.roles,
  flags,
  releaseNote,
  releaseDetail,
  releaseDate,
  jobs,
  backups,
  settingFields,
  apiKeys,
  scopeGroups,
  tableRows,
  tableColumns.map((column) => column.header),
  sections,
  groups,
  ["active", "revoked", "expired", "Ada", "Grace", "token", "tokens", "boom"],
  ["Atlas admin", "Nav link", "Shell body", "Overview body", "Audit body", "Save thing"],
  ["Dialog body", "Edit thing", "Pick one.", "Danger zone", "Cannot be undone.", "Proceed"],
  ["Backend exploded.", "Thing pages", "Fleet", "Fleet detail", "Fleet summary text"],
  ["Severity: Error", "Switch label", "Other switch", "Summary row", "Row actions"],
  ["ip", "status", "Find events", "sk_secret_value", "sk_rotated_value", "# Notes body"],
]);

const scenarios: Scenario[] = [
  {
    name: "AdminDialog",
    ui: (
      <AdminDialog
        open
        title="Edit thing"
        description="Pick one."
        onClose={noop}
        actions={<button type="button">Save thing</button>}
      >
        <p>Dialog body</p>
      </AdminDialog>
    ),
  },
  {
    name: "AdminConfirmationDialog",
    ui: (
      <AdminConfirmationDialog
        open
        title="Danger zone"
        description="Cannot be undone."
        confirmLabel="Proceed"
        onCancel={noop}
        onConfirm={noop}
      />
    ),
  },
  { name: "AdminPanelStateView loading", ui: <AdminPanelStateView state={{ kind: "loading" }} /> },
  {
    name: "AdminPanelStateView skeleton",
    ui: <AdminPanelStateView state={{ kind: "loading", skeletonRows: 2 }} />,
  },
  {
    name: "AdminPanelStateView error",
    ui: (
      <AdminPanelStateView state={{ kind: "error", detail: "Backend exploded.", onRetry: noop }} />
    ),
  },
  {
    name: "AdminPagination",
    ui: <AdminPagination label="Thing pages" page={2} pageCount={3} onPageChange={noop} />,
  },
  {
    name: "AdminSkipLink",
    ui: (
      <AdminContentTargetProvider>
        <AdminSkipLink />
      </AdminContentTargetProvider>
    ),
  },
  {
    name: "AdminPanelHeader collapsed band",
    ui: (
      <AdminPanelHeader
        title="Fleet"
        detail={<p>Fleet detail</p>}
        collapsible={{
          storageKey: "pseudo-header",
          collapsedSummary: "Fleet summary text",
          activeCount: 2,
          defaultCollapsed: true,
        }}
      />
    ),
  },
  {
    name: "AdminPanelHeader expanded band",
    ui: (
      <AdminPanelHeader
        title="Fleet"
        detail={<p>Fleet detail</p>}
        collapsible={{
          storageKey: "pseudo-header-open",
          collapsedSummary: "Fleet summary text",
          defaultCollapsed: false,
        }}
      />
    ),
  },
  { name: "AdminFilterChip", ui: <AdminFilterChip label="Severity: Error" onRemove={noop} /> },
  {
    name: "AdminScopePicker",
    ui: (
      <AdminScopePicker
        groups={scopeGroups}
        value={["library.read", "legacy.scope"]}
        onChange={noop}
      />
    ),
  },
  {
    name: "AdminScopePicker with a fully selected group",
    ui: (
      <AdminScopePicker
        groups={scopeGroups}
        value={["library.read", "library.write"]}
        onChange={noop}
      />
    ),
  },
  {
    name: "AdminApiKeyForm create",
    ui: (
      <AdminApiKeyForm
        mode="create"
        scopeGroups={scopeGroups}
        pending={false}
        minimumScopeCount={2}
        onSubmit={noop}
        onCancel={noop}
      />
    ),
  },
  {
    name: "AdminApiKeyForm create with a noun",
    ui: (
      <AdminApiKeyForm
        mode="create"
        scopeGroups={scopeGroups}
        pending={false}
        itemNoun="token"
        initialScopes={["library.read"]}
        onSubmit={noop}
      />
    ),
  },
  {
    name: "AdminApiKeyForm edit",
    ui: (
      <AdminApiKeyForm
        mode="edit"
        scopeGroups={scopeGroups}
        pending={false}
        itemNoun="token"
        initialScopes={["library.read"]}
        onSubmit={noop}
        onCancel={noop}
      />
    ),
  },
  {
    name: "AdminDataTable resize menu and details",
    ui: (
      <AdminDataTable
        columns={tableColumns}
        rows={tableRows}
        rowKey={(row) => row.id}
        rowLabel={(row) => row.name}
        renderDetails={(row) => <p>{row.note}</p>}
      />
    ),
    drive: () => {
      fireEvent.click(screen.getAllByRole("separator")[0]!);
      click(/^⟦View⟧$/);
    },
  },
  {
    name: "AdminAppShell",
    ui: (
      <AdminAppShell renderNavigation={() => <a href="#nav">Nav link</a>}>
        <p>Shell body</p>
      </AdminAppShell>
    ),
    drive: () => click(/⟦Browse administration⟧/),
  },
  {
    name: "AdminConsole",
    ui: <AdminConsole activeSection="overview" sections={sections} onSectionChange={noop} />,
  },
  {
    name: "AdminPortal",
    ui: <AdminPortal activeSection="overview" groups={groups} onSectionChange={noop} />,
  },
  {
    name: "AdminPortal with an unavailable section",
    ui: <AdminPortal activeSection="missing" groups={groups} onSectionChange={noop} />,
  },
  {
    name: "AdminPortal empty",
    ui: <AdminPortal activeSection="none" groups={[]} onSectionChange={noop} />,
  },
  {
    name: "AdminApp",
    ui: (
      <AdminApp
        activeSection="overview"
        groups={appGroups}
        onSectionChange={noop}
        frame={{ title: "Atlas admin" }}
      />
    ),
  },
  {
    name: "AdminWorkspace and AdminSwitch",
    ui: (
      <AdminWorkspace title="Fleet" summary={<p>Summary row</p>} summaryLabel="⟦Fleet summary⟧">
        <AdminSwitch checked label="Switch label" onClick={noop} />
        <AdminSwitch checked={false} label="Other switch" onClick={noop} />
      </AdminWorkspace>
    ),
  },
  {
    name: "UsersPanel",
    ui: (
      <UsersPanel
        adapter={usersAdapter}
        search={{}}
        headerPresentation="page"
        headerCollapsible={{ storageKey: "pseudo-users", defaultCollapsed: false }}
        renderUserActions={() => <span>Row actions</span>}
      />
    ),
    drive: async () => {
      await screen.findByText("Ada Lovelace");
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ada" } });
      await screen.findByText("Ada Lovelace");
    },
  },
  {
    name: "UsersPanel collapsed with a search chip",
    ui: (
      <UsersPanel
        adapter={usersAdapter}
        search={{}}
        query={{ search: "ada" }}
        headerCollapsible={{ storageKey: "pseudo-users-collapsed", defaultCollapsed: true }}
      />
    ),
    drive: async () => {
      await screen.findByText("Ada Lovelace");
    },
  },
  {
    name: "UsersPanel failures",
    ui: <UsersPanel adapter={{ list: failWithNonError }} />,
    drive: async () => {
      await screen.findByRole("alert");
    },
  },
  {
    name: "UsersPanel empty",
    ui: (
      <UsersPanel
        adapter={{ list: () => Promise.resolve({ items: [], page: 1, pageSize: 25, total: 0 }) }}
      />
    ),
    drive: async () => {
      await screen.findByRole("status");
    },
  },
  {
    name: "EventsPanel feed",
    ui: (
      <EventsPanel
        adapter={eventsAdapter}
        search={{ placeholder: "Find events" }}
        headerCollapsible={{ storageKey: "pseudo-events" }}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("Sign-in succeeded");
      const selects = screen.getAllByRole("combobox");
      selects.forEach((select) => {
        const option = (select as HTMLSelectElement).options[1];
        if (option) fireEvent.change(select, { target: { value: option.value } });
      });
      await screen.findByText("Sign-in succeeded");
    },
  },
  {
    name: "EventsPanel table",
    ui: (
      <EventsPanel adapter={eventsAdapter} presentation="table" formatTimestamp={formatTimestamp} />
    ),
    drive: async () => {
      await screen.findByText("SIGN_IN");
      click(/^⟦View⟧$/);
    },
  },
  {
    name: "EventsPanel states",
    ui: (
      <EventsPanel
        adapter={{ list: () => Promise.resolve({ ...eventsPage, items: [], total: 0 }) }}
      />
    ),
    drive: async () => {
      await screen.findByRole("status");
    },
  },
  {
    name: "EventsPanel failure",
    ui: <EventsPanel adapter={{ list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "LogsPanel",
    ui: (
      <LogsPanel
        adapter={{ read: () => Promise.resolve(logsSnapshot) }}
        pollIntervalMs={60_000}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("Booted service");
      click(/^⟦Refresh⟧$/);
      await screen.findByText(/Refreshed/);
      click(/^⟦Copy visible⟧$/);
      await settle();
    },
  },
  {
    name: "LogsPanel states",
    ui: (
      <LogsPanel
        adapter={{ read: () => Promise.resolve({ ...logsSnapshot, entries: [], total: 0 }) }}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "LogsPanel failure",
    ui: <LogsPanel adapter={{ read: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "SessionsPanel revoke dialog",
    ui: <SessionsPanel adapter={sessionsAdapter} formatTimestamp={formatTimestamp} />,
    drive: async () => {
      await screen.findByText("Chrome on Mac");
      click(/^⟦Revoke⟧$/);
    },
  },
  {
    name: "SessionsPanel empty and failure",
    ui: <SessionsPanel adapter={{ ...sessionsAdapter, list: () => Promise.resolve([]) }} />,
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "SessionsPanel load failure",
    ui: <SessionsPanel adapter={{ ...sessionsAdapter, list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "MembershipsPanel remove dialog",
    ui: <MembershipsPanel adapter={membershipsAdapter} />,
    drive: async () => {
      await screen.findByText("Ada");
      click(/^⟦Remove⟧$/);
    },
  },
  {
    name: "MembershipsPanel empty",
    ui: <MembershipsPanel adapter={{ ...membershipsAdapter, list: () => Promise.resolve([]) }} />,
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "MembershipsPanel load failure",
    ui: <MembershipsPanel adapter={{ ...membershipsAdapter, list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "FeatureFlagsPanel",
    ui: (
      <FeatureFlagsPanel
        adapter={{ list: () => Promise.resolve(flags), setEnabled: () => Promise.reject("boom") }}
      />
    ),
    drive: async () => {
      await screen.findByText("Beta flag");
      fireEvent.click(screen.getByLabelText("Beta flag"));
      await screen.findByRole("alert");
    },
  },
  {
    name: "FeatureFlagsPanel failure",
    ui: <FeatureFlagsPanel adapter={{ list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "ReleaseNotesPanel list and paging",
    ui: (
      <ReleaseNotesPanel
        {...releaseProps}
        adapter={{
          list: ({ page, pageSize }) =>
            Promise.resolve({ items: [releaseNote], page, pageSize, hasMore: true }),
          get: () => Promise.resolve(null),
        }}
      />
    ),
    drive: async () => {
      await screen.findByText("Faster lists");
      click(/^⟦Older⟧$/);
      await screen.findByText(/Page 2/);
    },
  },
  {
    name: "ReleaseNotesPanel detail",
    ui: (
      <ReleaseNotesPanel
        {...releaseProps}
        releaseId="r1"
        adapter={{ list: () => Promise.reject("boom"), get: () => Promise.resolve(releaseDetail) }}
      />
    ),
    drive: async () => void (await screen.findByText("Faster lists")),
  },
  {
    name: "ReleaseNotesPanel missing",
    ui: (
      <ReleaseNotesPanel
        {...releaseProps}
        releaseId="r9"
        adapter={{ list: () => Promise.reject("boom"), get: () => Promise.resolve(null) }}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "ReleaseNotesPanel empty",
    ui: (
      <ReleaseNotesPanel
        {...releaseProps}
        adapter={{
          list: ({ page, pageSize }) =>
            Promise.resolve({ items: [], page, pageSize, hasMore: false }),
          get: () => Promise.resolve(null),
        }}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "ReleaseNotesPanel error",
    ui: (
      <ReleaseNotesPanel
        {...releaseProps}
        adapter={{ list: () => Promise.reject("boom"), get: () => Promise.reject("boom") }}
      />
    ),
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "OperationalJobsPanel",
    ui: (
      <OperationalJobsPanel
        adapter={{
          list: () => Promise.resolve({ items: jobs, page: 1, pageSize: 25, total: 60 }),
          run: { execute: failWithNonError },
        }}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("Retention sweep");
      click(/^⟦Run now⟧$/);
      await screen.findByText(/Unable to run/);
    },
  },
  {
    name: "OperationalJobsPanel empty",
    ui: (
      <OperationalJobsPanel
        adapter={{ list: () => Promise.resolve({ items: [], page: 1, pageSize: 25, total: 0 }) }}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "OperationalJobsPanel failure",
    ui: <OperationalJobsPanel adapter={{ list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "BackupsPanel restore dialog",
    ui: (
      <BackupsPanel
        adapter={{
          list: () => Promise.resolve({ items: backups, page: 1, pageSize: 25, total: 40 }),
          run: { execute: noopAsync },
          restore: { execute: noopAsync },
        }}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("Snapshot A");
      click(/^⟦Restore⟧$/);
    },
  },
  {
    name: "BackupsPanel empty",
    ui: (
      <BackupsPanel
        adapter={{ list: () => Promise.resolve({ items: [], page: 1, pageSize: 25, total: 0 }) }}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "BackupsPanel failure",
    ui: <BackupsPanel adapter={{ list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "SettingsPanel",
    ui: (
      <SettingsPanel
        adapter={{ load: () => Promise.resolve(settingFields), save: { execute: noopAsync } }}
      />
    ),
    drive: async () => {
      await screen.findByText("Site name");
      click(/⟦Disabled⟧/);
      click(/^⟦Save changes⟧$/);
      await screen.findByText(/Changes saved/);
    },
  },
  {
    name: "SettingsPanel failure",
    ui: <SettingsPanel adapter={{ load: failWithNonError, save: { execute: noopAsync } }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
  {
    name: "ApiKeysPanel table with editor, rotate dialog and secret",
    ui: (
      <ApiKeysPanel
        adapter={apiKeysAdapter}
        scopeGroups={scopeGroups}
        minimumScopeCount={1}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("ci-deploy");
      click(/^⟦Edit scopes⟧$/);
      click(/^⟦Rotate⟧$/);
      click(/^⟦Rotate .*⟧$/);
      await screen.findByText("sk_rotated_value");
    },
  },
  {
    name: "ApiKeysPanel cards with a vocabulary",
    ui: (
      <ApiKeysPanel
        adapter={apiKeysAdapter}
        presentation="cards"
        vocabulary={{ singular: "token", plural: "tokens" }}
        scopeGroups={scopeGroups}
        formatTimestamp={formatTimestamp}
      />
    ),
    drive: async () => {
      await screen.findByText("ci-deploy");
      click(/^⟦Revoke⟧$/);
    },
  },
  {
    name: "ApiKeysPanel empty with the create form",
    ui: (
      <ApiKeysPanel
        adapter={{ ...apiKeysAdapter, list: () => Promise.resolve([]) }}
        scopeGroups={scopeGroups}
      />
    ),
    drive: async () => void (await screen.findByRole("status")),
  },
  {
    name: "ApiKeysPanel failure",
    ui: <ApiKeysPanel adapter={{ ...apiKeysAdapter, list: failWithNonError }} />,
    drive: async () => void (await screen.findByRole("alert")),
  },
];

function noopAsync() {
  return Promise.resolve();
}

describe("message catalog pseudo-locale", () => {
  it.each(scenarios.map((scenario) => [scenario.name, scenario] as const))(
    "renders %s with no untranslated text, aria-label, title or placeholder",
    async (_name, scenario) => {
      render(<AdminLabelsProvider labels={pseudoCatalog}>{scenario.ui}</AdminLabelsProvider>);
      await settle();
      await scenario.drive?.();
      await settle();

      expect(unwrappedTexts(HOST_DATA)).toEqual([]);
      expect(wrappedCount(), "the pseudo-locale provider should be in effect").toBeGreaterThan(
        0,
      );
    },
    30_000,
  );
});

describe("message catalog overrides", () => {
  it("keeps the flat label keys working as aliases for the catalog", () => {
    render(
      <AdminLabelsProvider labels={{ cancel: "Annuler" }}>
        <AdminConfirmationDialog
          open
          title="t"
          description="d"
          confirmLabel="ok"
          onCancel={noop}
          onConfirm={noop}
        />
      </AdminLabelsProvider>,
    );
    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
  });

  it("deep-merges a partial catalog over the English defaults and inherited providers", () => {
    render(
      <AdminLabelsProvider labels={{ dialog: { close: "Fermer" } }}>
        <AdminLabelsProvider labels={{ common: { cancel: "Annuler" } }}>
          <AdminDialog open title="t" onClose={noop}>
            body
          </AdminDialog>
        </AdminLabelsProvider>
      </AdminLabelsProvider>,
    );
    expect(screen.getByRole("button", { name: "Fermer" })).toBeTruthy();
  });

  it("formats counts for the provider locale", async () => {
    render(
      <AdminLabelsProvider locale="de">
        <EventsPanel
          adapter={{ list: () => Promise.resolve({ ...eventsPage, total: 1234 }) }}
          formatTimestamp={formatTimestamp}
        />
      </AdminLabelsProvider>,
    );
    expect(await screen.findByText(/1\.234 events/)).toBeTruthy();
  });

  it("selects the singular form for one and formats the count", () => {
    expect(defaultAdminMessages.users.count(1)).toBe("1 user");
    expect(defaultAdminMessages.users.count(1234, "en")).toBe("1,234 users");
    expect(defaultAdminMessages.events.total(1234, "en")).toBe("1,234 events");
  });

  it("freezes the English defaults", () => {
    expect(Object.isFrozen(defaultAdminMessages)).toBe(true);
    expect(Object.isFrozen(defaultAdminMessages.users.columns)).toBe(true);
  });
});
