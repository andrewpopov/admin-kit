---
kind: fixed
summary: AdminDataTable column dividers sit on the column edge, so the last column no longer ends in a 12px empty strip
---

The resize handle drew its divider in the middle of its 24px hit area, 12px inside the column's right edge, which left a visible empty strip after the last header. The divider now sits on the edge; the hit area is unchanged.
