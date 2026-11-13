---
kind: changed
summary: EventsPanel and OperationalJobsPanel headers re-lay out, and every admin-kit button is now inline-flex, even for hosts that do not use the collapsible band
---

`EventsPanel` moves its search and its category, severity and outcome filters into the header toolbar (in the loading and error states too) and shows Refresh as a secondary button in the title row, so the table sits 17 to 28px lower than before. `OperationalJobsPanel` now draws its title band with `AdminPanelHeader`; on phones the Run button is full width and the table starts about 60px lower at 390px wide. `.admin-kit__button` (including `AdminActionButton`) is `display: inline-flex` with a 0.375rem gap and centred content, so an icon beside a label no longer touches it; a host that styled these buttons as `inline-block` should check them. Search fields reserve up to 20rem so their placeholder is not clipped, and the Users header toolbar now grows to fill its row.
