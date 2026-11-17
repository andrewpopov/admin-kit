---
kind: added
summary: AdminPagination, one previous/next pager with a polite page status, replaces the three hand-rolled copies in UsersPanel and OperationalPanels
---

`AdminPagination` renders a labelled `nav` with Previous and Next buttons that disable at the ends and a "Page X of Y" status in an `aria-live="polite"` region. It keeps 44px targets on coarse pointers and mirrors its arrows under right-to-left text. `UsersPanel`, `OperationalJobsPanel` and the backups panel now use it.
