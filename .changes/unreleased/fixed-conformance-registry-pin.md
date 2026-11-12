---
kind: fixed
summary: admin-kit-conformance accepts an exact registry version pin
---

The pin check required the specifier to contain `v<version>`, so a consumer that installs admin-kit from the fleet npm registry with an exact version (`"0.46.1"`, BRAIN-1006) failed conformance. It now accepts the exact version, or a `github:` pin whose ref is `v<version>`; a different version, a range, or a version that only shares a prefix is still refused.
