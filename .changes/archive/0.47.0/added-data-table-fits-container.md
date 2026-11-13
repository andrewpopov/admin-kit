---
kind: added
summary: AdminDataTable fits its container: defaultWidth is a preferred width that shrinks to minWidth, columns take a priority (tertiary then secondary hide before anything scrolls), rows stack into cards only when the primary columns cannot fit, cells can claim a cardSlot (title, badge, meta, detail, actions), every cell value sits in one .admin-kit__cell-value element, and expandedKeys / onExpandedChange control row expansion. ApiKeysPanel and UsersPanel use the same fit, so the responsive key presentation no longer needs a host viewport hook
---

A table beside a side rail or inside a narrow panel no longer scrolls sideways: it drops its least important columns first, keeps their values one click away in the row details, and turns into compact cards only when its main columns cannot fit. Measured in Cairn, 7 of 9 admin tables overflowed at 1024px before this change.
