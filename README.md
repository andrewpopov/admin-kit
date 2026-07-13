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
import '@andrewpopov/admin-kit/styles.css';
```

## Controlled shell

The host owns the active section and maps it to any URL or router shape.

```tsx
import { AdminConsole } from '@andrewpopov/admin-kit/react';

<AdminConsole
  activeSection={section}
  onSectionChange={setSection}
  sections={[
    { id: 'users', label: 'Users', render: () => <UsersPanel /> },
    { id: 'settings', label: 'Settings', render: () => <SettingsPanel /> },
  ]}
/>;
```

## Core contracts

`@andrewpopov/admin-kit/core` has no React dependency. It exports console
definition validation, paged-resource types, and transport-neutral failure
normalization. `@andrewpopov/admin-kit/testing` exports small immutable
fixtures for adapter and consumer-shaped tests.

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
