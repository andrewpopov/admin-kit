---
kind: added
summary: The browser suite now runs the cross-engine specs on WebKit, scans every fixture with axe for WCAG A/AA, and stresses text spacing, 200% text and longer text
---

Playwright gains a `webkit` project beside `chromium`, limited to the layout, panel band, shell, accessibility and text-resilience specs, and `npm run test:browser` installs WebKit first. `tests/browser/a11y.spec.ts` runs `@axe-core/playwright` over every fixture in light, dark, RTL, graphite and graphite dark. `tests/browser/text-resilience.spec.ts` renders the shell, dialog, panel band, collapsed band chips and data and panel scenarios with WCAG text spacing, 200% root font size in a wide font and 1.3x longer text at 1280, 768 and 375px. Firefox is not yet automated.
