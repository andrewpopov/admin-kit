# Changelog

## 0.48.0

### Added

- AdminPanelHeader gains a collapsible band, so the description, status, search and filters above a table fold away with one Hide controls button while the title, actions and applied-filter chips stay
  `AdminPanelHeader` takes a `summary` slot (status tiles or a status line between `detail` and `toolbar`) and a `collapsible` prop (`storageKey`, `collapsedSummary`, `activeCount`, `defaultCollapsed`). The title row gains a real button that reads "Hide controls" or "Show controls" with a chevron, `aria-expanded` and `aria-controls`; the collapsed region is `hidden`, so it leaves the tab order, and focus stays on the toggle. Collapsed, the title row shows `collapsedSummary` inline from 64rem and on its own line below it. The band starts collapsed below 64rem wide or 45rem tall and expanded above, and the viewer's choice is kept in `localStorage` under `admin-kit:header:<storageKey>:<regular|compact>`, one key per width class. Storage that throws is tolerated. A client-rendered host reads the stored state in its first render, so nothing shifts on first paint; a server-rendered host renders expanded and collapses when it hydrates, which can shift the layout once. The collapsed summary line scrolls sideways with an edge fade when its chips overflow. `AdminFilterChip` is the removable applied-filter chip for the summary line; removing one hands focus back to the toggle. `AdminWorkspace` takes the same `collapsible` prop and then renders its framed header through `AdminPanelHeader`. `EventsPanel`, `UsersPanel` (whose `renderHeaderPrimaryActions` stays in the title row), `ApiKeysPanel` and `OperationalJobsPanel` take `headerCollapsible` and `headerSummary` (`OperationalJobsPanel` also takes `headerPresentation` and now draws its title band with `AdminPanelHeader`), so one band covers kit panels and host pages. `EventsPanel` and `UsersPanel` show applied filters as chips while collapsed.
  
  Panel text fixes ride with it. The `EventsPanel` table's Event cell shows the action and "returned N" from `metadata.status` (the message when there is no HTTP status of 100 to 599) instead of printing the request path twice; Resource wraps to two lines with its full value in a `title`, and the time no longer breaks inside the clock value. Search fields keep room for their placeholder, `AdminActionButton` keeps a gap between icon and label, the Details column header uses the same heading structure as the others, and long panel titles wrap instead of running off the page.
- AdminDataTable fill prop sizes the table to the viewport; fill columns get a preferred fillWidth; the app frame's minimum height is a public token
  `AdminDataTable` takes `fill` (and each table panel passes it through as `tableFill`): the table's height is the space from its top down to whatever sits below it (pagination, the frame's padding), measured again whenever anything above or below it resizes, with a floor of 20rem or 60% of the viewport, whichever is smaller. It scrolls inside its own box under the pinned header and the page does not scroll; stacked cards keep the page flow. Focus now moves clear of the pinned header on every non-stacked table. The fill column (no `defaultWidth`) prefers `fillWidth` px (default 280; `UsersPanel` custom columns take it as `fillWidth`), and sized columns shrink toward their `minWidth` before it drops below that. `.admin-kit__app` and `.admin-kit__app-shell` read `min-block-size` from the new public `--admin-kit-app-min-block-size` token (default `100dvh`), so a host with its own header can subtract it and avoid dead page scroll. The token is accepted by `admin-kit-conformance`.

### Changed

- EventsPanel and OperationalJobsPanel headers re-lay out, and every admin-kit button is now inline-flex, even for hosts that do not use the collapsible band
  `EventsPanel` moves its search and its category, severity and outcome filters into the header toolbar (in the loading and error states too) and shows Refresh as a secondary button in the title row, so the table sits 17 to 28px lower than before. `OperationalJobsPanel` now draws its title band with `AdminPanelHeader`; on phones the Run button is full width and the table starts about 60px lower at 390px wide. `.admin-kit__button` (including `AdminActionButton`) is `display: inline-flex` with a 0.375rem gap and centred content, so an icon beside a label no longer touches it; a host that styled these buttons as `inline-block` should check them. Search fields reserve up to 20rem so their placeholder is not clipped, and the Users header toolbar now grows to fill its row.

## 0.47.1

### Fixed

- AdminDataTable cell content stays inside its cell: controls and wrapped values never spill into a neighbour, nowrap user columns end in an ellipsis, stacked-card labels never break mid-word and stack above the value under 340px, cells that render nothing drop out of cards, and the row-details toggle is a 44px target on cards and coarse pointers
  Tables that fit their container by width alone could still paint a cell's content over the next column: timestamps ran into each other and a Delete button covered a Status select. Cells now clip at their own edge, selects, inputs and buttons shrink to the cell instead of overflowing it, and a `nowrap` UsersPanel column truncates with an ellipsis. UsersPanel Role and Status keep room for the widest option, and ApiKeysPanel State keeps room for its pill. Custom UsersPanel columns accept `width` and `minWidth` so a host can reserve what its controls need. In stacked cards the label track sizes to its longest word, so "Deployment" and "Verification" stay whole, and below 340px the label sits above its value; a cell that renders null, false, an empty string or an empty fragment no longer leaves a label or a row. The "View"/"Hide" toggle grows to 44 by 44 pixels when cards stack or the pointer is coarse.

## 0.47.0

### Breaking

- styles.css is now in the `admin-kit` cascade layer, so every host must declare that layer in an `@layer` order statement before the kit import; adds public type tokens and sentence-case column headers
  The whole stylesheet is wrapped in `@layer admin-kit`. A layered rule loses to every unlayered rule, so a host that has not declared the layer will see an unlayered reset (including the Tailwind 3 preflight and a plain global `button { background }`) beat the kit: card borders go to 0, primary buttons turn transparent and padding collapses.
  
  Migration:
  
  - Declare the layer order in a host stylesheet that is seen before the kit import, for example `@layer theme, base, admin-kit, components, utilities;` placed before `@import "tailwindcss"` and before `@andrewpopov/admin-kit/styles.css`. `admin-kit-conformance` now fails when no host CSS file declares an `@layer` order statement containing `admin-kit`.
  - Move any unlayered reset (including the Tailwind 3 `@tailwind base`) into a layer declared before `admin-kit`.
  
  Other visible changes:
  
  - The generic button, input and select rules no longer match every control under `.admin-kit`. Host buttons placed in kit chrome (panel header actions, workspace toolbars, card actions) lose the kit button look and need the `admin-kit__button` class to keep it.
  - `.admin-kit` now sets `font-size` from `--admin-kit-text-body-size` (1rem) instead of inheriting the host size, and a new `.admin-kit :where(small)` rule restyles host `<small>` at the caption size.
  - New public tokens: `--admin-kit-font-family`, `--admin-kit-text-{page-title,title,body,body-sm,caption}-{size,leading}`, `--admin-kit-weight-title`, `--admin-kit-weight-strong` and `--admin-kit-table-heading-transform`, all overridable by hosts and accepted by conformance.
  - Table column headers are sentence case (set `--admin-kit-table-heading-transform: uppercase` to restore), page and panel titles weigh 600, and state pills and outcome badges drop `text-transform` and use the caption size at 600.

### Added

- AdminDataTable fits its container: defaultWidth is a preferred width that shrinks to minWidth, columns take a priority (tertiary then secondary hide before anything scrolls), rows stack into cards only when the primary columns cannot fit, cells can claim a cardSlot (title, badge, meta, detail, actions), every cell value sits in one .admin-kit__cell-value element, and expandedKeys / onExpandedChange control row expansion. ApiKeysPanel and UsersPanel use the same fit, so the responsive key presentation no longer needs a host viewport hook
  A table beside a side rail or inside a narrow panel no longer scrolls sideways: it drops its least important columns first, keeps their values one click away in the row details, and turns into compact cards only when its main columns cannot fit. Measured in Cairn, 7 of 9 admin tables overflowed at 1024px before this change.

### Changed

- Existing AdminDataTable hosts see a new layout: tables stack into cards from the measured container width instead of the 48rem viewport query, columns with a defaultWidth shrink toward minWidth, a non-resizable column without a minWidth keeps its defaultWidth, columns hidden by priority stay reachable in a row details toggle, every cell value is wrapped in .admin-kit__cell-value (selectors that targeted a direct td child must target that wrapper), UsersPanel priority hiding no longer uses CSS container queries, and ApiKeysPanel presentation=responsive always renders the table
  Hosts that styled AdminDataTable cells with `td > …` selectors, relied on the 48rem card breakpoint, or gave Actions columns no `minWidth` should re-check those tables; a classic always-visible scrollbar now reserves its gutter so the layout cannot flip between table and cards.

## 0.46.1

### Changed

- Resolve @andrewpopov dependencies from the fleet registry
  Installs now resolve `@andrewpopov` dependencies from the fleet registry at `https://npm.tail615381.ts.net/` through a committed `.npmrc`, pinned to the same exact versions as before, instead of from `github:andrewpopov/<kit>#<tag>` git refs. There is no behaviour change.

### Fixed

- admin-kit-conformance accepts an exact registry version pin
  The pin check required the specifier to contain `v<version>`, so a consumer that installs admin-kit from the fleet npm registry with an exact version (`"0.46.1"`, BRAIN-1006) failed conformance. It now accepts the exact version, or a `github:` pin whose ref is `v<version>`; a different version, a range, or a version that only shares a prefix is still refused.

## 0.46.0

### Added

- Data table columns can be resized with single clicks from a menu on the resize handle
  Clicking a column's resize handle (without dragging) opens a small menu with Narrower, Wider and Reset width buttons and moves focus to it, so a pointer user without a keyboard can resize and reset a column with single clicks, as WCAG 2.2 SC 2.5.7 (Dragging Movements) asks. Narrower and Wider step 32px within the column's bounds, and every change is remembered through `storageKey` exactly as drag and keyboard changes are. Escape or a click elsewhere closes the menu, and Escape returns focus to the handle. A small pointer wobble under 4px no longer nudges the width, so a click never resizes by accident. Dragging, the arrow keys, Home and double-click behave as before.

### Fixed

- The API keys table fits a 72rem content column again
  In 0.45.0 the `ApiKeysPanel` table's columns added up to a 1280px minimum width, wider than a typical admin content column (about 1144px in Cairn at 1920px). A host that shows the table only when it fits therefore always fell back to cards. The default widths are now Scope and Details 176px, State 88px, and Created, Last used and Expires 120px each, for a 1128px minimum, and a unit test keeps that minimum within 72rem. Widths a viewer has already resized and stored are unchanged.

## 0.45.0

### Changed

- The users, memberships, sessions, API keys, operational jobs and backups tables now use the resizable data table, with an optional storageKey to remember column widths
  `UsersPanel`, `MembershipsPanel`, `SessionsPanel`, `ApiKeysPanel` (its table presentation), `OperationalJobsPanel` and `BackupsPanel` now render through `AdminDataTable`. Their columns can be resized by drag or keyboard, the header stays pinned inside the table's own scroll box, and below 48rem every one of them becomes labelled cards instead of scrolling sideways. Each panel takes an optional `storageKey` that remembers column widths per viewer. Action columns keep a fixed width. Cell content, buttons, sorting and confirmation flows are unchanged. `AdminDataTable` gains `rowBusy`, `renderExpansion` (a caller-controlled full-width row, used for the API key scope editor) and per-column `sort`, `headerContent` and `headerClassName`. Its cells now wrap long unbroken values rather than spilling into the next column. The per-table `min-width` rules and the users and backups phone card blocks are removed because the shared data-table rules cover them; `.admin-kit__key-timestamp` no longer forces one line.

## 0.44.0

### Added

- AdminDataTable, a data table with resizable columns, a sticky header, truncation and expandable rows; EventsPanel's table uses it
  `AdminDataTable` sizes columns with a `<colgroup>`, lets viewers resize them by drag or keyboard (`role="separator"` handles), keeps the header sticky inside its own scroll area, truncates long values to one line with the full value in a tooltip and an expandable details row, persists widths per viewer in localStorage under `storageKey`, and keeps the stacked card layout below 48rem. `EventsPanel presentation="table"` now renders through it: the Event column fills the width, timestamps show a relative time under the absolute one, the details disclosure expands a full-width row with the whole record, and a new `storageKey` prop persists column widths. The old `min-width: 64rem` on `.admin-kit__events-table` is replaced by a minimum computed from the column widths. The table now scrolls inside its own box (`--admin-kit-data-table-max-height`, default `min(70vh, 48rem)`) so its header can stay pinned; set that property to `none` to restore page-level scrolling.

## 0.43.1

### Changed

- Installing from git no longer runs a full dependency install: the `prepare` script is gone (run `npm run hooks` once after cloning) and `build` is now `compile`
  The committed `dist/` is what consumers load, so no install-time step is needed. Run `npm run hooks` once after cloning to enable the pre-push gate.

## 0.43.0

### Added

- AdminPortal stickyMobileToggle option pins the phone Menu toggle to the top of the viewport
  Pass `stickyMobileToggle` to AdminPortal (or AdminApp) to keep the phone Menu toggle pinned to the top of the viewport on long pages. Off by default; desktop is unaffected.
- Opt-in admin-kit__table--stack-narrow stacks tables into cards only below 30rem
  Put `admin-kit__table-wrap--stack-narrow` on the wrap and `admin-kit__table--stack-narrow` on the table to get the labelled-card layout only at 30rem and below, so a landscape phone keeps the table. The existing `--stack` modifier still stacks at 48rem.

### Changed

- Update shared release notes tooling
  Refresh the shared release notes package pins and lockfiles. Full release verification and production rollout remain with the next release candidate.

### Fixed

- admin-kit__stack and admin-kit__panel-header use a shrinkable column so wide nowrap children scroll instead of widening the page
  Both grids had an implicit auto column, so a wide nowrap child such as a tab strip widened the page. They now use `minmax(0, 1fr)`, and the child scrolls inside its own box.
- AdminPortal keeps its navigation and Menu toggle around the not-found and unavailable-section fallback
  When the active section was unknown, unavailable or gated, AdminPortal returned only the fallback with no navigation. It now renders the normal shell around it, and a custom `inactiveSectionState` still shows inside the shell. With zero visible sections the empty state is unchanged.
- Row-header th cells in the last table row no longer draw a stub bottom border
  The last-row border reset covered `td` only, so a row-header `th` drew a hairline under every table. The reset now covers `th` too, and stacked cards keep their divider under the row header.

## 0.42.0

### Added

- A reusable release notes page for every signed-in user
  ReleaseNotesPanel provides history previews, deep-linked full notes, paging and loading, empty, missing and retry states. Mount it in the product shell without an admin-role gate. Hosts keep routes, session checks, note storage and safe Markdown rendering.

## 0.41.0

### Added

- Opt-in graphite palette for AdminApp and AdminTheme
  `AdminApp` and `AdminTheme` accept `palette="graphite"`, which recolors the core theme with a neutral grey-blue ramp by adding `admin-kit--palette-graphite` to that boundary. It is a palette rather than a second theme: `theme` and `data-admin-kit-theme` stay `core`, dark values ride the existing `.dark` / `auto` mechanism, and conformance keeps enforcing the same contrast contract against the palette's own values.
  
  Every nested Admin Kit boundary inherits the palette, including `AdminAppShell` and `AdminPortal` (which take no `palette` of their own) and the dialogs and confirmations that portal to `document.body`. A boundary that omits `palette` inherits the surrounding one, so the default palette is not nameable and `AdminPaletteName` is `"graphite"` only — a nested surface cannot opt back out of graphite while its inline descendants stay recolored.
  
  Consumers that do not pass `palette` are unchanged.

## 0.40.0

### Fixed

- Frames fill the viewport, phone content aligns with the frame header, and a single-section AdminApp or AdminPortal drops its navigation
  `AdminApp` and `AdminAppShell` now fill the viewport height (`min-block-size: 100dvh`), so on a short page the host page's background no longer shows as a band below the frame. At phone widths a page workspace inside a frame no longer adds a second 1rem inset, so page content lines up with the frame header. Desktop spacing is unchanged.
  
  A portal with exactly one visible section no longer renders the section rail or the phone Menu toggle, and its content spans the full width (`.admin-kit__portal--single`); the skip link, landmarks and content focus target are unchanged. This is the default with no opt-out, so a host that relied on a one-link rail now gets none. `AdminAppShell` is unchanged because the host renders its own navigation there.

## 0.39.0

### Added

- AdminApp renders a localisable Skip to content link (labels.skipToContent) that focuses a stable content region, and AdminPanelStateView loading accepts skeletonRows for placeholder bars.
  The skip link is hidden until keyboard focus, then shows with the kit focus ring; it targets a `tabindex="-1"` content div rather than a second `main`. `skeletonRows` (1 to 12) renders aria-hidden bars beside a visually hidden polite label and animates only under `prefers-reduced-motion: no-preference`; the default loading output is unchanged.

### Fixed

- Text inputs, selects, textareas and the switch track use a new internal --admin-kit-control-border token that clears WCAG 1.4.11 3:1 against both surfaces in light and dark; OperationalJobsPanel stacks into labelled cards on phones instead of scrolling sideways.
  `--admin-kit-control-border` is internal and locked like the other non-brand tokens (`#7c8798` light, `#6f80a0` dark); `--admin-kit-border-strong` is unchanged. OperationalJobsPanel gains the existing stacked-table modifier and mobile cell labels.
- Dialogs taller than the viewport now scroll only their body (header, Close and actions stay in view, so a focused field is never hidden), Close is a 44px target, stacked dialogs trap Tab and Escape only in the topmost one, and portaled dialogs opened inside AdminTheme inherit host theme overrides (a host rule on .admin-kit.admin-kit--theme-core now rebrands them).
  AdminDialog and AdminConfirmationDialog cap at the viewport height; only `.admin-kit__dialog-body` scrolls, so the header, Close and actions stay visible and keyboard focus is never obscured. When a confirmation opens over a dialog, only the topmost modal handles Tab and Escape. Under `data-admin-kit-theme="auto"` with a dark OS, nested core boundaries (including portaled dialogs) get the dark tokens; nested AdminPortals mint their own content ids. Inside an AdminTheme, the portaled surface is wrapped in an `admin-kit admin-kit--theme-<name> admin-kit--layer` element (display: contents) so host token overrides reach it; outside AdminTheme nothing changes.
- Polish found by a downstream design audit: table header styling now applies only to column headers (row headers read as body text), AdminMobileCellLabel is aria-hidden so the thead is not announced twice, a disabled primary button keeps at least 4.5:1 text contrast instead of dimming with opacity, and the phone app header is compact so content starts higher.

## 0.38.0

### Changed

- Opt-in stacked table modifier turns rows into labelled cards on phones; EventsPanel uses it
  Add an opt-in `admin-kit__table-wrap--stack` / `admin-kit__table--stack` modifier pair: below the phone breakpoint each row becomes a labelled card with no horizontal scrolling, using `AdminMobileCellLabel` (now exported) in each cell. `EventsPanel` uses it. Desktop is unchanged, and the backups and users tables keep their own rules.
  
  On fine-pointer desktops the portal navigation is denser (tighter link padding and gaps) so a 15-item rail fits without clipping; phones and coarse pointers keep 44px targets.

## 0.37.0

### Added

- EventsPanel accepts optional columns and emptyState props
  `columns` chooses which of occurred, event, actor, resource and outcome render (table and feed); `emptyState` replaces the default empty content. Defaults are unchanged.
- AdminPortal and AdminApp collapse navigation behind a Menu toggle below 48rem
  Below 48rem the portal navigation is collapsed behind a single "Menu" button (aria-expanded/aria-controls, 44px target). Escape and choosing a section close it and return focus to the button, so content comes first on phones. Desktop layout is unchanged. Use the new optional `mobileNavigationLabel` prop to localize the label.

### Changed

- One shared 2px accent focus ring now also covers links, textareas and summaries
  The three focus treatments are consolidated into one 2px accent `:focus-visible` ring with a 2px offset, and it now also covers links, textareas and summaries (navigation links previously used the browser default).

### Fixed

- AdminApp and AdminAppShell frames paint the themed surface background in light and dark
  The `AdminApp` and `AdminAppShell` frames now paint `--admin-kit-surface`, so hosts no longer show a transparent white canvas in dark mode.
- A page-presentation panel title renders as h2 under an app frame so the page keeps one h1
  With an `AdminApp` or `AdminAppShell` `frame`, a panel using `headerPresentation="page"` now renders its title as an h2 with the same visuals, so the page keeps exactly one h1. Without a frame nothing changes.

## 0.36.1

### Changed

- Let hosts use consistent product vocabulary throughout API key panels
  `ApiKeysPanel` can now apply a host-provided singular and plural name to counts, states, actions, forms, and confirmation dialogs while preserving the existing API-key defaults.

## 0.36.0

- Panel reload effects now depend on stable callback identities. Adapter-backed
  panels memoize reload callbacks and let effects depend on those callbacks
  directly, preserving stale-request guards while eliminating ambiguous hook
  dependency lists.
- The browser fixture now unmounts its React root inside `act`, so its clean-up
  no longer emits a misleading test-environment warning.

### Breaking

- AdminUsersAdapter drops create, invite, resetCredentials, and delete — UsersPanel never called them
  `AdminUsersAdapter` no longer declares `create`, `invite`, `resetCredentials`, or `delete`. A repo-wide audit confirmed `UsersPanel` only ever reads `list`, `setRole`, and `setStatus` from the adapter; supplying any of the four removed members had no panel behavior and no package-owned lifecycle, so keeping them declared was a false compatibility promise. Hosts that were passing one of these must move that flow to the render seams `UsersPanel` already supports: compose host-owned create/invite forms through `renderHeaderActions`, and product-specific edit, credential-reset, deactivate, or delete flows through `renderUserActions`. `defineAdminUsersAdapter` also drops its now-unused `CreateInput`/`InviteInput`/`DeleteInput` type parameters, and the `AdminUserActionTarget` type is removed along with them.

### Fixed

- createApiKeysAdapter validates the issued secret before persisting a create or rotation
  `createApiKeysAdapter`'s `create` and `rotate` now validate the issued `{ key, secret }` before writing to the store, instead of after. Previously a create that failed validation could still leave a persisted-but-unusable credential behind, and a rotation that failed validation could revoke the active credential without ever returning a valid replacement secret, locking the operator out. Both flows now fail closed: nothing is persisted or revoked unless the one-time secret validates.
- admin-kit-conformance now requires a genuine stylesheet import instead of pattern-matching text
  `admin-kit-conformance` tested for the required `@andrewpopov/admin-kit/styles.css` import with a raw-text regex, so a mention of the path sitting inside a `//`/`/* */` comment, or inside any unrelated string or template literal, was enough to satisfy the check even though no import ran. The script now parses each entry file with the TypeScript compiler API and requires a real `import` declaration (or a `require(...)` call, for CommonJS entry points) whose module specifier is the stylesheet — text that merely mentions the path can no longer pass the gate. `typescript` is now a runtime dependency of this package, since the shipped `admin-kit-conformance` bin parses with it.
- MembershipsPanel and SessionsPanel no longer show a previous scope's rows under a new scope's label
  Swapping the `adapter` prop on `MembershipsPanel` or `SessionsPanel` now immediately clears the previous scope's rows, dialogs, and pending state instead of leaving them on screen next to the new scope's label and count while the new load is pending — or indefinitely, if it fails. The reset happens during render (React's "adjust state when props change" pattern) rather than in a `useEffect`, so it lands in the same commit as the adapter swap instead of one commit later, closing a window where a request from the old scope could still land its result after the new scope's label had already committed.
  
  Both panels now guard every load and mutation with a monotonic scope epoch instead of comparing adapter identity, so a scope that goes A → B → back to the same A object no longer lets a call queued during the first A visit land during the second. Every state write that follows an `await` — including the confirmation dialogs closing and the load-error banner — is checked against the current epoch before it lands, and a `reload` callback retained by host code past a scope change is now a no-op instead of corrupting the current scope's pending load or its error state.
- SettingsPanel offers a retry after an initial settings load fails and clears stale errors on success
  `SettingsPanel` now passes a retry action to its error state when the very first `adapter.load()` call fails, so an operator is no longer stuck on a dead end after a transient failure — previously only a load error surfacing after settings had already loaded once was retryable. A load that succeeds, whether from a retry or from a replacement adapter, now also clears any error left over from an earlier failed load instead of leaving it displayed alongside the freshly loaded fields.

## 0.35.4

### Fixed

- Raise shared admin actions and form controls to comfortable mobile touch targets
  Standard buttons, API scope toggles, log filters, and account selectors now maintain a 44px minimum height so shared admin workflows remain comfortable and reliable on phones.

## 0.35.3

### Fixed

- Keep backup history and restore actions visible without horizontal panning on phones
  Backup history now becomes a labeled card list at phone widths, while retaining its semantic table and desktop presentation. Empty backup history uses the standard panel empty state instead of a clipped wide table row.

## 0.35.2

### Fixed

- UsersPanel keeps account actions visible and labeled on phone-sized screens
  Phone-width user tables now render each account as a stacked semantic table row with visible field labels. Product-specific lifecycle controls wrap inside the row instead of sitting beyond a nested horizontal scroller, while desktop table behavior remains unchanged.

## 0.35.1

### Fixed

- admin-kit-conformance now detects main/layout entry points on Windows, where path separators previously made every consumer fail the styles.css check.
  `admin-kit-conformance` matched entry points with a regex anchored on a
  literal `/`, but it tested that regex against paths built by `path.join`.
  On Windows those paths use `\`, so `src\main.tsx` never matched, the set of
  entry files came back empty, and every consumer running the gate on Windows
  was told to "Import @andrewpopov/admin-kit/styles.css from an application
  main or layout entry point" even when that import was already present — with
  no way to satisfy the check. Entry points are now matched on the file's
  basename, which carries the same segment-boundary meaning on every platform.
  
  Paths quoted back in violation messages are also normalised to forward
  slashes, so a given violation now reads identically (`src/app.css`) whether
  the gate runs on Windows, macOS, or Linux.
  
  Consumers on macOS and Linux are unaffected: the same files matched before
  and match now.

## 0.35.0

### Added

- AdminPanelHeader: new `"none"` presentation lets a host that already renders its own page header suppress the panel's title/action/toolbar band entirely, instead of showing two competing headings.
  Panels built on `AdminPanelHeader` (`ApiKeysPanel`, `EventsPanel`, `UsersPanel`)
  always rendered a title band, even when the host page already showed its own
  heading for the same content — smarthome's `/keys` page, for example, showed
  "Service keys" from its own `PageHeader` and then "Service credentials" again
  ~55px below from the kit. `presentation="none"` (via each panel's
  `headerPresentation` prop) makes `AdminPanelHeader` render nothing, so a host
  that owns the page-level title, actions, and toolbar can suppress the kit's
  band outright rather than hiding it with CSS, which would leave a phantom,
  unlabeled node in the accessibility tree. This is an opt-in, host-owned mode:
  a host passing `actions` or `toolbar` alongside `presentation="none"` will not
  see them rendered, since the band that would render them doesn't exist. Each
  panel's root `<section>` keeps `aria-label={title}` so the region stays named
  for assistive technology even with no visible heading. Existing consumers are
  unaffected — the default presentation is unchanged.

## 0.34.0

### Added

- A single `npm run verify` gate that chains the whole release battery, including lint
  `npm run verify` runs `lint`, `typecheck`, `test`, `test:browser`, `build`, `verify:dist-fresh`, `verify:pack`, `verify:bins`, and `npm audit --audit-level=high`, stopping at the first failure. Previously the battery existed only as a hand-copied list in `RELEASING.md`, so a step could be skipped without trace — which is how `eslint` stayed absent from `node_modules` for a whole release cycle while lint was reported as passing. `RELEASING.md` now points at the gate instead of duplicating it.

## 0.33.3

### Added

- AdminAppShell: new `mobileNavigation` prop (default `true`) lets a host that already owns its mobile navigation suppress the shell's own toggle, instead of showing two competing menus below the mobile breakpoint.
  `AdminAppShell` previously rendered its mobile navigation toggle unconditionally,
  shown below `48rem` by the shipped stylesheet. A host whose own chrome already
  provides mobile navigation at that breakpoint therefore presented the user with
  two competing hamburgers opening near-identical menus.
  
  Pass `mobileNavigation={false}` to render neither the toggle nor the mobile
  `<nav>`; the desktop sidebar and content area are unaffected. The prop defaults
  to `true`, so existing adopters see no change.

## 0.33.2

### Changed

- Manage releases with release-kit (fragment-based CHANGELOG + version bump)
  Releases are now driven by release-kit: describe each change as a fragment under `.changes/unreleased/` and run `npm run release:cut` to compile them into a new CHANGELOG section, bump the version, and archive the fragments.

### Fixed

- Mark client-only modules under src/react with 'use client' so importing @andrewpopov/admin-kit/react no longer breaks Server Component builds
  v0.33.1 introduced `AdminLabels.tsx`, which calls `createContext` at module scope.
  Because no module under `src/react/` carried a `'use client'` directive, and
  `react/index.ts` re-exports everything through one barrel, any import from
  `@andrewpopov/admin-kit/react` — even one that never touched `AdminLabels` —
  dragged that module into a consumer's React Server Component build, which then
  failed with `TypeError: (0 , e.createContext) is not a function`. All 17
  client-only modules under `src/react/` (those that call a hook or attach a DOM
  event handler) are now marked with `'use client'`; presentational modules with
  neither (e.g. `AdminWorkspace`) are deliberately left unmarked so consumers can
  still render them from a Server Component. A new test also walks the built
  `dist/react/**/*.js` output on every run and fails by name if a client-only
  module is ever added again without the directive.

## 0.33.1

### Fixed

- Table column-priority thresholds now reflect what a full table actually needs.
  0.33.0 moved priority hiding to container queries but triggered the tertiary
  column at 64rem (1024px) — just below the ~1050px content area a typical
  sidebar layout leaves — so the column never dropped and the actions column
  still clipped. Tertiary now drops at 72rem and secondary at 56rem, measured
  against a full 7-column users table (~1210px wide).

## 0.33.0

### Changed

- Table column-priority hiding (the `--tertiary`/`--secondary` cell hints)
  now responds to the CONTAINER width of `.admin-kit__table-wrap`, not the
  browser viewport. Host apps that embed the table next to a sidebar or in
  another narrow panel could previously have a wide viewport (e.g. 1440px)
  but a much narrower table container (e.g. ~1012px), so the old
  viewport-only media queries never fired: no columns hid, the table
  overflowed its wrapper, and primary action columns (like Delete) were
  clipped off-screen at rest. `.admin-kit__table-wrap` now establishes an
  inline-size containment context (`container-name: admin-kit-table`), and
  the two priority rules moved from `@media` to `@container
  admin-kit-table` at the same 64rem/48rem breakpoints, so they track
  available table space instead.

## 0.32.0

### Added

- Host theming via 9 public brand tokens: the accent family
  (`--admin-kit-accent`, `--admin-kit-accent-strong`,
  `--admin-kit-accent-soft`, `--admin-kit-on-accent`), radius
  (`--admin-kit-radius`, `--admin-kit-radius-sm`), and the dark-accent family
  (`--admin-kit-dark-accent`, `--admin-kit-dark-accent-strong`,
  `--admin-kit-dark-accent-soft`). See the README's Theming section.

### Changed

- `admin-kit-conformance` now permits public theme-token overrides in
  consumer CSS and rejects only internal (structural/contrast-critical)
  token overrides.

### Fixed

- The `admin-kit-conformance` bin is now executable after install; it was
  previously copied into `dist/` without the executable bit, so
  `node_modules/.bin/admin-kit-conformance` failed with "Permission denied".

## 0.31.1

### Fixed

- admin-kit now honors `prefers-reduced-motion`, disabling its transitions
  for users who request reduced motion.

## 0.31.0

### Added

- `AdminLabelsProvider`, `useAdminLabels`, `defaultAdminLabels`, and the
  `AdminLabels` type localize the shared chrome strings (loading, error title,
  retry, cancel, and pagination copy) that previously had no override. Defaults
  are unchanged English, so existing consumers are unaffected.
  `AdminConfirmationDialog` gains an optional `cancelLabel`, and `AdminApp`
  gains an optional `labels` prop that wraps its subtree in the provider.

### Changed

- List panels (`UsersPanel`, `EventsPanel`, `LogsPanel`, and the operational
  panels) now reflect a background refetch on the results surface with
  `aria-busy` and a subtle dim, instead of exposing loading only to host
  header actions.

### Fixed

- The `styles.css` focus-visible, hover, and disabled fallbacks now include the
  `logs`, `sessions`, `memberships`, `operations`, and `settings` panel roots,
  so those panels keep focus rings and disabled styling when rendered without
  the `.admin-kit` wrapper.

## 0.30.0

### Added

- ESLint (flat config) and Prettier now gate the package. `npm run lint` and
  `npm run format:check` run in CI alongside typecheck; `npm run format`
  applies formatting. The react-hooks ruleset is scoped to the two
  long-standing correctness rules (`rules-of-hooks`, `exhaustive-deps`); the
  experimental React Compiler rules folded into eslint-plugin-react-hooks v7
  are intentionally not enabled.

### Changed

- The README install pin now tracks the current release and documents the
  git-tag distribution model (`github:andrewpopov/admin-kit#vX.Y.Z`); consumers
  pin to a release tag and bump deliberately.

## 0.29.7

### Added

- `ApiKeysPanel` gains a `presentation` contract (`"responsive"` default —
  scan-density table on desktop, compact progressive-disclosure cards on narrow
  screens — or a forced `"table"`/`"cards"`) plus a `renderKeyActions` slot for a
  narrow host control (e.g. expiry selection) that keeps the shared collection
  surface and lifecycle/action semantics.
- `UsersPanel` custom columns support `nowrap` (keep concise values such as
  timestamps on one line) and `priority` (`"primary"`/`"secondary"`/`"tertiary"`),
  hiding lower-priority columns before the table scrolls on narrow screens.
- `AdminPanelHeader` accepts a `toolbar` slot that groups search, filters, and
  secondary controls below the title band.

### Changed

- Unified the collection and routed-shell contracts across `AdminPanelHeader`,
  `ApiKeysPanel`, and `UsersPanel`.

## 0.29.6

### Fixed

- `LogsPanel` now opens in explicit tail-follow mode, keeps manual reading
  position when follow is off, and announces refresh success or failure.
- Runtime output is a named, visibly focused keyboard scroll region; stable
  entry keys keep unchanged rows mounted across refreshes.

## 0.29.5

### Added

- `AdminDialog` provides the portaled, focus-managed form-dialog shell for
  host-owned create and edit flows. Pair it with `AdminField`, `AdminStack`,
  and `AdminActionButton` instead of recreating modal geometry in each app.
- `ApiKeysPanel.minimumScopeCount` lets hosts require selected scopes in the
  built-in create and edit forms. Submission stays disabled with clear live
  feedback until the minimum is met.

## 0.29.3

### Fixed

- API-key cards now wrap long credential names and scope identifiers within a
  narrow viewport. The browser fixture guards the 320px layout against a
  document-level horizontal scrollbar.
- `AdminScopePicker` shows persisted scopes outside the current host vocabulary
  as removable existing scopes, so legacy access can be narrowed instead of
  being silently retained.
- API-key disclosure, rotate, revoke, and scope-edit controls now identify the
  credential they operate on for assistive technologies.

## 0.29.2

### Changed

- `ApiKeysPanel` now renders its default credential list as compact cards:
  identity, lifecycle state, last-used time, and expiry remain immediately
  visible; scopes and secondary provenance are expanded on demand. Broad-scope
  credentials no longer force a horizontal table scroller. Host-supplied
  `renderKeys` views remain unchanged.

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
