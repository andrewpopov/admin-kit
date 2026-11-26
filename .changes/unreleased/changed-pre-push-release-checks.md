---
kind: changed
summary: The pre-push hook runs release hygiene and checks pushed release tags
---

With GitHub Actions disabled, `.githooks/pre-push` now runs `npm run release:hygiene` against `origin/main` and blocks a pushed `v*` tag whose version differs from `package.json` or whose `## X.Y.Z` CHANGELOG heading is missing. `npm run test:pre-push-hook` pins both and is part of `npm run verify`.
