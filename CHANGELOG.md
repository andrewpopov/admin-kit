# Changelog

## 0.5.0

- Preserve one-time API-key secrets and credential controls when a mutation or
  following metadata refresh fails, with inline retry feedback.
- Render an explicit unavailable-section state rather than substituting another
  visible admin page for a hidden or unknown route.
- Upgrade the Vitest toolchain to remediate development-only audit findings.
- Add an adapter-driven events panel for normalized audit, access, and
  operational records with declared filters, source context, details, refresh,
  and paging.

- Add a router-neutral `AdminPortal` with validated section groups,
  host-computed visibility, custom router-link rendering, responsive layout,
  disabled navigation behavior, and accessible current-page semantics.
- Enrich `UsersPanel` with opt-in search, structured account details,
  persistent host header actions, and preserved empty/error/retry behavior.
- Enrich `ApiKeysPanel` with clipboard copy feedback, safe policy details, and
  an optional host-owned credential update seam.

## 0.4.1

- Correct the GitHub-tag install command to the current release.

## 0.4.0

- Add a transport-neutral scoped-membership adapter contract, validated with
  Mizen workspace and Cairn project role vocabularies. The contract deliberately
  keeps tenant authorization, invitations, inheritance, and audit policy in the host.

## 0.3.2

- Include current compiled package artifacts in GitHub-tag installs.

## 0.3.1

- Let host-rendered API-key forms await a success result before resetting their
  local fields, and support product-specific credential titles.

## 0.3.0

- Add a host-rendered API-key creation seam for app-specific inputs such as
  expiry, scopes, and audit fields while keeping lifecycle state in the panel.

## 0.2.0

- Complete API-key administration with accessible revoke/rotate confirmation,
  validated one-time secret responses, and browser-level interaction tests.

## 0.1.2

- Let host-rendered user actions request a panel reload after their
  app-owned mutation succeeds.

## 0.1.1

- Add `UsersPanel`: a paged, adapter-backed user directory with safe
  normalized role/status changes and a host-owned seam for custom actions.

## 0.1.0

- Initial stable surface: controlled accessible React admin shell; shared panel
  state and confirmation components; capability-based users adapters;
  source-aware feature-flag panel; API-key list/create/revoke panel with
  one-time secret reveal; opt-in styles; consumer-shaped fixtures; and tarball
  installation verification.
