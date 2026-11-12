---
kind: added
summary: Data table columns can be resized with single clicks from a menu on the resize handle
---

Clicking a column's resize handle (without dragging) opens a small menu with Narrower, Wider and Reset width buttons and moves focus to it, so a pointer user without a keyboard can resize and reset a column with single clicks, as WCAG 2.2 SC 2.5.7 (Dragging Movements) asks. Narrower and Wider step 32px within the column's bounds, and every change is remembered through `storageKey` exactly as drag and keyboard changes are. Escape or a click elsewhere closes the menu, and Escape returns focus to the handle. A small pointer wobble under 4px no longer nudges the width, so a click never resizes by accident. Dragging, the arrow keys, Home and double-click behave as before.
