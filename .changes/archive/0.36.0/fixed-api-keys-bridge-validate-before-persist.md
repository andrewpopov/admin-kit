---
kind: fixed
summary: createApiKeysAdapter validates the issued secret before persisting a create or rotation
---

`createApiKeysAdapter`'s `create` and `rotate` now validate the issued `{ key, secret }` before writing to the store, instead of after. Previously a create that failed validation could still leave a persisted-but-unusable credential behind, and a rotation that failed validation could revoke the active credential without ever returning a valid replacement secret, locking the operator out. Both flows now fail closed: nothing is persisted or revoked unless the one-time secret validates.
