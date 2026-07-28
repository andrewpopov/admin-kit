# Releasing

Releases are deliberate and local-first: this repository has no required hosted
CI checks. The CHANGELOG and version bump are produced by
[`release-kit`](https://github.com/andrewpopov/release-kit) from fragments
under `.changes/unreleased/` — see `.changes/README.md` for the fragment
format.

1. **Add a fragment for each change** as it lands, via
   `npm run release:note -- --kind <kind> --slug <short-slug> --summary "User-facing summary"`
   (or by hand). `npm run release:hygiene -- --base origin/main` checks that a
   change touching `src/` shipped with one.
2. **Run the local verify battery:**

   ```bash
   npm ci
   npm run verify
   ```

   `verify` chains the whole battery — `lint`, `typecheck`, `test`,
   `test:browser`, `build`, `verify:dist-fresh`, `verify:pack`, and
   `npm audit --audit-level=high` — and stops at the first failure. Run it as
   one command rather than the individual steps: a hand-copied list silently
   drops whichever step you skip, which is how `lint` stayed unrunnable for a
   whole release cycle (PKG-87) without anyone noticing `eslint` was missing
   from `node_modules`.

3. **Cut the release:** `npm run release:cut` compiles the unreleased
   fragments into a new `## <version>` section at the top of `CHANGELOG.md`,
   bumps `package.json`, and archives the consumed fragments.
4. **Commit the result**, open the reviewed pull request, and merge it.
5. **Create the annotated tag:** `git tag -a vX.Y.Z -m vX.Y.Z` matching the
   version `release:cut` produced, and push it. The `release-guard` CI job
   checks the tag against `package.json` and the `## X.Y.Z` CHANGELOG heading.

When npm publishing is enabled, publish only from that tag with an account
protected by 2FA. Use npm provenance only after a trusted-publishing path is
configured; do not claim it otherwise. Finally, install the published package
into a clean consumer and verify its exported API before announcing the
release.
