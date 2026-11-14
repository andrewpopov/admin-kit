---
kind: changed
summary: EventsPanel tables stack below about 815px of container instead of about 750px, and tables whose minWidth is below their header text hide columns or stack earlier
---

Because a column can no longer shrink below its header, tables whose `minWidth` is smaller than the header text, such as the Events panel's Actor and Resource, need more room before they hide low-priority columns or stack into cards. Give a column a `priority` or a larger `minWidth` to choose what yields first.
