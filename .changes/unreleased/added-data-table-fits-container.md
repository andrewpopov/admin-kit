---
kind: added
summary: AdminDataTable fits its container: defaultWidth is a preferred width that shrinks to minWidth, columns take a priority (tertiary then secondary hide before anything scrolls), rows stack into cards only when the primary columns cannot fit, cells can claim a cardSlot (title, badge, meta, detail, actions), every cell value sits in one .admin-kit__cell-value element, and expandedKeys / onExpandedChange control row expansion. ApiKeysPanel and UsersPanel use the same fit, so the responsive key presentation no longer needs a host viewport hook.
---

Describe the user-facing change in one short paragraph before releasing.
