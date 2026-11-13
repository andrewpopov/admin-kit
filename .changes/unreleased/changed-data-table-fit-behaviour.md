---
kind: changed
summary: Existing AdminDataTable hosts see a new layout: tables stack into cards from the measured container width instead of the 48rem viewport query, columns with a defaultWidth shrink toward minWidth, a non-resizable column without a minWidth keeps its defaultWidth, columns hidden by priority stay reachable in a row details toggle, every cell value is wrapped in .admin-kit__cell-value (selectors that targeted a direct td child must target that wrapper), UsersPanel priority hiding no longer uses CSS container queries, and ApiKeysPanel presentation=responsive always renders the table
---

Describe the user-facing change in one short paragraph before releasing
