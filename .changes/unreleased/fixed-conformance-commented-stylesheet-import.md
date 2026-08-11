---
kind: fixed
summary: admin-kit-conformance now requires a genuine stylesheet import instead of pattern-matching text
---

`admin-kit-conformance` tested for the required `@andrewpopov/admin-kit/styles.css` import with a raw-text regex, so a mention of the path sitting inside a `//`/`/* */` comment, or inside any unrelated string or template literal, was enough to satisfy the check even though no import ran. The script now parses each entry file with the TypeScript compiler API and requires a real `import` declaration (or a `require(...)` call, for CommonJS entry points) whose module specifier is the stylesheet — text that merely mentions the path can no longer pass the gate. `typescript` is now a runtime dependency of this package, since the shipped `admin-kit-conformance` bin parses with it.
