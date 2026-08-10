---
kind: fixed
summary: MembershipsPanel and SessionsPanel no longer show a previous scope's rows under a new scope's label
---

Swapping the `adapter` prop on `MembershipsPanel` or `SessionsPanel` now immediately clears the previous scope's rows, dialogs, and pending state instead of leaving them on screen next to the new scope's label and count while the new load is pending — or indefinitely, if it fails. Both panels also track which adapter a load or mutation was issued for, so a stale in-flight load or mutation from a scope the host has since navigated away from can no longer land its result on top of a newer scope's state.
