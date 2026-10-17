---
kind: added
summary: Opt-in graphite palette for AdminApp and AdminTheme
---

`AdminApp` and `AdminTheme` accept `palette="graphite"`, which recolors the core theme with a neutral grey-blue ramp by adding `admin-kit--palette-graphite` to that boundary. It is a palette rather than a second theme: `theme` and `data-admin-kit-theme` stay `core`, dark values ride the existing `.dark` / `auto` mechanism, and conformance keeps enforcing the same contrast contract against the palette's own values.

Every nested Admin Kit boundary inherits the palette, including `AdminAppShell` and `AdminPortal` (which take no `palette` of their own) and the dialogs and confirmations that portal to `document.body`. A boundary that omits `palette` inherits the surrounding one, so the default palette is not nameable and `AdminPaletteName` is `"graphite"` only — a nested surface cannot opt back out of graphite while its inline descendants stay recolored.

Consumers that do not pass `palette` are unchanged.
