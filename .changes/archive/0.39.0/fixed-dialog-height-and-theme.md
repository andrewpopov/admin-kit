---
kind: fixed
summary: Dialogs taller than the viewport now scroll only their body (header, Close and actions stay in view, so a focused field is never hidden), Close is a 44px target, stacked dialogs trap Tab and Escape only in the topmost one, and portaled dialogs opened inside AdminTheme inherit host theme overrides (a host rule on .admin-kit.admin-kit--theme-core now rebrands them).
---

AdminDialog and AdminConfirmationDialog cap at the viewport height; only `.admin-kit__dialog-body` scrolls, so the header, Close and actions stay visible and keyboard focus is never obscured. When a confirmation opens over a dialog, only the topmost modal handles Tab and Escape. Under `data-admin-kit-theme="auto"` with a dark OS, nested core boundaries (including portaled dialogs) get the dark tokens; nested AdminPortals mint their own content ids. Inside an AdminTheme, the portaled surface is wrapped in an `admin-kit admin-kit--theme-<name> admin-kit--layer` element (display: contents) so host token overrides reach it; outside AdminTheme nothing changes.
