---
kind: fixed
summary: EventsPanel's default Occurred column is wide enough for its one-line, year-bearing timestamp
---

`EventsPanel` sizes the Occurred column to 216px when it uses the default timestamp format, so "May 30, 2026, 12:59 AM" no longer overflows its cell in a narrow table. A host `formatTimestamp` keeps the 184px/128px sizing.
