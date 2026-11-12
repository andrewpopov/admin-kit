---
kind: added
summary: AdminDataTable, a data table with resizable columns, a sticky header, truncation and expandable rows; EventsPanel's table uses it
---

`AdminDataTable` sizes columns with a `<colgroup>`, lets viewers resize them by drag or keyboard (`role="separator"` handles), keeps the header sticky inside its own scroll area, truncates long values to one line with the full value in a tooltip and an expandable details row, persists widths per viewer in localStorage under `storageKey`, and keeps the stacked card layout below 48rem. `EventsPanel presentation="table"` now renders through it: the Event column fills the width, timestamps show a relative time under the absolute one, the details disclosure expands a full-width row with the whole record, and a new `storageKey` prop persists column widths. The old `min-width: 64rem` on `.admin-kit__events-table` is replaced by a minimum computed from the column widths.
