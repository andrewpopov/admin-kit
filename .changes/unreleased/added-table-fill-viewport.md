---
kind: added
summary: AdminDataTable fill prop sizes the table to the viewport; fill columns get a preferred fillWidth; the app frame's minimum height is a public token
---

`AdminDataTable` takes `fill` (and each table panel passes it through as `tableFill`): the table's height is the space from its top down to whatever sits below it (pagination, the frame's padding), measured again whenever anything above or below it resizes, with a floor of 20rem or 60% of the viewport, whichever is smaller. It scrolls inside its own box under the pinned header and the page does not scroll; stacked cards keep the page flow. Focus now moves clear of the pinned header on every non-stacked table. The fill column (no `defaultWidth`) prefers `fillWidth` px (default 280; `UsersPanel` custom columns take it as `fillWidth`), and sized columns shrink toward their `minWidth` before it drops below that. `.admin-kit__app` and `.admin-kit__app-shell` read `min-block-size` from the new public `--admin-kit-app-min-block-size` token (default `100dvh`), so a host with its own header can subtract it and avoid dead page scroll. The token is accepted by `admin-kit-conformance`.
