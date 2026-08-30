---
kind: fixed
summary: the browser fixture now unmounts inside its React act scope
---

The rendered browser fixture now performs root cleanup inside `act`, eliminating
the misleading React test-environment warning while retaining the same serialized
consumer markup.
