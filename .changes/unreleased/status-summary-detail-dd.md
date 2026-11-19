---
kind: fixed
summary: AdminStatusSummary keeps an item's detail inside the definition list, so axe's definition-list rule passes
---

An item's `detail` rendered as a bare `<small>` beside its `<dt>` and `<dd>`, which is not allowed inside a `<dl>` and failed axe's serious `definition-list` rule in sano-os's admin accessibility audit. The detail is now a second `<dd>` for the same term, styled as before.
