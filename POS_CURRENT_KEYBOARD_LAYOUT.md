# Crisp POS -- Current Keyboard Layout

**Generated:** 2026-05-05
**Source:** Live database query
**Total buttons:** 157 (156 active + 1 inactive overlap)
**Grid dimensions:** 10 columns x 7 rows (all pages)
**Pages:** 6

---

## Table of Contents

1. [Page 1 -- Main Register](#page-1----main-register)
2. [Page 2 -- Fruit A-M](#page-2----fruit-a-m)
3. [Page 3 -- Fruit N-Z](#page-3----fruit-n-z)
4. [Page 4 -- Vegetables A-G](#page-4----vegetables-a-g)
5. [Page 5 -- Vegetables H-Z](#page-5----vegetables-h-z)
6. [Page 6 -- Grocery](#page-6----grocery)
7. [Page Link Map](#page-link-map)
8. [Button Inventory Summary](#button-inventory-summary)
9. [Problems Found](#problems-found)

---

## Page 1 -- Main Register

**Page ID:** 1
**Name:** Main Register
**Grid:** 10 columns x 7 rows
**Buttons:** 49 (including 1 inactive np-display overlap)
**Purpose:** Primary cashier-facing keyboard with function buttons, department sections, numpad, and bottom navigation
**Links from:** Pages 2-6 (BACK buttons)
**Links to:** Pages 2, 3, 4, 5, 6 (bottom nav)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | LOCK | SUPERVISOR ONLY | RETURN | VOID (2-col) | --- | Hold Sale | NO SALE | VIEW OR... | PRICE CHECK (2x2) | --- |
| **Row 1** | REPRINT | % DISCOUNT | % ONE ITEM | MOVE DRAWER | ERROR CORRECT | Recall Sale | UBER EATS ADJ | *(empty)* | --- (PC) | --- (PC) |
| **Row 2** | CART (3x4) | --- | --- | MEAT | COFFEE | FRUIT & VEG | 7 | 8 | 9 | QTY X |
| **Row 3** | --- | --- | --- | CHEESE | FLOWERS | FRUIT & VEG (sect) | 4 | 5 | 6 | CLEAR |
| **Row 4** | --- | --- | --- | *(empty)* | BREAD & CROISSANTS | FRUIT & VEG /KG | 1 | 2 | 3 | *(empty)* |
| **Row 5** | --- | --- | --- | BAG | GAS | DELI | 0 | 00 | CODE ENTER (2-col) | --- |
| **Row 6** | GROCERY (2-col) | --- | NUTS | *(empty)* | FRUIT A-M | FRUIT N-Z | VEGE A-G | VEGE H-Z | SUB TOTAL (2-col) | --- |

Legend: `---` = covered by multi-span button, `*(empty)*` = no button assigned, `(PC)` = covered by PRICE CHECK 2x2

### Button Details -- Page 1

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Category | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| fn-lock | LOCK | lock | 0 | 0 | 1x1 | #dddddd | #000 | - | - | Lock register, show PIN overlay |
| fn-supervisor | SUPERVISOR ONLY | supervisor | 0 | 1 | 1x1 | #dddddd | #000 | - | - | Prompt for manager/admin PIN |
| fn-return | RETURN | return | 0 | 2 | 1x1 | #dddddd | #000 | - | - | Toggle return mode or receipt lookup |
| fn-void | VOID | void | 0 | 3 | 2x1 | #4466aa | #fff | - | - | Remove last item from cart |
| fn-hold | Hold Sale | hold | 0 | 5 | 1x1 | #dddddd | #000 | - | - | Park current sale |
| fn-nosale | NO SALE | nosale | 0 | 6 | 1x1 | #dddddd | #000 | - | - | Open cash drawer |
| fn-viewor | VIEW OR... | viewor | 0 | 7 | 1x1 | #dddddd | #000 | - | - | View options (not configured) |
| fn-pricecheck | PRICE CHECK | pricecheck | 0 | 8 | 2x2 | #dddddd | #000 | - | - | Price lookup without adding to cart |
| fn-reprint | REPRINT | reprint | 1 | 0 | 1x1 | #dddddd | #000 | - | - | Reprint last receipt |
| fn-pctdisc | % DISCOUNT | pctdiscount | 1 | 1 | 1x1 | #d8a820 | #000 | - | - | % off whole sale |
| fn-pctone | % ONE ITEM | pctone | 1 | 2 | 1x1 | #d8a820 | #fff | - | - | % off last item |
| fn-movedrawer | MOVE DRAWER | movedrawer | 1 | 3 | 1x1 | #e07020 | #fff | - | - | Open cash drawer |
| fn-errcorrect | ERROR CORRECT | errcorrect | 1 | 4 | 1x1 | #dddddd | #000 | - | - | Remove last item (same as void) |
| fn-recall | Recall Sale | recall | 1 | 5 | 1x1 | #dddddd | #000 | - | - | Show parked sales list |
| fn-ubereats | UBER EATS ADJ | ubereats | 1 | 6 | 1x1 | #dddddd | #000 | - | - | 30% markup for Uber Eats |
| layout-cart | *(cart display)* | cart_display | 2 | 0 | 3x4 | #ffffff | #555 | - | - | Embedded cart view (rows 2-5, cols 0-2) |
| np-display | *(num display)* | num_display | 2 | 3 | 1x4 | - | - | - | - | INACTIVE/OVERLAP -- see Problems #1 |
| btn-meat | MEAT | section | 2 | 3 | 1x1 | #d87868 | #fff | - | Meat | Opens Meat category products |
| btn-coffee | COFFEE | section | 2 | 4 | 1x1 | #78b8d0 | #000 | - | Coffee | Opens Coffee category products |
| btn-fv | FRUIT & VEG | open_price | 2 | 5 | 1x1 | #409850 | #fff | - | - | Open price entry for fruit/veg |
| np-7 | 7 | digit | 2 | 6 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-8 | 8 | digit | 2 | 7 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-9 | 9 | digit | 2 | 8 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-qtyx | QTY X | qtyx | 2 | 9 | 1x1 | #e07020 | #fff | - | - | Set quantity multiplier |
| btn-cheese | CHEESE | section | 3 | 3 | 1x1 | #c8c4bc | #000 | - | Cheese | Opens Cheese category products |
| btn-flowers | FLOWERS | section | 3 | 4 | 1x1 | #4880c0 | #fff | - | Flowers | Opens Flowers category products |
| btn-fvsect | FRUIT & VEG | section | 3 | 5 | 1x1 | #409850 | #fff | - | Fruit | Opens Fruit category product grid |
| np-4 | 4 | digit | 3 | 6 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-5 | 5 | digit | 3 | 7 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-6 | 6 | digit | 3 | 8 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-clear | CLEAR | clear | 3 | 9 | 1x1 | #eeeeee | #000 | - | - | Clear numpad buffer |
| btn-bread | BREAD & CROISSANTS | section | 4 | 4 | 1x1 | #98c030 | #000 | - | Bread & Croissants | Opens Bread category products |
| btn-fvkg | FRUIT & VEG /KG | open_price | 4 | 5 | 1x1 | #2d6a4f | #fff | - | - | Open price entry for kg items |
| np-1 | 1 | digit | 4 | 6 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-2 | 2 | digit | 4 | 7 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-3 | 3 | digit | 4 | 8 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| btn-bags | BAG | fixed_price | 5 | 3 | 1x1 | #222222 | #fff | $0.15 | - | Fixed price bag |
| btn-gas | GAS | section | 5 | 4 | 1x1 | #b0b0b0 | #000 | - | Gas | Opens Gas category products |
| btn-deli | DELI | section | 5 | 5 | 1x1 | #c8a828 | #fff | - | Deli | Opens Deli category products |
| np-0 | 0 | digit | 5 | 6 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-00 | 00 | digit | 5 | 7 | 1x1 | #ffffff | #000 | - | - | Numpad digit |
| np-enter | CODE ENTER | codeenter | 5 | 8 | 2x1 | #eeeeee | #000000 | - | - | PLU/barcode lookup |
| btn-grocery | GROCERY | page_link | 6 | 0 | 2x1 | #6699cc | #fff | - | - | Navigate to Page 6 (Grocery) |
| btn-nuts | NUTS | nav | 6 | 2 | 1x1 | #c8b880 | #000 | - | Nuts | Section filter for Nuts category |
| btn-fruit-am | FRUIT A-M | page_link | 6 | 4 | 1x1 | #c8a828 | #000 | - | - | Navigate to Page 2 (Fruit A-M) |
| btn-fruit-nz | FRUIT N-Z | page_link | 6 | 5 | 1x1 | #c8a828 | #000 | - | - | Navigate to Page 3 (Fruit N-Z) |
| btn-veg-ag | VEGE A-G | page_link | 6 | 6 | 1x1 | #409850 | #fff | - | - | Navigate to Page 4 (Vegetables A-G) |
| btn-veg-hz | VEGE H-Z | page_link | 6 | 7 | 1x1 | #409850 | #fff | - | - | Navigate to Page 5 (Vegetables H-Z) |
| btn-subtotal | SUB TOTAL | subtotal | 6 | 8 | 2x1 | #cc1818 | #fff | - | - | Opens cash payment modal |

---

## Page 2 -- Fruit A-M

**Page ID:** 2
**Name:** Fruit A-M
**Grid:** 10 columns x 7 rows (products use rows 0-3, cols 0-5; col 6 is spacer; cols 7-9 are nav)
**Buttons:** 23
**Purpose:** Product page for fruits A through M
**Links from:** Page 1 (FRUIT A-M), Page 3 (<BACK KEYBOARD FRUIT)
**Links to:** Page 1 (BACK), Page 3 (NEXT KEYBOARD FRUIT>), Page 4 (Vegetable Menu)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | APPLES $5.99/kg | APRICOTS $12.99/kg | AVOCADOS $2.50ea | BANANAS $3.99/kg | CHERRIES KG $14.99/kg | COCONUT EA $4.99ea | *(spacer)* | BACK (3-col) | --- | --- |
| **Row 1** | CUSTARD APPLE KG $6.99/kg | DRAGON FRUIT KG $14.99/kg | FIGS KG $19.99/kg | GRAPES $7.99/kg | GRAPEFRUIT KG $4.99/kg | *(empty)* | *(spacer)* | Vegetable Menu (3-col) | --- | --- |
| **Row 2** | GUAVA KG $8.99/kg | KIWI FRUITS $2.00ea | LEMONS $8.99/kg | LIMES $1.50ea | LONGAN KG $12.99/kg | LYCHEE KG $14.99/kg | *(spacer)* | NEXT KEYBOARD FRUIT> (3x2) | --- | --- |
| **Row 3** | MANDARINS $5.99/kg | MANGOES $3.50ea | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(spacer)* | --- | --- | --- |
| **Row 4** | *(empty)* | *(empty)* | *(empty)* | MELONS $3.99/kg (misplaced, 1x2) | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 5** | *(empty)* | *(empty)* | *(empty)* | --- (melons span) | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 6** | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |

### Button Details -- Page 2

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Unit | Image | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pg2-apples | APPLES | fixed_price | 0 | 0 | 1x1 | #1B4332 | #fff | $5.99 | kg | Yes | |
| pg2-apricots | APRICOTS | fixed_price | 0 | 1 | 1x1 | #1B4332 | #fff | $12.99 | kg | Yes | |
| pg2-avocados | AVOCADOS | fixed_price | 0 | 2 | 1x1 | #1B4332 | #fff | $2.50 | each | Yes | |
| pg2-bananas | BANANAS | fixed_price | 0 | 3 | 1x1 | #1B4332 | #fff | $3.99 | kg | Yes | |
| pg2-cherries | CHERRIES KG | fixed_price | 0 | 4 | 1x1 | #1B4332 | #fff | $14.99 | kg | Yes | |
| pg2-coconut | COCONUT EA | fixed_price | 0 | 5 | 1x1 | #1B4332 | #fff | $4.99 | each | Yes | |
| pg2-back | BACK | back_home | 0 | 7 | 3x1 | #22c55e | #fff | - | - | No | Returns to previous page |
| pg2-custardapple | CUSTARD APPLE KG | fixed_price | 1 | 0 | 1x1 | #1B4332 | #fff | $6.99 | kg | No | |
| pg2-dragonfruit | DRAGON FRUIT KG | fixed_price | 1 | 1 | 1x1 | #1B4332 | #fff | $14.99 | kg | Yes | |
| pg2-figs | FIGS KG | fixed_price | 1 | 2 | 1x1 | #1B4332 | #fff | $19.99 | kg | Yes | |
| pg2-grapes | GRAPES | fixed_price | 1 | 3 | 1x1 | #1B4332 | #fff | $7.99 | kg | Yes | |
| pg2-grapefruit | GRAPEFRUIT KG | fixed_price | 1 | 4 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg2-vegmenu | Vegetable Menu | page_link | 1 | 7 | 3x1 | #86efac | #000 | - | - | No | Navigate to Page 4 |
| pg2-guava | GUAVA KG | fixed_price | 2 | 0 | 1x1 | #1B4332 | #fff | $8.99 | kg | No | |
| pg2-kiwi | KIWI FRUITS | fixed_price | 2 | 1 | 1x1 | #1B4332 | #fff | $2.00 | each | No | |
| pg2-lemons | LEMONS | fixed_price | 2 | 2 | 1x1 | #1B4332 | #fff | $8.99 | kg | No | |
| pg2-limes | LIMES | fixed_price | 2 | 3 | 1x1 | #1B4332 | #fff | $1.50 | each | No | |
| pg2-longan | LONGAN KG | fixed_price | 2 | 4 | 1x1 | #1B4332 | #fff | $12.99 | kg | No | |
| pg2-lychee | LYCHEE KG | fixed_price | 2 | 5 | 1x1 | #1B4332 | #fff | $14.99 | kg | No | |
| pg2-nextfruit | NEXT KEYBOARD FRUIT> | page_link | 2 | 7 | 3x2 | #86efac | #000 | - | - | No | Navigate to Page 3 |
| pg2-mandarins | MANDARINS | fixed_price | 3 | 0 | 1x1 | #1B4332 | #fff | $5.99 | kg | No | |
| pg2-mangoes | MANGOES | fixed_price | 3 | 1 | 1x1 | #1B4332 | #fff | $3.50 | each | Yes | |
| pg2-melons | MELONS | fixed_price | 4 | 3 | 1x2 | #1B4332 | #fff | $3.99 | kg | No | MISPLACED -- outside visible product area |

---

## Page 3 -- Fruit N-Z

**Page ID:** 3
**Name:** Fruit N-Z
**Grid:** 10 columns x 7 rows (products use rows 0-2, cols 0-5; col 6 is spacer; cols 7-9 are nav)
**Buttons:** 18
**Purpose:** Product page for fruits N through Z
**Links from:** Page 1 (FRUIT N-Z), Page 2 (NEXT KEYBOARD FRUIT>)
**Links to:** Page 1 (BACK), Page 2 (<BACK KEYBOARD FRUIT)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | NECTARINES $7.99 | ORANGES $4.99 | PASSION FRUIT EA $1.50 | PAPAYA RED KG $5.99 | PAW PAW GREEN KG $4.99 | PEACHES $7.99 | *(spacer)* | BACK (3-col) | --- | --- |
| **Row 1** | PEARS $5.99 | PERSIMMONS KG $9.99 | SM PINEAPPLE EA $3.99 | MED PINEAPPLE EA $4.99 | XL PINEAPPLE EA $6.99 | PLUMS $9.99 | *(spacer)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 2** | POMEGRANATE EA $3.99 | POMMELO KG $6.99 | QUINCE KG $7.99 | TANGELLO KG $4.99 | *(empty)* | *(empty)* | *(spacer)* | <BACK KEYBOARD FRUIT (3-col) | --- | --- |
| **Row 3-6** | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |

### Button Details -- Page 3

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Unit | Image | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pg3-nectarines | NECTARINES | fixed_price | 0 | 0 | 1x1 | #1B4332 | #fff | $7.99 | kg | No | |
| pg3-oranges | ORANGES | fixed_price | 0 | 1 | 1x1 | #1B4332 | #fff | $4.99 | kg | Yes | |
| pg3-passionfruit | PASSION FRUIT EA | fixed_price | 0 | 2 | 1x1 | #1B4332 | #fff | $1.50 | each | No | |
| pg3-papaya | PAPAYA RED KG | fixed_price | 0 | 3 | 1x1 | #1B4332 | #fff | $5.99 | kg | No | |
| pg3-pawpaw | PAW PAW GREEN KG | fixed_price | 0 | 4 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg3-peaches | PEACHES | fixed_price | 0 | 5 | 1x1 | #1B4332 | #fff | $7.99 | kg | No | |
| pg3-back | BACK | back_home | 0 | 7 | 3x1 | #22c55e | #fff | - | - | No | Returns to previous page |
| pg3-pears | PEARS | fixed_price | 1 | 0 | 1x1 | #1B4332 | #fff | $5.99 | kg | No | |
| pg3-persimmons | PERSIMMONS KG | fixed_price | 1 | 1 | 1x1 | #1B4332 | #fff | $9.99 | kg | No | |
| pg3-smpineapple | SM PINEAPPLE EA | fixed_price | 1 | 2 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg3-medpineapple | MED PINEAPPLE EA | fixed_price | 1 | 3 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg3-xlpineapple | XL PINEAPPLE EA | fixed_price | 1 | 4 | 1x1 | #1B4332 | #fff | $6.99 | each | No | |
| pg3-plums | PLUMS | fixed_price | 1 | 5 | 1x1 | #1B4332 | #fff | $9.99 | kg | No | |
| pg3-pomegranate | POMEGRANATE EA | fixed_price | 2 | 0 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg3-pommelo | POMMELO KG | fixed_price | 2 | 1 | 1x1 | #1B4332 | #fff | $6.99 | kg | No | |
| pg3-quince | QUINCE KG | fixed_price | 2 | 2 | 1x1 | #1B4332 | #fff | $7.99 | kg | No | |
| pg3-tangello | TANGELLO KG | fixed_price | 2 | 3 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg3-backfruit | <BACK KEYBOARD FRUIT | page_link | 2 | 7 | 3x1 | #86efac | #000 | - | - | No | Navigate to Page 2 |

---

## Page 4 -- Vegetables A-G

**Page ID:** 4
**Name:** Vegetables A-G
**Grid:** 10 columns x 7 rows (products use rows 0-3, cols 0-5; col 6 is spacer; cols 7-9 are nav)
**Buttons:** 26
**Purpose:** Product page for vegetables A through G
**Links from:** Page 1 (VEGE A-G), Page 2 (Vegetable Menu), Page 5 (<BACK KEYBOARD VEG)
**Links to:** Page 1 (BACK), Page 2 (FRUIT MENU), Page 5 (NEXT KEYBOARD VEGE>)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | ASIAN VEGE EA $3.99 | ASPARAGUS EA $4.99 | BEANS KG $9.99 | BEETROOT $4.99 | BOTTLE GOURD $5.99 | BROCCOLI $5.99 | *(spacer)* | BACK (3-col) | --- | --- |
| **Row 1** | BRUSSEL SPROUTS KG $12.99 | CABBAGE $3.99ea | CAPSICUM $12.99 | CARROTS LOOSE KG $2.49 | CARROT BAG EA $2.99 | CAULIFLOWER EA $4.99 | *(spacer)* | FRUIT MENU (3-col) | --- | --- |
| **Row 2** | CELERY EA $3.99 | CELERIAC EA $5.99 | CHILLIES $29.99 | CHOKOS KG $4.99 | CORN EA $1.99 | CUCUMBERS $2.99ea | *(spacer)* | NEXT KEYBOARD VEGE> (3x2) | --- | --- |
| **Row 3** | EGGPLANT KG $5.99 | LEB EGGPLANT KG $7.99 | FENNEL EA $4.99 | GARLIC $19.99 | GINGER KG $24.99 | *(empty)* | *(spacer)* | --- | --- | --- |
| **Row 4-6** | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |

### Button Details -- Page 4

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Unit | Image | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pg4-asianvege | ASIAN VEGE EA | fixed_price | 0 | 0 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg4-asparagus | ASPARAGUS EA | fixed_price | 0 | 1 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg4-beans | BEANS KG | fixed_price | 0 | 2 | 1x1 | #1B4332 | #fff | $9.99 | kg | No | |
| pg4-beetroot | BEETROOT | fixed_price | 0 | 3 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg4-bottlegourd | BOTTLE GOURD | fixed_price | 0 | 4 | 1x1 | #1B4332 | #fff | $5.99 | each | No | |
| pg4-broccoli | BROCCOLI | fixed_price | 0 | 5 | 1x1 | #1B4332 | #fff | $5.99 | each | Yes | |
| pg4-back | BACK | back_home | 0 | 7 | 3x1 | #22c55e | #fff | - | - | No | Returns to previous page |
| pg4-brusselsprouts | BRUSSEL SPROUTS KG | fixed_price | 1 | 0 | 1x1 | #1B4332 | #fff | $12.99 | kg | No | |
| pg4-cabbage | CABBAGE | fixed_price | 1 | 1 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg4-capsicum | CAPSICUM | fixed_price | 1 | 2 | 1x1 | #1B4332 | #fff | $12.99 | kg | Yes | |
| pg4-carrotsloose | CARROTS LOOSE KG | fixed_price | 1 | 3 | 1x1 | #1B4332 | #fff | $2.49 | kg | Yes | |
| pg4-carrotbag | CARROT BAG EA | fixed_price | 1 | 4 | 1x1 | #1B4332 | #fff | $2.99 | each | No | |
| pg4-cauliflower | CAULIFLOWER EA | fixed_price | 1 | 5 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg4-fruitmenu | FRUIT MENU | page_link | 1 | 7 | 3x1 | #86efac | #000 | - | - | No | Navigate to Page 2 |
| pg4-celery | CELERY EA | fixed_price | 2 | 0 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg4-celeriac | CELERIAC EA | fixed_price | 2 | 1 | 1x1 | #1B4332 | #fff | $5.99 | each | No | |
| pg4-chillies | CHILLIES | fixed_price | 2 | 2 | 1x1 | #1B4332 | #fff | $29.99 | kg | No | |
| pg4-chokos | CHOKOS KG | fixed_price | 2 | 3 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg4-corn | CORN EA | fixed_price | 2 | 4 | 1x1 | #1B4332 | #fff | $1.99 | each | No | |
| pg4-cucumbers | CUCUMBERS | fixed_price | 2 | 5 | 1x1 | #1B4332 | #fff | $2.99 | each | No | |
| pg4-nextvege | NEXT KEYBOARD VEGE> | page_link | 2 | 7 | 3x2 | #86efac | #000 | - | - | No | Navigate to Page 5 |
| pg4-eggplant | EGGPLANT KG | fixed_price | 3 | 0 | 1x1 | #1B4332 | #fff | $5.99 | kg | No | |
| pg4-lebeggplant | LEB EGGPLANT KG | fixed_price | 3 | 1 | 1x1 | #1B4332 | #fff | $7.99 | kg | No | |
| pg4-fennel | FENNEL EA | fixed_price | 3 | 2 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg4-garlic | GARLIC | fixed_price | 3 | 3 | 1x1 | #1B4332 | #fff | $19.99 | kg | No | |
| pg4-ginger | GINGER KG | fixed_price | 3 | 4 | 1x1 | #1B4332 | #fff | $24.99 | kg | No | |

---

## Page 5 -- Vegetables H-Z

**Page ID:** 5
**Name:** Vegetables H-Z
**Grid:** 10 columns x 7 rows (products use rows 0-3, cols 0-5; col 6 is spacer; cols 7-9 are nav)
**Buttons:** 27
**Purpose:** Product page for vegetables H through Z
**Links from:** Page 1 (VEGE H-Z), Page 4 (NEXT KEYBOARD VEGE>)
**Links to:** Page 1 (BACK), Page 2 (FRUIT MENU), Page 4 (<BACK KEYBOARD VEG)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | HERBS $2.99ea | KALE EA $3.99 | LEEKS EA $3.99 | LETTUCES $2.99ea | LETTUCE BAGS EA $3.99 | LOBOK KG $4.99 | *(spacer)* | BACK (3-col) | --- | --- |
| **Row 1** | MUSHROOMS $12.99 | OLIVES KG $14.99 | ONIONS $2.99 | PARSNIP KG $7.99 | PEAS KG $9.99 | POTATOES $3.99 | *(spacer)* | FRUIT MENU (3-col) | --- | --- |
| **Row 2** | PUMPKINS $2.99 | RADISH BUNCH EA $2.99 | RHUBARB EA $4.99 | SHALLOTS EA $2.99 | SILVERBEET EA $3.99 | SNOW PEAS KG $14.99 | *(spacer)* | <BACK KEYBOARD VEG (3-col) | --- | --- |
| **Row 3** | SUGAR SNAP PEAS KG $14.99 | SWEDES KG $4.99 | SWEET POTATOES $4.99 | TOMATOES $5.99 | TURNIP KG $3.99 | ZUCCHINI $5.99 | *(spacer)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 4-6** | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |

### Button Details -- Page 5

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Unit | Image | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pg5-herbs | HERBS | fixed_price | 0 | 0 | 1x1 | #1B4332 | #fff | $2.99 | each | No | |
| pg5-kale | KALE EA | fixed_price | 0 | 1 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg5-leeks | LEEKS EA | fixed_price | 0 | 2 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg5-lettuces | LETTUCES | fixed_price | 0 | 3 | 1x1 | #1B4332 | #fff | $2.99 | each | Yes | |
| pg5-lettucebags | LETTUCE BAGS EA | fixed_price | 0 | 4 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg5-lobok | LOBOK KG | fixed_price | 0 | 5 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg5-back | BACK | back_home | 0 | 7 | 3x1 | #22c55e | #fff | - | - | No | Returns to previous page |
| pg5-mushrooms | MUSHROOMS | fixed_price | 1 | 0 | 1x1 | #1B4332 | #fff | $12.99 | kg | Yes | |
| pg5-olives | OLIVES KG | fixed_price | 1 | 1 | 1x1 | #1B4332 | #fff | $14.99 | kg | No | |
| pg5-onions | ONIONS | fixed_price | 1 | 2 | 1x1 | #1B4332 | #fff | $2.99 | kg | Yes | |
| pg5-parsnip | PARSNIP KG | fixed_price | 1 | 3 | 1x1 | #1B4332 | #fff | $7.99 | kg | No | |
| pg5-peas | PEAS KG | fixed_price | 1 | 4 | 1x1 | #1B4332 | #fff | $9.99 | kg | No | |
| pg5-potatoes | POTATOES | fixed_price | 1 | 5 | 1x1 | #1B4332 | #fff | $3.99 | kg | Yes | |
| pg5-fruitmenu | FRUIT MENU | page_link | 1 | 7 | 3x1 | #86efac | #000 | - | - | No | Navigate to Page 2 |
| pg5-pumpkins | PUMPKINS | fixed_price | 2 | 0 | 1x1 | #1B4332 | #fff | $2.99 | kg | No | |
| pg5-radish | RADISH BUNCH EA | fixed_price | 2 | 1 | 1x1 | #1B4332 | #fff | $2.99 | each | No | |
| pg5-rhubarb | RHUBARB EA | fixed_price | 2 | 2 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg5-shallots | SHALLOTS EA | fixed_price | 2 | 3 | 1x1 | #1B4332 | #fff | $2.99 | each | No | |
| pg5-silverbeet | SILVERBEET EA | fixed_price | 2 | 4 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg5-snowpeas | SNOW PEAS KG | fixed_price | 2 | 5 | 1x1 | #1B4332 | #fff | $14.99 | kg | No | |
| pg5-backveg | <BACK KEYBOARD VEG | page_link | 2 | 7 | 3x1 | #86efac | #000 | - | - | No | Navigate to Page 4 |
| pg5-sugarsnap | SUGAR SNAP PEAS KG | fixed_price | 3 | 0 | 1x1 | #1B4332 | #fff | $14.99 | kg | No | |
| pg5-swedes | SWEDES KG | fixed_price | 3 | 1 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg5-sweetpotatoes | SWEET POTATOES | fixed_price | 3 | 2 | 1x1 | #1B4332 | #fff | $4.99 | kg | No | |
| pg5-tomatoes | TOMATOES | fixed_price | 3 | 3 | 1x1 | #1B4332 | #fff | $5.99 | kg | Yes | |
| pg5-turnip | TURNIP KG | fixed_price | 3 | 4 | 1x1 | #1B4332 | #fff | $3.99 | kg | No | |
| pg5-zucchini | ZUCCHINI | fixed_price | 3 | 5 | 1x1 | #1B4332 | #fff | $5.99 | kg | No | |

---

## Page 6 -- Grocery

**Page ID:** 6
**Name:** Grocery
**Grid:** 10 columns x 7 rows (products use rows 0-2, cols 0-5; col 6 is spacer; cols 7-9 are nav)
**Buttons:** 14
**Purpose:** Grocery product page
**Links from:** Page 1 (GROCERY)
**Links to:** Page 1 (BACK)

### Grid Layout

| | Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| **Row 0** | GROCERY (section, 2-col) | --- | CONFECTIONARY $0.00 | CHIPS $3.99ea | SIMPLY PIES $5.99ea | WATER 12PK $6.99ea | *(spacer)* | BACK (3-col) | --- | --- |
| **Row 1** | SALMON PIECES $7.99ea | SALMON FILLET $12.99ea | FRESH JUICE 500ML $4.99ea | JUICE 1L $6.99ea | LEMON JUICE 500ML $3.99ea | *(empty)* | *(spacer)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 2** | ASSORTED SPICES $5.99ea | MIXED PICKLES $6.99ea | ALTERNATIVE MILK $4.99ea | *(empty)* | *(empty)* | *(empty)* | *(spacer)* | *(empty)* | *(empty)* | *(empty)* |
| **Row 3-6** | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* | *(empty)* |

### Button Details -- Page 6

| ID | Label | Type | Row | Col | Span | BG | Text | Price | Unit | Image | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| pg6-grocery | GROCERY | section | 0 | 0 | 2x1 | #6699cc | #fff | - | - | No | Opens Grocery category product grid |
| pg6-confectionary | CONFECTIONARY | fixed_price | 0 | 2 | 1x1 | #1B4332 | #fff | $0.00 | each | No | Price is $0.00 -- needs configuration |
| pg6-chips | CHIPS | fixed_price | 0 | 3 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg6-simplypies | SIMPLY PIES | fixed_price | 0 | 4 | 1x1 | #1B4332 | #fff | $5.99 | each | No | |
| pg6-water12pk | WATER 12PK | fixed_price | 0 | 5 | 1x1 | #1B4332 | #fff | $6.99 | each | No | |
| pg6-back | BACK | back_home | 0 | 7 | 3x1 | #22c55e | #fff | - | - | No | Returns to previous page |
| pg6-salmonpieces | SALMON PIECES | fixed_price | 1 | 0 | 1x1 | #1B4332 | #fff | $7.99 | each | No | |
| pg6-salmonfillet | SALMON FILLET | fixed_price | 1 | 1 | 1x1 | #1B4332 | #fff | $12.99 | each | No | |
| pg6-freshjuice | FRESH JUICE 500ML | fixed_price | 1 | 2 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |
| pg6-juice1l | JUICE 1L | fixed_price | 1 | 3 | 1x1 | #1B4332 | #fff | $6.99 | each | No | |
| pg6-lemonjuice | LEMON JUICE 500ML | fixed_price | 1 | 4 | 1x1 | #1B4332 | #fff | $3.99 | each | No | |
| pg6-spices | ASSORTED SPICES | fixed_price | 2 | 0 | 1x1 | #1B4332 | #fff | $5.99 | each | No | |
| pg6-pickles | MIXED PICKLES | fixed_price | 2 | 1 | 1x1 | #1B4332 | #fff | $6.99 | each | No | |
| pg6-altmilk | ALTERNATIVE MILK | fixed_price | 2 | 2 | 1x1 | #1B4332 | #fff | $4.99 | each | No | |

---

## Page Link Map

```
Main Register (Page 1)
|
+-- GROCERY -----------> Page 6 (Grocery)
|                         +-- BACK --> returns to previous page (Page 1)
|
+-- FRUIT A-M ----------> Page 2 (Fruit A-M)
|                         +-- BACK --> returns to previous page (Page 1)
|                         +-- Vegetable Menu --> Page 4 (Vegetables A-G)
|                         +-- NEXT KEYBOARD FRUIT> --> Page 3 (Fruit N-Z)
|
+-- FRUIT N-Z ----------> Page 3 (Fruit N-Z)
|                         +-- BACK --> returns to previous page (Page 1)
|                         +-- <BACK KEYBOARD FRUIT --> Page 2 (Fruit A-M)
|
+-- VEGE A-G -----------> Page 4 (Vegetables A-G)
|                         +-- BACK --> returns to previous page (Page 1)
|                         +-- FRUIT MENU --> Page 2 (Fruit A-M)
|                         +-- NEXT KEYBOARD VEGE> --> Page 5 (Vegetables H-Z)
|
+-- VEGE H-Z -----------> Page 5 (Vegetables H-Z)
|                         +-- BACK --> returns to previous page (Page 1)
|                         +-- FRUIT MENU --> Page 2 (Fruit A-M)
|                         +-- <BACK KEYBOARD VEG --> Page 4 (Vegetables A-G)
|
+-- NUTS (nav filter, inline section view -- not a page_link)
```

### Cross-Page Navigation Summary

| From | Button | To | Type |
|---|---|---|---|
| Page 1 | GROCERY | Page 6 | page_link |
| Page 1 | FRUIT A-M | Page 2 | page_link |
| Page 1 | FRUIT N-Z | Page 3 | page_link |
| Page 1 | VEGE A-G | Page 4 | page_link |
| Page 1 | VEGE H-Z | Page 5 | page_link |
| Page 2 | BACK | Page 1 | back_home |
| Page 2 | Vegetable Menu | Page 4 | page_link |
| Page 2 | NEXT KEYBOARD FRUIT> | Page 3 | page_link |
| Page 3 | BACK | Page 1 | back_home |
| Page 3 | <BACK KEYBOARD FRUIT | Page 2 | page_link |
| Page 4 | BACK | Page 1 | back_home |
| Page 4 | FRUIT MENU | Page 2 | page_link |
| Page 4 | NEXT KEYBOARD VEGE> | Page 5 | page_link |
| Page 5 | BACK | Page 1 | back_home |
| Page 5 | FRUIT MENU | Page 2 | page_link |
| Page 5 | <BACK KEYBOARD VEG | Page 4 | page_link |
| Page 6 | BACK | Page 1 | back_home |

---

## Button Inventory Summary

### By Page

| Page | Name | Total Buttons | Product Buttons | Function Buttons | Nav Buttons | Empty Cells |
|---|---|---|---|---|---|---|
| 1 | Main Register | 49 | 1 (BAG) | 16 | 7 | 4 |
| 2 | Fruit A-M | 23 | 19 | 0 | 3 (+1 misplaced) | ~30 |
| 3 | Fruit N-Z | 18 | 16 | 0 | 2 | ~44 |
| 4 | Vegetables A-G | 26 | 22 | 0 | 3 (+1 multi-span) | ~27 |
| 5 | Vegetables H-Z | 27 | 24 | 0 | 3 | ~26 |
| 6 | Grocery | 14 | 12 | 0 | 1 (+1 section) | ~46 |
| **TOTAL** | | **157** | **94** | **16** | **20** | |

### By Type

| Type | Count | Description |
|---|---|---|
| fixed_price | 93 | Product button with set price |
| digit | 10 | Numpad digits (0-9, 00) |
| page_link | 12 | Navigate to another page |
| back_home | 5 | Return to previous page |
| section | 9 | Opens category product grid |
| open_price | 2 | Cashier enters price |
| lock | 1 | Lock register |
| supervisor | 1 | Supervisor mode prompt |
| return | 1 | Return/refund mode |
| void | 1 | Remove last item |
| hold | 1 | Park sale |
| nosale | 1 | Open drawer |
| viewor | 1 | View options (unused) |
| pricecheck | 1 | Price lookup |
| reprint | 1 | Reprint receipt |
| pctdiscount | 1 | % discount whole sale |
| pctone | 1 | % discount one item |
| movedrawer | 1 | Open drawer |
| errcorrect | 1 | Remove last item |
| recall | 1 | Recall parked sale |
| ubereats | 1 | Uber Eats markup |
| qtyx | 1 | Quantity multiplier |
| clear | 1 | Clear numpad |
| codeenter | 1 | PLU lookup |
| subtotal | 1 | Open payment modal |
| nav | 1 | Category filter (NUTS) |
| cart_display | 1 | Embedded cart view |
| num_display | 1 | Numpad display (INACTIVE/OVERLAP) |
| **TOTAL** | **157** | |

---

## Problems Found

### 1. np-display Overlap at Page 1, Row 2, Col 3 (CRITICAL)

The `np-display` button (id=np-display, type=num_display) is positioned at page 1, row 2, col 3 with col_span=1, row_span=4, and has `active=1`. This directly overlaps with `btn-meat` (type=section) at the exact same position (page 1, row 2, col 3). The np-display button should have `active=0` but the migration that was supposed to deactivate it did not apply correctly to the live database. The register rendering code likely handles this by filtering or z-ordering, but it is a data integrity issue.

### 2. pg2-melons Misplaced at Page 2, Row 4, Col 3 (MINOR)

The `pg2-melons` button (MELONS $3.99/kg) is positioned at row 4, col 3 with row_span=2. All other product buttons on page 2 are within rows 0-3. Row 4 is outside the typical visible product area and this button is likely not visible to the cashier or is rendered in an unexpected position. It was probably moved/misplaced during keyboard editing.

### 3. CONFECTIONARY at $0.00 on Page 6 (DATA ISSUE)

The `pg6-confectionary` button (CONFECTIONARY) has a price of $0.00. This is likely a placeholder that was never configured with an actual price. Pressing it would add a $0.00 line item to the cart.

### 4. Empty Cells on Page 1 (COSMETIC)

Four cells on page 1 have no button assigned:
- Row 1, Col 7: gap between UBER EATS ADJ and PRICE CHECK 2x2
- Row 4, Col 3: gap in department area (between row 3 departments and row 5 departments)
- Row 4, Col 9: gap in numpad area (below digit 3, above CODE ENTER)
- Row 6, Col 3: gap in bottom nav between NUTS and FRUIT A-M

### 5. Column 6 Spacer on Pages 2-6 (INTENTIONAL but WASTEFUL)

Column 6 is consistently left empty on all product pages (2-6) as a visual separator between the product area (cols 0-5) and the navigation buttons (cols 7-9). This wastes 1/10th of the grid width on every product page.

### 6. Open Price Buttons Not Linked to Product Records (DESIGN ISSUE)

Page 1 has two `open_price` buttons ("FRUIT & VEG" at row 2 col 5, and "FRUIT & VEG /KG" at row 4 col 5). These require the cashier to manually enter a price every time, even though fruit and vegetable products exist in the product database with prices. The product page buttons (pages 2-5) use `fixed_price` type with prices set, but these main-page shortcut buttons do not.

### 7. Unused Bottom Rows on Pages 2-6 (COSMETIC)

Pages 2-6 only use rows 0-3 (or 0-2 for pages 3 and 6) for product buttons, leaving rows 4-6 completely empty. The grid is 7 rows tall but at most 4 rows are used for content. This is wasted space that could accommodate more products.

### 8. No Page Names Configured in Settings (MINOR)

The `keyboard_page_names` setting is not configured. Pages use default numeric labels (Page 1, Page 2, etc.) in the admin keyboard editor rather than descriptive names (Main Register, Fruit A-M, etc.).

### 9. VIEW OR... Button Not Functional (MINOR)

The `fn-viewor` button (VIEW OR...) at page 1, row 0, col 7 has type=viewor but this function is described as "not configured" -- it exists as a placeholder from the Profit Track layout but has no implemented behavior.
