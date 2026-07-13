# @andrewpopov/admin-kit

Router-neutral, capability-driven React primitives for administration surfaces.
It provides the common shell and interaction behavior for admin pages while
each application retains its routes, API client, user model, policy, server
authorization, and product-specific pages.

## What belongs here

- Controlled admin navigation and accessible panel semantics.
- Shared loading, error, empty, and confirmation interactions.
- Serializable adapter contracts and consumer-shaped test fixtures.
- Future user-management, feature-flag, and API-key modules.

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
npm install github:andrewpopov/admin-kit#v0.1.0
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

### Feature flags

`FeatureFlagsPanel` and `AdminFeatureFlagsAdapter` require the host to declare
each flag's effective source and store health. A flag controlled by an
environment value, a default, or a store-error policy is shown as read-only;
the panel never suggests a toggle can change it. After a successful mutation,
the panel reloads the host snapshot rather than assuming the requested value
won precedence.

### API keys

`ApiKeysPanel` lists only safe metadata. A raw key secret can enter the panel
only as a create or rotate response; it is never part of `AdminApiKey`, so a
list response cannot accidentally re-reveal it.

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
