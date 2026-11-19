---
kind: added
summary: Browser layout-geometry snapshots for every fixture, plus a fixture gallery for manual review
---

`tests/browser/layout-snapshots.spec.ts` records each `.admin-kit__*` element's rounded rect (relative to its offset parent) and key computed layout properties at 1280x800 and 375x812, in LTR and RTL, and compares them with committed baselines in `tests/browser/__layout__/` (2px tolerance, exact strings). A drift names the element, the property, and the expected and actual values. `tests/browser/gallery.html` shows every fixture with theme, palette and direction toggles.
