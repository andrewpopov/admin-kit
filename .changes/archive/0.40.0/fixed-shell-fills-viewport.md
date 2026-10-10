---
kind: fixed
summary: Frames fill the viewport, phone content aligns with the frame header, and a single-section AdminApp or AdminPortal drops its navigation
---

`AdminApp` and `AdminAppShell` now fill the viewport height (`min-block-size: 100dvh`), so on a short page the host page's background no longer shows as a band below the frame. At phone widths a page workspace inside a frame no longer adds a second 1rem inset, so page content lines up with the frame header. Desktop spacing is unchanged.

A portal with exactly one visible section no longer renders the section rail or the phone Menu toggle, and its content spans the full width (`.admin-kit__portal--single`); the skip link, landmarks and content focus target are unchanged. This is the default with no opt-out, so a host that relied on a one-link rail now gets none. `AdminAppShell` is unchanged because the host renders its own navigation there.
