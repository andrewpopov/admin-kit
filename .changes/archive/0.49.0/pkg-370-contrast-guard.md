---
kind: added
summary: admin-kit-conformance fails host rebrand tokens whose accent, on-accent or text contrast falls below WCAG AA
---

The conformance command now resolves the colors a host declares for the public accent tokens in light, `.dark` and auto scopes, falls back to the kit defaults for unset tokens, and fails when accent/on-accent is below 4.5:1, accent/surface below 3:1 or text/surface below 4.5:1. Values it cannot compute are skipped with a warning.
