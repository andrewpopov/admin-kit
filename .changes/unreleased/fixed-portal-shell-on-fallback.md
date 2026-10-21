---
kind: fixed
summary: AdminPortal keeps its navigation and Menu toggle around the not-found and unavailable-section fallback
---

When the active section was unknown, unavailable or gated, AdminPortal returned only the fallback with no navigation. It now renders the normal shell around it, and a custom `inactiveSectionState` still shows inside the shell. With zero visible sections the empty state is unchanged.
