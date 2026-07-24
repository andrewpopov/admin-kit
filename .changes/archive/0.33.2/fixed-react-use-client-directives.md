---
kind: fixed
summary: Mark client-only modules under src/react with 'use client' so importing @andrewpopov/admin-kit/react no longer breaks Server Component builds
---

v0.33.1 introduced `AdminLabels.tsx`, which calls `createContext` at module scope.
Because no module under `src/react/` carried a `'use client'` directive, and
`react/index.ts` re-exports everything through one barrel, any import from
`@andrewpopov/admin-kit/react` — even one that never touched `AdminLabels` —
dragged that module into a consumer's React Server Component build, which then
failed with `TypeError: (0 , e.createContext) is not a function`. All 17
client-only modules under `src/react/` (those that call a hook or attach a DOM
event handler) are now marked with `'use client'`; presentational modules with
neither (e.g. `AdminWorkspace`) are deliberately left unmarked so consumers can
still render them from a Server Component. A new test also walks the built
`dist/react/**/*.js` output on every run and fails by name if a client-only
module is ever added again without the directive.
