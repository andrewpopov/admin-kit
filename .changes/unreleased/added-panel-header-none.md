---
kind: added
summary: AdminPanelHeader: new `"none"` presentation lets a host that already renders its own page header suppress the panel's title/action/toolbar band entirely, instead of showing two competing headings.
---

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
