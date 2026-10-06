---
kind: fixed
summary: Dialogs taller than the viewport now scroll inside themselves with a pinned header and a 44px Close button, and portaled dialogs opened inside AdminTheme inherit host theme overrides (a host rule on .admin-kit.admin-kit--theme-core now rebrands them).
---

AdminDialog and AdminConfirmationDialog cap at the viewport height and scroll internally; the header sticks so Close stays reachable. Inside an AdminTheme, the portaled surface is wrapped in an `admin-kit admin-kit--theme-<name> admin-kit--layer` element (display: contents) so host token overrides reach it; outside AdminTheme nothing changes.
