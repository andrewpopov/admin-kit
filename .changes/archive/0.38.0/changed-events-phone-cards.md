---
kind: changed
summary: Opt-in stacked table modifier turns rows into labelled cards on phones; EventsPanel uses it
---

Add an opt-in `admin-kit__table-wrap--stack` / `admin-kit__table--stack` modifier pair: below the phone breakpoint each row becomes a labelled card with no horizontal scrolling, using `AdminMobileCellLabel` (now exported) in each cell. `EventsPanel` uses it. Desktop is unchanged, and the backups and users tables keep their own rules.

On fine-pointer desktops the portal navigation is denser (tighter link padding and gaps) so a 15-item rail fits without clipping; phones and coarse pointers keep 44px targets.
