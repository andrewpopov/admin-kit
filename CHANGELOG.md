# Changelog

## 0.29.1

### Fixed

- `EventsPanel` and `ApiKeysPanel` keep their panel-led page header, search,
  refresh, and host actions mounted during initial loading and first-load
  errors, so routes retain one stable `h1` throughout the request lifecycle.

## 0.29.0

### Added

- `AdminPanelHeader` and the shared `headerPresentation="page"` contract for
  `UsersPanel`, `EventsPanel`, and `ApiKeysPanel`.
- `AdminWorkspace presentation="panel-led"` keeps workspace spacing and
  landmarks while removing the duplicate workspace title and content card.
- `ApiKeysPanel.headerActions` places host-owned actions beside the shared
  title and credential count.

### Changed

- Page-presented user search and event search/refresh controls now share the
  single route header band; table filters and records remain below it.

## 0.28.2

### Added

- `AdminWorkspace.showHeader` lets consumers omit the visible workspace title
  band when a nested shared panel already provides the route heading. The
  workspace keeps its shared spacing, card layout, landmarks, and accessible
  content label.

## 0.28.1

### Changed

- `AdminApp.frame` is optional. Consumers whose product chrome and grouped
  administration navigation already provide page identity can omit the outer
  masthead while retaining the canonical shared shell, layout, and capability
  registry.
- `admin-kit-conformance` accepts both framed and frameless `AdminApp`
  consumers.

## 0.28.0

### Added

- `AdminScopePicker` — a controlled, grouped scope selector for host-owned
  credential forms. Hosts supply the vocabulary (`AdminScopeGroup[]`) and own
  the selection state; the picker reports the next selection and never
  interprets scope strings.
- `AdminApiKeyForm` — a single form behind both the create and edit flows
  (name/expiry/scopes for create, scopes-only for edit), so consumers do not
  reimplement credential forms.
- `ApiKeysPanel` accepts an optional `scopeGroups` prop. When provided, the
  panel renders its own collapsible "create key" card and an inline per-key
  scope editor (wired to `adapter.create`/`adapter.update`), using
  `AdminApiKeyForm`. `renderCreate`/`renderEdit`/`renderKeys` remain as escape
  hatches and still win when passed. The built-in edit affordance appears only
  when the adapter exposes `update`.
- `AdminApiKeyCreateRequest`, `AdminApiKeyScopeUpdate` request types and their
  `validateAdminApiKeyCreateRequest` / `validateAdminApiKeyScopeUpdate`
  validators. In `scopeGroups` (built-in) mode the panel's props are a
  discriminated union that requires an adapter typed to these request shapes,
  so a mismatched adapter is a compile error rather than a runtime break.

### Changed

- The default `ApiKeysPanel` key list (the `renderKeys`-absent branch) now
  renders as a table (identity, scope chips, state pill, timestamps, actions)
  consistent with the other panels, replacing the previous plain list. Hosts
  using `renderKeys` are unaffected.

## 0.27.1

### Fixed

- Rebuild the committed `dist/` output: the v0.27.0 tag shipped a stale build
  missing the posture derivations and `renderPosture`/`renderShortcuts` slots
  it announced. No source changes.

## 0.27.0

### Added

- `summarizeAdminApiKeys`, `deriveAdminApiKeysPosture`, and
  `deriveAdminApiKeysQueue` core exports derive posture facts (active,
  revoked, expired, unused-active counts and a follow-up queue) from a set of
  API keys, carrying no copy of their own.
- `ApiKeysPanel` accepts `renderPosture` and `renderShortcuts` slots, each
  given `{ summary, posture, queue }`, so hosts can render a posture/health
  summary and navigation shortcuts above the create/list regions in their own
  vocabulary. Both slots are optional and rendered bare (no wrapper markup);
  omitting them leaves existing consumers byte-identical.

## 0.26.0

### Changed

- **Breaking:** `createFeatureFlagsAdapter` now requires `flags.loadSnapshot()`
  (a fresh read) instead of `flags.snapshot()`, making it structurally
  impossible to wire AsyncFlags' cached snapshot into the bridge's pre/post-write reads.
- Feature-flag mutability now additionally requires snapshot `health === "ok"`;
  `setEnabled` refuses while the store is unavailable.
- `normalizeAdminFailure` honors `retryable`/`code` carried by the thrown value
  and defaults `retryable` to `false` (previously always `true`).
- Date-only timestamps (`YYYY-MM-DD`) render as calendar dates without a
  timezone shift or fabricated time; impossible dates (e.g. Feb 31) are rejected.

### Fixed

- `createBackupsAdapter` passes through db-backup `state`/`error` (failed
  backups no longer render as completed) and refuses to restore non-completed
  or unknown backups with the new `BackupNotRestorableError`; non-finite
  pagination inputs clamp to defaults.
- `resolveAdminApiKeyState` resolves an unparseable `expiresAt` to `revoked`
  (never active); `validateAdminApiKeys` rejects state/timestamp inconsistencies.
- `ApiKeysPanel`, `FeatureFlagsPanel`, and `SettingsPanel` guard against stale
  async responses and in-flight mutations across adapter swaps, and clear the
  previous adapter's data on adapter change.
- `UsersPanel` reloads on any `query` change (not just `search`) and clamps to
  the last page when the collection shrinks.
- `BackupsPanel` closes the restore dialog on failure so the error is visible.
- `LogsPanel` renders the adapter's canonical source and no longer risks a
  reload loop when an adapter canonicalizes the requested source.
- `FeatureFlagsPanel` checkbox is named by its visible label with collision-safe
  ids; deprecated `AdminConsole` tablist implements the ARIA tabs keyboard pattern.
- `validateAdminEventsPage` enforces page invariants and enum membership;
  `createAdminPageFixture` supports an explicit `total` and rejects impossible pages.
- `admin-kit-conformance` frame check no longer credits a child element's
  `frame=` prop to a frameless non-self-closing `<AdminApp>`.
- `verify:pack` smokes the `./bridges` subpath; the browser test fixture is
  rendered from the real components at `test:browser` time; vitest sets an
  explicit 30s timeout so the suite passes on default invocation.


## 0.25.0

### Added

- New `./bridges` subpath export with reference adapter factories —
  `createFeatureFlagsAdapter`, `createBackupsAdapter`, and
  `createApiKeysAdapter` — that map `feature-flags-kit`, `db-backup`, and
  `api-access-kit` shaped objects onto admin-kit's `AdminFeatureFlagsAdapter`,
  `AdminBackupsAdapter`, and `AdminApiKeysAdapter` contracts. Each bridge is
  typed against a structural mirror of the backend's shape, so admin-kit
  gains no runtime dependency on any of the three packages.

## 0.24.3

### Changed

- Made `AdminAppShell` navigation independently scrollable and compacted its mobile trigger.
- Added explicit empty-state guidance and primary recovery action styling to `BackupsPanel`.
- Allowed hosts to name an `EventsPanel` refresh action by scope.

## 0.24.2

### Fixed

- `AdminAppShell` now generates a unique mobile-navigation ID for each mounted
  shell, preserving unambiguous `aria-controls` relationships.

## 0.24.1

### Changed

- `AdminAppShell` no longer requires a frame when host chrome already supplies
  the application identity.

## 0.24.0

### Added

- `AdminAppShell` gives URL-owning hosts a responsive canonical admin frame,
  desktop/mobile navigation landmarks, and route-aware navigation render seam.

## 0.23.1

### Fixed

- `admin-kit-conformance` now ignores generated Next.js build output, while
  continuing to reject host source files that override core theme tokens.

## 0.23.0

### Changed

- Boolean `SettingsPanel` fields now use the shared labelled switch treatment
  instead of a detached checkbox.

## 0.22.0

### Added

- `UsersPanel` custom columns can opt into server-backed sorting and declare an
  initial sort direction.
- `AdminSwitch` provides a labelled, full-row binary setting control.
- `OperationalJobsPanel` accepts an explanatory zero-run state.

### Changed

- `EventsPanel` can render administrative events as a scan-first semantic table.

## 0.21.2

### Fixed

- Conformance now proves the stylesheet is loaded from a `main` or `layout`
  entry point and requires every direct consumer declaration to pin this release.
- Tarball verification includes failure canaries for missing entry-point CSS and
  an outdated consumer package tag.

## 0.21.1

### Fixed

- `admin-kit-conformance` now discovers package manifests in workspace consumers.

## 0.21.0

### Added

- `admin-kit-conformance`, a consumer CLI that enforces the shared stylesheet,
  framed `AdminApp`, and non-overridable core theme contract.

## 0.20.0

### Changed

- `AdminApp` now requires an application-level `frame` with a title and owns
  the canonical themed header around grouped administration navigation.
- The named `core` theme is the required visual boundary for `AdminApp`,
  `AdminWorkspace`, and `AdminTheme`; the old opt-in, host-overridable styling
  model is no longer the supported contract.

### Added

- `AdminTheme`, `AdminCard`, `AdminField`, and `AdminStack` for product-specific
  extension content that keeps the same visual system as kit-owned panels.

## 0.19.1

### Added

- `AdminApp`, the canonical grouped administration shell. Its required
  capability registry makes duplicate generic workflows a definition error and
  provides one migration target for every host app.
- Product-specific sections can declare a namespaced `custom:<name>` capability
  alongside the kit-owned workflows.

### Deprecated

- `AdminConsole`. Use `AdminApp` for new administration areas.

## 0.18.0

### Added

- `SessionsPanel` and `AdminSessionsAdapter`, an active-session administration
  surface proven against Bewks, Sano OS, and Smarthome. It shares safe metadata
  rendering, destructive confirmation, last-good-state retention, and
  authoritative reload behavior while hosts retain token storage, current
  device handling, authorization, auditing, and exact bulk-revocation semantics.
- `LogsPanel` and `AdminLogsAdapter`, a runtime-output surface proven against
  Bewks, Savoro, and Smarthome. It supports declared or dynamic sources,
  bounded snapshots, optional level/category filters, search, refresh,
  optional polling, copy feedback, and stale-response protection while hosts
  retain parsing, file-system policy, redaction, retention, and authorization.
- Package-owned `setRole` and `setStatus` callbacks in custom user-table cell
  context, so rich host tables retain mutation state and inline error handling.

## 0.17.0

### Added

- `MembershipsPanel`, a scoped access surface proven against Cairn and Savoro
  workflows. It shares loading, mutation, semantic-table, and destructive
  confirmation behavior while leaving identity search, invitation delivery,
  inheritance, authorization, and audit policy in the host.
- Per-membership `canChangeRole` and `canRemove` presentation permissions.
  Inherited memberships are validated as informational and cannot expose
  mutations.
- `UsersPanel.columns`, an opt-in typed table schema for hosts that need
  scan-first account columns. The default portable user/role/status layout is
  unchanged for existing consumers.

## 0.16.0

### Added

- `AdminActionButton`, the shared neutral, primary, and destructive button
  primitive for host-rendered admin actions. It defaults to `type="button"` so
  toolbar actions cannot accidentally submit an enclosing form.
- A Chromium regression fixture that verifies one page landmark and proves that
  a narrow users table remains inside its own horizontal scroller at 390px.
- Pull-request, main-branch, and tag release checks for unit, type, tarball,
  generated-asset, and browser verification.

### Changed

- `AdminWorkspace` accepts `as="section"` for composition in a host-owned main
  landmark; standalone routes retain the `main` default.
- Portal group labels are presentational navigation labels instead of document
  headings, preventing navigation from preceding the route's page heading.
- The workspace header and content now establish shrinkable layout boundaries,
  so wide tables no longer expand the document on narrow screens.

## 0.15.0

### Fixed

- **Dark mode no longer renders unreadable primary and destructive buttons.**
  `--admin-kit-accent` was serving as both a text color and a button fill, so the
  dark theme's pastel accent sat under hardcoded white label text: 1.75:1 on
  primary buttons, 1.47:1 on hover, and 1.95:1 on the danger button — including
  the "Revoke key" confirmation. New `--admin-kit-on-accent` / `--admin-kit-on-danger`
  foreground tokens take those pairs to 10.44:1, 12.42:1 and 9.34:1.
- **A failed mutation no longer destroys the loaded view.** `FeatureFlagsPanel`
  and `UsersPanel` wrote mutation errors into the state that gated the whole
  render, so one rejected toggle or role change blanked the entire list. They now
  use the load-error/action-error split `ApiKeysPanel` already had: the list stays
  mounted and the failure reports inline.
- **Operational jobs and backups no longer truncate silently.** Both panels
  requested page 1 with a hardcoded page size, discarded `total`, and rendered no
  pager, so a host with more rows than one page could never reach them — and the
  header count reported the page length as if it were the total. Both now paginate
  and report the true total.
- **Backup restore requires confirmation.** It previously ran a destructive restore
  from a single row-button click, while the far less destructive API-key revoke
  already required a dialog.
- **`AdminConfirmationDialog` is a real modal.** It declared `aria-modal="true"`
  while Tab walked straight out into the page behind it. It now renders through a
  portal (with an inline fallback so the kit stays server-renderable), traps focus,
  closes on Escape, and restores focus to the trigger. Its element ids come from
  `useId`, so two dialogs no longer collide.
- **Confirming an action twice no longer runs it twice.** The dialog stayed open
  while the handler awaited and its Confirm button had no pending state, so a
  double-click could rotate a key twice (silently discarding the first secret) or
  double-revoke (reporting a false failure for an operation that had succeeded).
- **`EventsPanel` no longer displays results for the wrong query.** It refetched
  per keystroke with no staleness guard, so a slow response for an earlier query
  could overwrite a newer one. It now uses the same `latestLoadId` guard as
  `UsersPanel`, and debounces search input.
- Removed three `!important` declarations from `.admin-kit__button--danger`. They
  existed only because the shared button skin left its pseudo-classes outside
  `:where()`, inflating specificity; hosts can now override the danger button
  without `!important`, as the styling contract always claimed.
- The `running` state pill is now visible. The contract has always allowed
  `completed | running | failed`, but only two were styled.

### Added

- `--admin-kit-success`, `--admin-kit-warning`, `--admin-kit-on-accent`,
  `--admin-kit-on-danger` and `--admin-kit-danger-strong` tokens. Status colors and
  the secret-reveal callout now theme through variables rather than hardcoded hexes.
- Opt-in system dark mode via `data-admin-kit-theme="auto"`. `.dark` remains
  authoritative and unchanged, so class-mode hosts are unaffected — an
  unconditional `prefers-color-scheme` rule would have overridden a user who
  explicitly chose light while their OS was dark.
- `formatTimestamp` on the events, API-key and operational panels, with a default
  `Intl.DateTimeFormat` presentation. Values that do not parse as dates pass
  through unchanged, so adapters already supplying pre-formatted text keep working.
- Exported `OperationalJobsPanelProps`, `BackupsPanelProps`, `SettingsPanelProps`
  and `AdminStatusSummaryProps`. These panels previously exported values only, so
  hosts could not name their props.
- `className` on the operational panels, `title` on `UsersPanel` and
  `FeatureFlagsPanel`, `runLabel` on `BackupsPanel`, and `pageSize` on the
  operational panels. All optional and defaulted to current behavior.

### Changed

- `react-dom` is now a peer dependency (the dialog imports `createPortal`), and the
  supported React range widens to `^18 || ^19`.

## 0.14.1

- Render only populated user-directory columns and keep table-cell layout
  semantic, avoiding empty Details columns and flex styling that breaks column
  alignment.

## 0.14.0

- Let user-directory adapters declare per-account role and status mutation
  permissions, so protected accounts retain a readable value without exposing
  a control that policy forbids.

## 0.13.1

- Apply the shared responsive table contract to backup and operational-job panels, including scoped headers and action semantics.
- Report run and restore failures in the owning panel instead of silently clearing the busy state.

## 0.13.0

- Standardize responsive administrative-table styling across user and operational surfaces.

## 0.12.0

- Add settings dirty/save feedback and improve operational-table header semantics.

## 0.11.1

- Document the default workspace and the boundary between backup and operational-job panels.

## 0.11.0

- Add a reusable operational-jobs panel for scheduled, import, sync, and retention runs.

## 0.10.0

- Add reusable operational status, backup lifecycle, and settings panels with host-owned adapters.

## 0.9.0

- Add the `AdminWorkspace` default page layout for shared administrative and operational screens.

## 0.8.0

- Render user management as a responsive semantic table while preserving adapter-driven role and status controls.

## 0.7.0

- Add host `className` styling seams to all shared panels and state surfaces,
  plus a dedicated class for portaled API-key confirmation dialogs.
- Document supported token and class overrides so applications can adopt the
  defaults or deliberately theme Admin Kit locally.

## 0.6.0

- Give shared admin panels a cohesive light and dark visual system: elevated
  surfaces, readable form controls, action hierarchy, responsive controls, and
  clearer confirmation dialogs.
- Expose expanded host-overridable palette, radius, and shadow tokens.

## 0.5.3

- Make API-key styles work without an optional `.admin-kit` wrapper, including
  portaled confirmation dialogs, and provide a readable dark-mode palette.

## 0.5.2

- Resolve revoked and expired API-key state from durable safe metadata before
  rendering lifecycle actions.
- Expose the package-owned metadata update lifecycle to custom credential rows.

## 0.5.1

- Let host applications render policy-specific API-key rows while Admin Kit
  retains safe metadata validation, one-time secret handling, pending state,
  and destructive-action confirmation.

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
