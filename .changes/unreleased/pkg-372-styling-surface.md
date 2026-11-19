---
kind: added
summary: public data-admin-kit-part hooks and muted tokens replace private .admin-kit__ class styling, and conformance warns on host selectors that target private classes
---

Eight parts (`portal-navigation`, `table-scroll`, `mobile-cell-label`, `status`, `api-key-create`, `api-key-card`, `api-key-secret`, `scope-chip`) and a `data-admin-kit-tone` on status items give hosts stable hooks. `--admin-kit-muted` and `--admin-kit-dark-muted` become public rebrand tokens, contrast-checked at 4.5:1. `admin-kit-conformance` warns with `file:line` on host selectors that target `.admin-kit__*` classes and fails on them under `--strict`. Long event values no longer widen the events list. See `docs/styling-surface.md`.
