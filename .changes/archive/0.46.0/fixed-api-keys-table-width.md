---
kind: fixed
summary: The API keys table fits a 72rem content column again
---

In 0.45.0 the `ApiKeysPanel` table's columns added up to a 1280px minimum width, wider than a typical admin content column (about 1144px in Cairn at 1920px). A host that shows the table only when it fits therefore always fell back to cards. The default widths are now Scope and Details 176px, State 88px, and Created, Last used and Expires 120px each, for a 1128px minimum, and a unit test keeps that minimum within 72rem. Widths a viewer has already resized and stored are unchanged.
