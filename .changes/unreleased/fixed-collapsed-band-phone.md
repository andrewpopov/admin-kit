---
kind: fixed
summary: The collapsible header band keeps a readable title on phones, shares one row with the toggle and actions, and wraps its summary chips instead of fading them
---

The title keeps at least 8rem and wraps by words; at 30rem or narrower the toggle shows only its chevron and count (its accessible name is unchanged) so title, toggle and one action share a row, and only the summary takes the next line (a collapsed band at 390px with one action is 76px tall, was 400px). The summary line no longer scrolls sideways or fades: text clamps at two lines and `AdminFilterChip`s wrap, never clipped. The chip's × is larger and its remove button is 44px on a coarse pointer.
