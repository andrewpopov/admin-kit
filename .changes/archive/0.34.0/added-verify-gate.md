---
kind: added
summary: A single `npm run verify` gate that chains the whole release battery, including lint
---

`npm run verify` runs `lint`, `typecheck`, `test`, `test:browser`, `build`, `verify:dist-fresh`, `verify:pack`, `verify:bins`, and `npm audit --audit-level=high`, stopping at the first failure. Previously the battery existed only as a hand-copied list in `RELEASING.md`, so a step could be skipped without trace — which is how `eslint` stayed absent from `node_modules` for a whole release cycle while lint was reported as passing. `RELEASING.md` now points at the gate instead of duplicating it.
