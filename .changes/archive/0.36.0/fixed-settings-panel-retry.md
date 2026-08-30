---
kind: fixed
summary: SettingsPanel offers a retry after an initial settings load fails and clears stale errors on success
---

`SettingsPanel` now passes a retry action to its error state when the very first `adapter.load()` call fails, so an operator is no longer stuck on a dead end after a transient failure — previously only a load error surfacing after settings had already loaded once was retryable. A load that succeeds, whether from a retry or from a replacement adapter, now also clears any error left over from an earlier failed load instead of leaving it displayed alongside the freshly loaded fields.
