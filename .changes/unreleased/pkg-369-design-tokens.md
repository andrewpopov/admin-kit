---
kind: added
summary: Internal spacing, motion and z-index tokens replace the raw literals in styles.css, plus an opt-in compact density mode
---

`src/styles.css` now reads `--admin-kit-space-*` (a 0.25rem scale with named half and fractional steps), `--admin-kit-target-size`, `--admin-kit-duration-fast` / `-base`, `--admin-kit-ease-standard` and `--admin-kit-z-*`. The tokens are internal, so the conformance check still rejects host overrides. `data-admin-kit-density="compact"` on the root or a `.admin-kit` wrapper tightens the space steps used by tables, lists and controls. A styles test fails on any raw rem, ms or z-index literal outside the token block. Rendered layout is unchanged.
