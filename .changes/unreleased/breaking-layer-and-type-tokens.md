---
kind: breaking
summary: styles.css is now in the `admin-kit` cascade layer, so every host must declare that layer in an `@layer` order statement before the kit import; adds public type tokens and sentence-case column headers
---

The whole stylesheet is wrapped in `@layer admin-kit`. A layered rule loses to every unlayered rule, so a host that has not declared the layer will see an unlayered reset (including the Tailwind 3 preflight and a plain global `button { background }`) beat the kit: card borders go to 0, primary buttons turn transparent and padding collapses.

Migration:

- Declare the layer order in a host stylesheet that is seen before the kit import, for example `@layer theme, base, admin-kit, components, utilities;` placed before `@import "tailwindcss"` and before `@andrewpopov/admin-kit/styles.css`. `admin-kit-conformance` now fails when no host CSS file declares an `@layer` order statement containing `admin-kit`.
- Move any unlayered reset (including the Tailwind 3 `@tailwind base`) into a layer declared before `admin-kit`.

Other visible changes:

- The generic button, input and select rules no longer match every control under `.admin-kit`. Host buttons placed in kit chrome (panel header actions, workspace toolbars, card actions) lose the kit button look and need the `admin-kit__button` class to keep it.
- `.admin-kit` now sets `font-size` from `--admin-kit-text-body-size` (1rem) instead of inheriting the host size, and a new `.admin-kit :where(small)` rule restyles host `<small>` at the caption size.
- New public tokens: `--admin-kit-font-family`, `--admin-kit-text-{page-title,title,body,body-sm,caption}-{size,leading}`, `--admin-kit-weight-title`, `--admin-kit-weight-strong` and `--admin-kit-table-heading-transform`, all overridable by hosts and accepted by conformance.
- Table column headers are sentence case (set `--admin-kit-table-heading-transform: uppercase` to restore), page and panel titles weigh 600, and state pills and outcome badges drop `text-transform` and use the caption size at 600.
