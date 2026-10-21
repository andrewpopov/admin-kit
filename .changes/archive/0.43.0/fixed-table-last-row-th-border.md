---
kind: fixed
summary: Row-header th cells in the last table row no longer draw a stub bottom border
---

The last-row border reset covered `td` only, so a row-header `th` drew a hairline under every table. The reset now covers `th` too, and stacked cards keep their divider under the row header.
