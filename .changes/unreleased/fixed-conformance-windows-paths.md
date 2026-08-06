---
kind: fixed
summary: admin-kit-conformance now detects main/layout entry points on Windows, where path separators previously made every consumer fail the styles.css check.
---

`admin-kit-conformance` matched entry points with a regex anchored on a
literal `/`, but it tested that regex against paths built by `path.join`.
On Windows those paths use `\`, so `src\main.tsx` never matched, the set of
entry files came back empty, and every consumer running the gate on Windows
was told to "Import @andrewpopov/admin-kit/styles.css from an application
main or layout entry point" even when that import was already present — with
no way to satisfy the check. Entry points are now matched on the file's
basename, which carries the same segment-boundary meaning on every platform.

Paths quoted back in violation messages are also normalised to forward
slashes, so a given violation now reads identically (`src/app.css`) whether
the gate runs on Windows, macOS, or Linux.

Consumers on macOS and Linux are unaffected: the same files matched before
and match now.
