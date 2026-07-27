---
kind: added
summary: AdminAppShell: new `mobileNavigation` prop (default `true`) lets a host that already owns its mobile navigation suppress the shell's own toggle, instead of showing two competing menus below the mobile breakpoint.
---

`AdminAppShell` previously rendered its mobile navigation toggle unconditionally,
shown below `48rem` by the shipped stylesheet. A host whose own chrome already
provides mobile navigation at that breakpoint therefore presented the user with
two competing hamburgers opening near-identical menus.

Pass `mobileNavigation={false}` to render neither the toggle nor the mobile
`<nav>`; the desktop sidebar and content area are unaffected. The prop defaults
to `true`, so existing adopters see no change.
