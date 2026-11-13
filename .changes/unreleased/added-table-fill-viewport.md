---
kind: added
summary: AdminDataTable fill prop sizes the table to the viewport; fill columns get a preferred fillWidth; the app frame's minimum height is a public token
---

`AdminDataTable` takes `fill` (and each table panel passes it through as `tableFill`): the table's height is the space from its top to the bottom of the viewport, less `--admin-kit-table-footer-reserve` (default 3.5rem, floor 20rem), so it scrolls inside its own box under the pinned header and the page does not scroll. Stacked cards keep the page flow. The fill column (no `defaultWidth`) now prefers `fillWidth` px (default 280), and sized columns shrink toward their `minWidth` before it is squeezed. `.admin-kit__app` and `.admin-kit__app-shell` read `min-block-size` from the new public `--admin-kit-app-min-block-size` token (default `100dvh`), so a host with its own header can subtract it and avoid dead page scroll. Both tokens are accepted by `admin-kit-conformance`.
