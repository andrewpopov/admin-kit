---
kind: added
summary: AdminApp renders a localisable Skip to content link (labels.skipToContent) that focuses a stable content region, and AdminPanelStateView loading accepts skeletonRows for placeholder bars.
---

The skip link is hidden until keyboard focus, then shows with the kit focus ring; it targets a `tabindex="-1"` content div rather than a second `main`. `skeletonRows` (1 to 12) renders aria-hidden bars beside a visually hidden polite label and animates only under `prefers-reduced-motion: no-preference`; the default loading output is unchanged.
