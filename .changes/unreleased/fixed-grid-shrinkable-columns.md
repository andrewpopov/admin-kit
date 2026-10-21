---
kind: fixed
summary: admin-kit__stack and admin-kit__panel-header use a shrinkable column so wide nowrap children scroll instead of widening the page
---

Both grids had an implicit auto column, so a wide nowrap child such as a tab strip widened the page. They now use `minmax(0, 1fr)`, and the child scrolls inside its own box.
