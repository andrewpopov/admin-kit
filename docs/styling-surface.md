# Styling surface

Every `.admin-kit__*` class is private and can change in any release. A host
customizes the kit only through the surfaces below. `admin-kit-conformance`
warns on a host stylesheet selector that targets a private class (the
allowlist is empty) and fails on it under `--strict`.

## Public surface

**Tokens** (set on `.admin-kit.admin-kit--theme-core`; the README's Theming
section has defaults): `accent`, `accent-strong`, `accent-soft`, `on-accent`,
`radius`, `radius-sm`, `dark-accent`, `dark-accent-strong`, `dark-accent-soft`,
`muted`, `dark-muted`, the type tokens, `app-min-block-size`. `muted` and
`dark-muted` are the secondary-copy colors; conformance fails a value below
4.5:1 against the surface. Spacing is not a token surface: use
`data-admin-kit-density`.

**Parts**: stable `data-admin-kit-part="<name>"` hooks for host CSS and test
queries. Target them with `[data-admin-kit-part="portal-navigation"]`. A part
name never changes within a major version; styling a part is for layout
(hide, size, position), not for repainting kit internals.

| Part | Element |
| --- | --- |
| `portal-navigation` | `AdminPortal` nav |
| `table-scroll` | the scroll region around every `AdminDataTable` (and so each panel table) |
| `mobile-cell-label` | the phone-width cell label |
| `status` | one `AdminStatusSummary` item; `data-admin-kit-tone` is `healthy`, `critical`, ... or `neutral` |
| `api-key-create` | the `ApiKeysPanel` create `<details>` |
| `api-key-card` | one key card in `ApiKeysPanel` |
| `api-key-secret` | the one-time secret alert |
| `scope-chip` | one scope chip |

**Props**: none were needed; every recurring need was a token or a part.

## Inventory (2026-11)

Read from the six consumers' CSS, TSX and tests.

| Consumer | Private selector (file:line) | Need | Public replacement |
| --- | --- | --- | --- |
| ashen-march | none (`src/styles/operator.css:4` sets public tokens only) | brand | already conformant |
| jun | none in CSS beyond public tokens (`apps/web/src/index.css:385-395`) | brand | already conformant |
| jun | `.admin-kit__events-list`, `.admin-kit__events-filters label/input/select` (`index.css:400-402`) | stop long values widening the page | fixed in the kit; delete the three rules |
| jun | `admin-kit__users-search`, `__table-wrap--stack`, `__table`, `__table-cell--nowrap`, `__pagination`, `__button` (`HouseholdsPanel.tsx:58-143`) | host rebuilds a kit table by hand | `AdminDataTable`, `AdminPagination`, `AdminActionButton` |
| jun | `admin-kit__status--critical/healthy` (`AdminView.test.tsx:163-164`) | assert tone | `[data-admin-kit-part="status"][data-admin-kit-tone]` |
| sano-os | 13 selectors, light and dark (`apps/web/src/index.css:46-74`) | muted copy contrast | `--admin-kit-muted: #5c6a82`, `--admin-kit-dark-muted: #b7c3d8` |
| sano-os | `admin-kit__status-summary`, `__status`, `__status--tone` (`BackupsPanel.tsx:124-125`) | host rebuilds a status list | `AdminStatusSummary` |
| sano-os | `.admin-kit__backups-table-wrap` (`BackupsPanel.tsx:89`, `BackupsPanel.test.tsx:53`) | find the scroll region | `table-scroll` |
| sano-os | `.admin-kit__scope-chip`, `.admin-kit__secret` (`ApiAccessView.test.tsx:120-234`) | test queries | `scope-chip`, `api-key-secret` |
| savoro | `.admin-kit__portal-navigation` (`packages/web-app/src/index.css:737`) | hide nav in mobile content focus | `[data-admin-kit-part="portal-navigation"]` |
| bewks | `.admin-kit__backups-table-wrap`, `.admin-kit__users-table-wrap` (`e2e/mobile-ui-audit-screenshots.e2e.spec.ts:394,410`) | find the scroll region | `table-scroll` inside the panel |
| bewks | `.admin-kit__key-create > summary`, `li.admin-kit__key-card` (`e2e/admin-security-api-keys.e2e.spec.ts:7,143`) | test queries | `api-key-create`, `api-key-card` |
| smarthome | `.admin-kit__mobile-cell-label` (`tests/e2e/phone-layout.e2e.spec.ts:100`) | test query | `mobile-cell-label` |

## Migration per consumer

Run `npx admin-kit-conformance --strict` after each; the goal is zero
warnings.

- **ashen-march**: nothing.
- **jun**: delete `index.css:400-402`; replace the hand-built households table
  with `AdminDataTable` and `AdminPagination`; switch the status assertions to
  the tone attribute.
- **sano-os**: replace the 26 muted-copy selectors with the two muted tokens;
  use `AdminStatusSummary` in `BackupsPanel`; move test queries to parts.
- **savoro**: change the one selector to the `portal-navigation` part.
- **bewks**: change four e2e locators to parts.
- **smarthome**: change one e2e locator to `mobile-cell-label`.
