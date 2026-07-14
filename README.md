# @andrewpopov/admin-kit

Router-neutral, capability-driven React primitives for administration surfaces.
It provides the common shell and interaction behavior for admin pages while
each application retains its routes, API client, user model, policy, server
authorization, and product-specific pages.

## What belongs here

- Controlled tab navigation and grouped, routed admin-portal composition.
- Shared loading, error, empty, and confirmation interactions.
- Serializable adapter contracts and consumer-shaped test fixtures.
- User-management, feature-flag, and API-key modules. User management, backups, and operational jobs render through the same responsive semantic-table contract, with horizontal scrolling on narrow screens.
- `AdminWorkspace`, the default header, summary, toolbar, and content framing for operational pages.
- Typed operational status, backup, and settings panels for consistent recovery and configuration surfaces.
- An operational-jobs panel for scheduled work where backup/restore semantics do not apply.
- An adapter-backed administrative events panel with declared filters, source
  context, safe metadata details, refresh, and paging.
- A scoped-membership adapter contract for workspace, organization, and project
  administration; a React membership panel is intentionally deferred until
  multiple host adapters prove the interaction requirements.

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
npm install github:andrewpopov/admin-kit#v0.11.0
```

`react` is a peer dependency. Import default styles only if they suit the host
application; the components also work with host-owned styling.

```ts
import "@andrewpopov/admin-kit/styles.css";
```

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
}

.acme-admin__users .admin-kit__user { box-shadow: none; }
.acme-admin__keys > button { border-radius: 999px; }
```

`AdminConsole` and `AdminPortal` already expose `className`; the same is now
available on `UsersPanel`, `FeatureFlagsPanel`, `EventsPanel`, `ApiKeysPanel`,
and `AdminPanelStateView`. Their stable `admin-kit__*` classes are supported
styling hooks. API-key confirmations are portaled outside the panel wrapper, so
apply any dialog token overrides to an app-level wrapper or target the supplied
`dialogClassName` directly.

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
and declared role/status controls. Supply `search` only when the host adapter
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

### Operational workspace

Use `AdminWorkspace` as the default frame for every administrative route. It
owns semantic page framing and consistent layout; the host still owns route
guards, product wording, and action semantics. Put dense records in tables and
put health facts in `AdminStatusSummary` rather than creating one-off metric
cards.

`BackupsPanel` is only for hosts that expose real backup artifacts and an
authorized restore operation. Use `OperationalJobsPanel` for scheduled tasks,
imports, synchronizations, and retention work. `SettingsPanel` maps a
host-owned load/save adapter to typed text, sensitive, and boolean fields; it
does not infer setting keys or make policy decisions.

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
```

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
