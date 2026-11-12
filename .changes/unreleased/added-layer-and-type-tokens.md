---
kind: added
summary: styles.css now sits in the `admin-kit` cascade layer (hosts declare `@layer theme, base, admin-kit, components, utilities;`), its generic button, input and select rules apply only to kit-owned controls, and public type tokens (`--admin-kit-font-family`, `--admin-kit-text-*-size|leading`, `--admin-kit-weight-title|strong`, `--admin-kit-table-heading-transform`) map the kit onto a host type scale. Column headers are sentence case, titles weigh 600, and state pills and outcome badges drop text-transform.
---

Describe the user-facing change in one short paragraph before releasing.
