---
kind: fixed
summary: admin-kit-conformance no longer accepts a stylesheet import that only exists inside a comment
---

`admin-kit-conformance` tested for the required `@andrewpopov/admin-kit/styles.css` import with a raw-text regex, so a mention of the path sitting inside a `//` or `/* */` comment in an entry file was enough to satisfy the check even though no import ran. The script now strips comments (while preserving string contents) before testing, so only a genuine import declaration can pass the gate.
