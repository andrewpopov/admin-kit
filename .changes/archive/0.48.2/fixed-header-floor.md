---
kind: fixed
summary: AdminDataTable never shrinks a column below its header text, sort arrow and padding
---

The fit measures each column header (text, sort arrow and cell padding) in the browser and uses it as a floor above `minWidth`, so a column with no `minWidth` such as the Events panel's Actor and Resource no longer clips its header. When the floors do not fit, low-priority columns hide and then rows stack, as before. Headers set only through `headerContent` are measured by their `header` text.
