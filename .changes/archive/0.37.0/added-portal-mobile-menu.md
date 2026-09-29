---
kind: added
summary: AdminPortal and AdminApp collapse navigation behind a Menu toggle below 48rem
---

Below 48rem the portal navigation is collapsed behind a single "Menu" button (aria-expanded/aria-controls, 44px target). Escape and choosing a section close it and return focus to the button, so content comes first on phones. Desktop layout is unchanged. Use the new optional `mobileNavigationLabel` prop to localize the label.
