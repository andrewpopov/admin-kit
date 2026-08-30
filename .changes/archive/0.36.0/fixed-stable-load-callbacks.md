---
kind: fixed
summary: panel reload effects now depend on stable callback identities
---

Adapter-backed panels now memoize their reload callbacks and let effects depend
on those callbacks directly. This preserves the existing stale-request guards
while eliminating ambiguous dependency lists and the fleet lint warnings they
produced.
