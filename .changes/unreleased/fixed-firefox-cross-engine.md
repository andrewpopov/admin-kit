---
kind: fixed
summary: Firefox and wide Linux system fonts no longer clip the Events time column or search placeholders, hide dialog fields under the footer, or crowd the phone band title
---

The Events Occurred column is 232px (was 216px) so the default timestamp fits in DejaVu Sans, the system font on Linux. Events and Users search fields keep a 22rem minimum so their placeholder is shown whole. Dialog controls set `scroll-margin-block`, because Firefox otherwise leaves a focused field partly under the footer. On phones the collapsed page band shows its title at the title size so the title, toggle and action share one row.
