---
kind: fixed
summary: Details labels such as "Created" no longer break mid-word in narrow columns
---

Inside a data table cell the labels of the user, API key, session, event, hidden-value and status detail lists inherited `overflow-wrap: anywhere` from the cell, so a label column squeezed by a long value split a word across lines ("Crea" / "ted"). Labels now keep `overflow-wrap: normal` and wrap only at word boundaries; values keep `anywhere`, so they still stay inside the page at 375px and at 200% text.
