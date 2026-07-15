# @andrewpopov/admin-kit

Router-neutral, capability-driven React primitives for administration surfaces.
It provides the common shell and interaction behavior for admin pages while
each application retains its routes, API client, user model, policy, server
authorization, and product-specific pages.

## What belongs here

- Controlled tab navigation and grouped, routed admin-portal composition.
- Shared loading, error, empty, and confirmation interactions.
- Serializable adapter contracts and consumer-shaped test fixtures.
- User-management, scoped-membership, feature-flag, and API-key modules. User management, memberships, backups, and operational jobs render through the same responsive semantic-table contract, with horizontal scrolling on narrow screens.
- `AdminWorkspace`, the default header, summary, toolbar, and content framing for operational pages.
- Typed operational status, backup, and settings panels for consistent recovery and configuration surfaces.
- An operational-jobs panel for scheduled work where backup/restore semantics do not apply.
- An adapter-backed administrative events panel with declared filters, source
  context, safe metadata details, refresh, and paging.
- An adapter-backed runtime log viewer with source, bounded-tail, filter,
  search, refresh, polling, and copy interactions.
- Scoped-membership administration for workspaces, organizations, projects,
  and other host-defined scopes, including direct/inherited access, role
  changes, host-owned additions, and confirmed removals.
- Active-session administration with safe metadata, per-session revocation,
  host-defined bulk semantics, confirmations, and authoritative reloads.

## What does not belong here

- Authentication or authorization enforcement. Use `auth-kit` and `authz-kit`
  on the server; hiding an action in this package is never security.
- Next.js, React Router, an ORM, a fetch client, Tailwind, shadcn, or toast
  dependencies.
- A universal `AdminUser` database type. Apps provide their own data and
  optional capabilities.
- Product-specific administration screens.

## Install

```sh
npm install github:andrewpopov/admin-kit#v0.18.0
```

`react` and `react-dom` are peer dependencies (`^18 || ^19`). `react-dom` is
required because confirmation dialogs render through a portal.

Import default styles only if they suit the host application; the components also
work with host-owned styling.

```ts
import "@andrewpopov/admin-kit/styles.css";
```

## Consumer migration policy

Use the kit by default whenever an administration feature matches one of its
capability contracts: portal navigation, users, sessions, logs, events,
feature flags, API keys, memberships, backups, operational jobs, or basic
settings. Keep one small host adapter beside the page; it translates the host
API and domain vocabulary while the kit owns loading, error, confirmation,
pagination, filtering, and safe mutation state.

Keep a host-owned page when the workflow is genuinely product-specific—for
example catalog curation, AI-provider configuration, restore/import wizards,
or a policy-specific credential form. A host page may compose one or more kit
panels; it should not reimplement a matching panel merely to use local routing,
styling, or transport.

### Canonical application shape

Use `AdminApp` as the single shell for a host administration area. It is the
same router-neutral portal interaction model, but its sections carry a required
capability name. This makes the host registry the explicit answer to “where is
our users/logs/settings/admin workflow?”, and rejects duplicate generic
workflows before the UI renders.

```tsx
import { AdminApp, UsersPanel } from "@andrewpopov/admin-kit/react";

<AdminApp
  activeSection={routeSection}
  groups={[
    {
      id: "access",
      label: "Access",
      sections: [
        {
          id: "users",
          label: "Users",
          capability: "users",
          render: () => <UsersPanel adapter={usersAdapter} />,
        },
      ],
    },
  ]}
  renderNavigationItem={renderRouterLink}
/>;
```

The supported capability names are `users`, `sessions`, `logs`, `events`,
`feature-flags`, `api-keys`, `memberships`, `backups`, `operational-jobs`, and
`settings`. Product-specific sections use a descriptive `custom:<name>` value,
such as `custom:catalog` or `custom:home-assistant`. Keep a small adapter next
to a generic route and let the panel own the generic interaction lifecycle.

`AdminConsole` is deprecated. Existing consumers may migrate incrementally,
but new administration areas must use `AdminApp`. `AdminPortal` remains a
lower-level escape hatch for a genuinely product-specific navigation surface;
it is not the default for a normal admin application.

The stylesheet follows a host `.dark` class automatically. Its defaults are
available even when a panel is rendered without an `.admin-kit` wrapper, so
portaled confirmations retain the same readable theme.

The default stylesheet supplies a restrained visual system: raised panel
surfaces, responsive controls, clear primary/destructive action hierarchy, and
matching light and dark palettes. Hosts can tune it without forking component
styles by overriding the `--admin-kit-*` variables on an app or admin wrapper.

## Styling contract

Admin Kit is intentionally unopinionated about the host application's brand.
The default stylesheet is an opt-in baseline, not a styling boundary. Hosts can
override its custom properties on a wrapper, then use the component `className`
seams for a narrow product-specific adjustment. Package selectors use `:where()`
where possible so an equally targeted host rule wins without `!important`.

```tsx
<div className="acme-admin">
  <UsersPanel adapter={users} className="acme-admin__users" />
  <ApiKeysPanel
    adapter={apiKeys}
    className="acme-admin__keys"
    dialogClassName="acme-admin__key-dialog"
  />
</div>
```

```css
.acme-admin {
  --admin-kit-surface: var(--app-card);
  --admin-kit-surface-subtle: var(--app-muted-surface);
  --admin-kit-border: var(--app-border);
  --admin-kit-text: var(--app-foreground);
  --admin-kit-muted: var(--app-muted-foreground);
  --admin-kit-accent: var(--app-primary);
  --admin-kit-accent-strong: var(--app-primary-hover);
  --admin-kit-accent-soft: var(--app-primary-subtle);
  --admin-kit-radius: var(--app-radius);

  /* Label color used ON an accent or danger fill. Set these whenever you
     override the fills: a light accent with a light on-accent is how you get an
     unreadable button. */
  --admin-kit-on-accent: var(--app-primary-foreground);
  --admin-kit-on-danger: var(--app-danger-foreground);
  --admin-kit-danger-strong: var(--app-danger-hover);

  /* Status surfaces (healthy/warning pills, the secret-reveal callout). */
  --admin-kit-success: var(--app-success);
  --admin-kit-warning: var(--app-warning);
}

.acme-admin__users .admin-kit__users-table { box-shadow: none; }
.acme-admin__keys > button { border-radius: 999px; }
```

`className` is available on every panel — the shells (`AdminConsole`,
`AdminPortal`), the directory panels (`UsersPanel`, `FeatureFlagsPanel`,
`EventsPanel`, `LogsPanel`, `ApiKeysPanel`, `MembershipsPanel`, `SessionsPanel`), the operational panels
(`OperationalJobsPanel`, `BackupsPanel`, `SettingsPanel`), and
`AdminPanelStateView`. Their stable
`admin-kit__*` classes are supported styling hooks.

Package selectors keep their pseudo-classes inside `:where()`, so an equally
targeted host rule wins without `!important` — and the package itself ships no
`!important` declarations.

Confirmation dialogs render through a portal on `document.body`, outside the panel
wrapper, so apply dialog token overrides to an app-level wrapper or target the
supplied `dialogClassName`. (During server rendering the dialog falls back to
inline markup, so the kit remains server-renderable.)

### Dark mode

`.dark` on any ancestor is the authoritative signal and is unchanged:

```html
<body class="dark">
```

Hosts that follow the OS setting instead of an in-app toggle can opt into system
dark mode:

```html
<body data-admin-kit-theme="auto">
```

This is deliberately opt-in. Applying `prefers-color-scheme` unconditionally would
force dark tokens on a class-mode host whose user had explicitly selected light
while their OS was set to dark.

## Controlled shell

The host owns the active section and maps it to any URL or router shape.

```tsx
import { AdminConsole } from "@andrewpopov/admin-kit/react";

<AdminConsole
  activeSection={section}
  onSectionChange={setSection}
  sections={[
    { id: "users", label: "Users", render: () => <UsersPanel /> },
    { id: "settings", label: "Settings", render: () => <SettingsPanel /> },
  ]}
/>;
```

## Grouped admin portal

Use `AdminPortal` for a routed administration area with multiple groups and
application-specific pages. The package owns grouping, current-page and
disabled semantics, responsive layout, and empty or unavailable-section states. The host
still owns URLs and renders its router's link component.

When using the default button navigation, `onSectionChange` is required. A
custom router-link renderer satisfies navigation by itself and may optionally
receive `onSectionChange` as a selection notification.

```tsx
import { AdminPortal } from "@andrewpopov/admin-kit/react";

<AdminPortal
  activeSection={routeSection}
  groups={[
    {
      id: "core",
      label: "Core administration",
      sections: [
        { id: "users", label: "Users", render: () => <UsersPanel /> },
        { id: "logs", label: "Logs", visible: canViewLogs, render: () => <Logs /> },
      ],
    },
    {
      id: "application",
      label: "Application",
      sections: [{ id: "catalog", label: "Catalog", render: () => <Catalog /> }],
    },
  ]}
  renderNavigationItem={({
    section,
    className,
    ariaCurrent,
    ariaDisabled,
    tabIndex,
    onClick,
  }) => (
    <RouterLink
      aria-current={ariaCurrent}
      aria-disabled={ariaDisabled}
      className={className}
      onClick={onClick}
      tabIndex={tabIndex}
      to={`/admin/${section.id}`}
    >
      {section.label}
    </RouterLink>
  )}
/>;
```

If `activeSection` is hidden or missing, the portal does not render an unrelated
fallback page. Supply `inactiveSectionState` to render the host's not-found or
access-denied presentation; otherwise the portal renders a neutral unavailable state.

`visible` is a host-computed presentation input, not an authorization guard.
The server must still authorize every route and operation. A disabled custom
link must spread the supplied `ariaDisabled`, `tabIndex`, and `onClick` values
so it cannot navigate.

## Core contracts

`@andrewpopov/admin-kit/core` has no React dependency. It exports console and
grouped-portal definition validation, paged-resource types, and
transport-neutral failure normalization. `defineAdminPortal` rejects empty
groups and duplicate group or section IDs before ambiguous routes reach the
UI. `@andrewpopov/admin-kit/testing` exports small immutable fixtures for
adapter and consumer-shaped tests.

### Users adapter

`AdminUsersAdapter` exposes only the user operations an application actually
supports. It deliberately takes presentation data (`label`, optional role and
status values), not an ORM-shaped `User`. A Savoro adapter can provide its
owner/status vocabulary and a token-confirmed purge input; a Sano OS adapter
can derive `disabledAt` into a status and expose password-reset instead. The
host owns the transport and every policy decision.

```ts
import { defineAdminUsersAdapter } from "@andrewpopov/admin-kit/core";

const users = defineAdminUsersAdapter({
  list: async (query) => ({
    items: [],
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 25,
    total: 0,
  }),
  roles: [{ value: "admin", label: "Admin" }],
  setRole: { execute: async ({ userId, role }) => api.setRole(userId, role) },
});
```

`UsersPanel` renders the paged normalized directory, optional account details,
and declared role/status controls. An account can set
`permissions.canChangeRole` or `permissions.canChangeStatus` to `false` to
render its current value without exposing a control, even when the adapter
offers that mutation for other accounts. Supply `search` only when the host adapter
maps query text to its list request, and use `renderHeaderActions` for
host-owned create or invite forms. Header actions remain available while the
directory is loading, empty, or failed. Supply `renderUserActions` for
product-specific edit, reset, deactivate, and deletion flows; its callback
receives a `reload` function after a successful host mutation. The generic
panel never assumes destructive-action semantics or collects password,
confirmation, or purge inputs.

```tsx
<UsersPanel
  adapter={users}
  search={{ placeholder: "Search by email" }}
  renderHeaderActions={({ reload }) => <InviteUserDialog onSuccess={reload} />}
  renderUserActions={(user, { reload }) => (
    <UserActions user={user} onSuccess={reload} />
  )}
/>;
```

Map stable account facts such as creation time and last login through
`AdminUserSummary.details`; do not pass raw audit records or user database
objects into the package.

The table only includes Details when at least one returned account supplies
`details`, and Actions only when the host supplies `renderUserActions`; the
directory never leaves a blank column for omitted capabilities.

For a richer, scan-first directory, pass `columns`. Each column declares its
label and typed cell renderer; the host retains product-specific account facts
and actions while the kit keeps pagination, loading, empty, and error states.
Use this instead of overloading the default identity cell with unrelated facts.

### Scoped memberships

Use `MembershipsPanel` for access within a host-defined scope, not for global
account administration. This distinction lets Cairn model organization and
project roles and lets Savoro model shared-list or household access without
inventing one tenant schema.

```tsx
const memberships = defineAdminMembershipsAdapter({
  scope: { id: workspace.id, label: workspace.name, kind: "workspace" },
  roles: [{ value: "ADMIN", label: "Administrator" }, { value: "MEMBER", label: "Member" }],
  list: () => api.listMembers(workspace.id),
  invite: { execute: ({ email, role }) => api.inviteMember(workspace.id, email, role) },
  setRole: { execute: ({ memberId, role }) => api.setMemberRole(workspace.id, memberId, role) },
  remove: { execute: ({ memberId }) => api.removeMember(workspace.id, memberId) },
});

<MembershipsPanel
  adapter={memberships}
  renderAddMember={({ submit, isPending }) => (
    <InviteMemberForm disabled={isPending} onSubmit={submit} />
  )}
/>;
```

`source: "inherited"` is always informational and cannot expose mutation
controls. For direct memberships, use `permissions.canChangeRole` and
`permissions.canRemove` when the current administrator may mutate some rows
but not others. These values only control presentation; the server must enforce
the same scope and actor policy. The host retains identity search, invitation
delivery, acceptance, inheritance, and removal impact language.
Extend `AdminMembershipSummary` in the host when `renderMemberActions` or
`getRemoveDescription` needs product-specific presentation data; the generic
adapter and panel preserve that subtype without exposing it to the package.

### Active sessions

Use `SessionsPanel` for list-safe active-session metadata and revocation
workflows. The host declares the scope and exact bulk action language, so the
same panel can represent Bewks' application-wide operator view, Smarthome's
per-user revoke-one/revoke-all behavior, or Sano OS's self-service
revoke-others behavior without pretending those policies are equivalent.

```tsx
const sessions = defineAdminSessionsAdapter({
  scope: { id: user.id, label: user.email, kind: "user" },
  list: () => api.listSessions(user.id),
  revoke: { execute: ({ sessionId }) => api.revokeSession(user.id, sessionId) },
  bulkRevoke: {
    label: "Revoke other sessions",
    confirmTitle: "Keep this device?",
    confirmDescription: "Every other device will need to sign in again.",
    execute: () => api.revokeOtherSessions(user.id),
  },
});

<SessionsPanel adapter={sessions} />;
```

Map only safe presentation facts such as client, IP-derived display location,
creation, last-seen, and expiry timestamps. The host retains session/token
storage, current-device rotation, authentication epochs, resource and actor
authorization, audit recording, and the exact meaning of every revoke action.
`permissions.canRevoke` only hides an unavailable control; it is not an
authorization boundary. After each mutation the panel reloads the host's
authoritative session list and preserves the last good list if a later load or
mutation fails.

### Feature flags

`FeatureFlagsPanel` and `AdminFeatureFlagsAdapter` require the host to declare
each flag's effective source and store health. A flag controlled by an
environment value, a default, or a store-error policy is shown as read-only;
the panel never suggests a toggle can change it. After a successful mutation,
the panel reloads the host snapshot rather than assuming the requested value
won precedence.

### API keys

`ApiKeysPanel` lists only safe metadata and supports create, rotation, and
revocation confirmations. A raw key secret can enter the panel only as a
validated create or rotate response; it is never part of `AdminApiKey`, so a
list response cannot accidentally re-reveal it. The panel provides a real
clipboard copy action with visible success or failure feedback; it never
persists the secret. A failed metadata refresh after a successful create or
rotation leaves the one-time secret visible and shows a retryable inline error.

Use `renderCreate` when the host needs a product-specific input form (for
example, name, expiry, scopes, or an audit reason). The callback receives the
package-owned create operation and pending state; its promise resolves to
`true` only when creation succeeded, so the host can safely clear its form.
Use `title` to keep product vocabulary accurate (for example, "Personal access
tokens"). The host retains its form schema and validation.

Set `expiresAt` and `revokedAt` to the durable timestamps returned by the host.
The package resolves lifecycle state at render time, so an active key becomes
non-actionable when its expiry passes even before the next list refresh.
Revocation takes precedence over expiry. The server remains responsible for
enforcing both timestamps.

Use `AdminApiKey.details` for safe policy facts such as allowed paths, actions,
list IDs, IP restrictions, expiry, or a rate limit. Use `renderEdit` only when
the host provides the optional `update` mutation; it receives a package-owned
reload lifecycle but retains the edit form, policy schema, and server-side
authorization.

Use `renderKeys` when the host needs to retain a richer credential list or
empty state. It receives only safe key metadata plus package-owned revoke,
optional rotate, and optional metadata-update callbacks, so the package still
owns destructive confirmation and the secret-safe lifecycle.

### Administrative events

`EventsPanel` normalizes list-safe audit, access, and operational records while
the host retains log parsing, storage, retention, transport, and authorization.
Map source provenance, actor, resource, outcome, and safe metadata into the
adapter rather than leaking raw log lines into the component. Declare only the
filters the host can execute.

```tsx
<EventsPanel
  adapter={events}
  search={{ placeholder: "Action, actor, or resource" }}
/>
```

### Runtime logs

`LogsPanel` is deliberately separate from `EventsPanel`. Events are normalized
audit or operational records with actor/resource/outcome semantics. Runtime
logs are bounded process or file output intended for operator inspection.

```tsx
const logs = defineAdminLogsAdapter({
  defaultSource: "api.log",
  lineLimits: [100, 200, 500, 1000],
  defaultLineLimit: 200,
  read: async (query) => {
    const result = await api.readLogTail(query.source, query.limit);
    return {
      source: result.file,
      sources: result.availableFiles.map((file) => ({
        value: file.name,
        label: file.name,
        detail: file.size,
      })),
      entries: result.lines.map((line, index) => ({
        id: `${result.file}:${result.offset + index}`,
        message: line.message,
        raw: line.raw,
        timestamp: line.timestamp,
        level: line.level,
        category: line.category,
      })),
      total: result.totalLines,
      levels: result.levels,
      categories: result.categories,
    };
  },
});

<LogsPanel
  adapter={logs}
  pollIntervalMs={5_000}
  defaultAutoRefresh
/>;
```

The host adapter owns source discovery, parsing raw lines, server-side search,
file-path safety, retention, redaction, and authorization. The panel validates
the list-safe snapshot, ignores stale responses, filters the loaded window for
immediate feedback, and sends the applied search back to the adapter. Bewks can
map its application/PM2 sources and structured categories; Savoro can map its
combined/error sources and server search; Smarthome can map its dynamic file
list and split the selected raw tail into entries. Product-specific links into
audit tools or incident workflows belong around the panel in `AdminWorkspace`.

### Operational workspace

Use `AdminWorkspace` as the default frame for every administrative route. It
owns semantic page framing and consistent layout; the host still owns route
guards, product wording, and action semantics. It renders a `main` landmark by
default. If the host page already owns the sole `main`, use `as="section"` so
landmarks remain valid. Put dense records in tables and put health facts in
`AdminStatusSummary` rather than creating one-off metric cards.

Use `AdminActionButton` for actions supplied through a host-owned workspace,
toolbar, or render callback. `tone="primary"` is for the one dominant action
on a view, `tone="danger"` is for destructive actions, and the default neutral
tone is for secondary actions. The primitive provides only presentation and a
safe `type="button"`; route guards and server authorization remain host-owned.

```tsx
<AdminWorkspace
  as="section"
  title="Backups"
  actions={<AdminActionButton tone="primary">Run backup</AdminActionButton>}
>
  <BackupsPanel adapter={backups} />
</AdminWorkspace>
```

`BackupsPanel` is only for hosts that expose real backup artifacts and an
authorized restore operation. Use `OperationalJobsPanel` for scheduled tasks,
imports, synchronizations, and retention work. `SettingsPanel` maps a
host-owned load/save adapter to typed text, sensitive, and boolean fields; it
does not infer setting keys or make policy decisions.

## Fleet capability boundary

The kit is a behavioral superset of repeated administration workflows, not a
union of every product page.

| Capability | Fleet evidence | Shared package ownership |
| --- | --- | --- |
| Accounts | Bewks, Cairn, Sano OS, Savoro, Smarthome | Directory state, declared role/status controls, host action seams |
| Scoped memberships | Cairn organizations/projects, Savoro shared resources | Direct/inherited presentation, role mutation, add composition, confirmed removal |
| Active sessions | Bewks, Sano OS, Smarthome | Safe metadata, current-session presentation, confirmed individual revoke, host-defined bulk revoke semantics |
| Credentials | Bewks, Cairn, Sano OS, Savoro, Smarthome | Secret-safe list and create/rotate/revoke/update lifecycle |
| Administrative events | Bewks, Cairn, Savoro, Smarthome | Normalized records, declared filters, source context, paging |
| Settings and operations | Bewks, Cairn, Savoro | Typed fields, status summaries, backups, jobs, retry and confirmation behavior |
| Runtime log tails | Bewks, Savoro, Smarthome | Sources, bounded snapshots, level/category/search controls, refresh/polling, copy, stale-response safety |
| Imports, catalogs, integrations, security enrollment | Product-specific | Host pages composed inside `AdminPortal`; do not generalize their domain policy |

## Release requirements

Before migrating an application, compare behavior against its local admin
implementation. The package must be a behavioral superset of the behavior it
replaces; do not work around missing package seams locally.

Run:

```sh
npm test
npm run typecheck
npm run build
npm run verify:pack
npm run test:browser
```

Pull requests and `main` run the same unit, type, package-consumer, generated
asset, and Chromium checks. A release tag must equal the package version and
have a matching changelog heading. After a tag is merged, consumers must update
their git dependency with `npm update` (or the package-manager equivalent),
verify the installed version, and run their affected admin journey.

## Migration guidance

Start by adapting existing server-authorized operations; do not replace a
backend service or duplicate a security guard in the browser. Map the app's
transport envelopes into `AdminUsersAdapter`, `AdminFeatureFlagsAdapter`, or
`AdminApiKeysAdapter`, then use the matching panel. Keep app-specific fields,
confirmation inputs, query state, and navigation outside the package.

Before deleting a local admin page, compare its behavior against the adapter:
account protections and audits remain server-owned; environment-controlled
flags must remain read-only; and API-key list responses must never carry a raw
secret. Run the package tarball verification and the consumer's normal local
admin journey after installation.
