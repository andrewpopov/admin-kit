---
kind: fixed
summary: Logs search, the API key summary and the scope-count disclosure hold up at 200% text on a phone and for screen-reader voice control
---

At 200% text on a 375px screen the logs search field and the API key summary grid kept their intrinsic minimum width and pushed the page sideways; both now shrink to the available width. The "N scopes" disclosure on an API key row had an accessible name that did not contain its visible text (WCAG 2.5.3), so voice control could not target it; the name now starts with the visible count ("2 scopes: Scopes and details for ...").

In Safari, a focused field in a tall dialog could stay partly clipped at the edge of the dialog body (the body now keeps a 1rem scroll margin), and native selects in the field, events, users, memberships and logs controls rendered 1.5px under the 44px target because WebKit ignores `min-block-size` on a native select (they now set the target size as their block size).
