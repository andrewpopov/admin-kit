---
kind: breaking
summary: AdminUsersAdapter drops create, invite, resetCredentials, and delete — UsersPanel never called them
---

`AdminUsersAdapter` no longer declares `create`, `invite`, `resetCredentials`, or `delete`. A repo-wide audit confirmed `UsersPanel` only ever reads `list`, `setRole`, and `setStatus` from the adapter; supplying any of the four removed members had no panel behavior and no package-owned lifecycle, so keeping them declared was a false compatibility promise. Hosts that were passing one of these must move that flow to the render seams `UsersPanel` already supports: compose host-owned create/invite forms through `renderHeaderActions`, and product-specific edit, credential-reset, deactivate, or delete flows through `renderUserActions`. `defineAdminUsersAdapter` also drops its now-unused `CreateInput`/`InviteInput`/`DeleteInput` type parameters, and the `AdminUserActionTarget` type is removed along with them.
