# @andrewpopov/admin-kit

Router-neutral, capability-driven React primitives for administration surfaces.
It provides the common shell and interaction behavior for admin pages while
each application retains its routes, API client, user model, policy, server
authorization, and product-specific pages.

## What belongs here

- Controlled admin navigation and accessible panel semantics.
- Shared loading, error, empty, and confirmation interactions.
- Serializable adapter contracts and consumer-shaped test fixtures.
- User-management, feature-flag, and API-key modules.
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
npm install github:andrewpopov/admin-kit#v0.3.2
```

`react` is a peer dependency. Import default styles only if they suit the host
application; the components also work with host-owned styling.

```ts
import "@andrewpopov/admin-kit/styles.css";
```

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

## Core contracts

`@andrewpopov/admin-kit/core` has no React dependency. It exports console
definition validation, paged-resource types, and transport-neutral failure
normalization. `@andrewpopov/admin-kit/testing` exports small immutable
fixtures for adapter and consumer-shaped tests.

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

`UsersPanel` renders the paged normalized directory and declared role/status
controls. Supply `renderUserActions` for product-specific actions such as a
delete flow with app-owned confirmation copy, audit requirements, or extra
input. Its callback receives a `reload` function after a successful host
mutation; the generic panel never assumes destructive-action semantics.

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
list response cannot accidentally re-reveal it.

Use `renderCreate` when the host needs a product-specific input form (for
example, name, expiry, scopes, or an audit reason). The callback receives the
package-owned create operation and pending state; its promise resolves to
`true` only when creation succeeded, so the host can safely clear its form.
Use `title` to keep product vocabulary accurate (for example, "Personal access
tokens"). The host retains its form schema and validation.

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
