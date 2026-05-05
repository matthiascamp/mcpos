# Crisp POS — Full Feature & Design Audit

> **Generated:** 2026-05-05  
> **App Version:** Electron v33.2.0 desktop POS  
> **Target Deployment:** Crisp on Creek, 1832 Logan Rd, Mt Gravatt QLD 4122

---

## Table of Contents

1. [App Architecture](#1-app-architecture)
2. [Screens & Pages](#2-screens--pages)
3. [POS Register Screen — Features](#3-pos-register-screen--features)
4. [Admin Panel — Features](#4-admin-panel--features)
5. [Customer Display](#5-customer-display)
6. [Keyboard / Grid Layout — All Pages](#6-keyboard--grid-layout--all-pages)
7. [Design & Visual Style](#7-design--visual-style)
8. [Backend & Data Layer](#8-backend--data-layer)
9. [Hardware Integration](#9-hardware-integration)
10. [Networking & Sync](#10-networking--sync)
11. [Business Intent Analysis](#11-business-intent-analysis)
12. [Missing / Next Build Priorities](#12-missing--next-build-priorities)

---

## 1. App Architecture

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Electron v33.2.0 | Chromium + Node.js desktop wrapper |
| Database | sql.js v1.11+ (WASM) | SQLite in WebAssembly — chosen because `better-sqlite3` won't compile on Node v25.9.0 with spaces in path |
| Frontend | Vanilla JS + HTML + CSS | No framework, no build step, ES modules |
| IPC Bridge | `preload.js` → `contextBridge`/`ipcRenderer` | ~50 methods exposed as `window.pos.*` |
| ID Generation | `uuid` v11 | UUIDs for all record primary keys |
| Cloud Sync | Supabase | Edge functions in `/supabase`, realtime subscriptions |
| LAN Sync | Custom Node.js HTTP + UDP | No npm dependencies, built-in `http` + `dgram` |
| Receipt Printing | ESC/POS via PowerShell `rawprint.ps1` | Uses `winspool.drv` P/Invoke |
| Build/Package | electron-builder v25.1.8 | Windows portable + NSIS installer targets |

### File Structure

```
mcpos/
├── main.js                  # Electron main process (1166 lines) — DB init, IPC handlers, hardware, receipts, customer display, LAN sync
├── preload.js               # contextBridge API — window.pos.* (~100 lines, ~50 methods)
├── lan-sync.js              # LAN multi-register sync (635 lines) — HTTP server/client, UDP discovery
├── package.json             # Dependencies, scripts, electron-builder config
├── rawprint.ps1             # PowerShell ESC/POS raw printer bridge (75 lines)
├── migrate-from-pt.js       # One-shot Profit Track migration script
├── db/
│   └── schema.sql           # SQLite schema + seed data (431 lines)
├── pos/
│   ├── index.html           # POS register screen (2065 lines)
│   ├── admin.html           # Admin panel (2500+ lines)
│   ├── customer.html        # Customer-facing second display (153 lines)
│   ├── logo.png             # Store logo
│   └── js/
│       ├── cart.js           # Shopping cart class (102 lines)
│       ├── ui.js             # Shared UI helpers (50 lines)
│       └── sync.js           # Supabase cloud sync engine (132 lines)
├── supabase/
│   └── schema.sql           # Cloud Postgres schema (198 lines)
└── docs/
    └── profit-track-reference.md  # Legacy POS documentation
```

### Process Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Electron Main Process (main.js)                                     │
│  ├── sql.js WASM Database (in-memory, persisted to disk on write)  │
│  ├── IPC Handler Registry (~50 channels)                           │
│  ├── LAN Sync Server/Client (lan-sync.js)                          │
│  ├── Hardware Probing (PowerShell Get-PnpDevice)                   │
│  └── ESC/POS Receipt Printer (rawprint.ps1)                        │
├─────────────────────────────────────────────────────────────────────┤
│ Renderer: POS Register (pos/index.html)                            │
│  ├── preload.js → window.pos.* API                                 │
│  ├── Cart class (pos/js/cart.js)                                   │
│  ├── UI helpers (pos/js/ui.js)                                     │
│  └── Sync engine (pos/js/sync.js)                                  │
├─────────────────────────────────────────────────────────────────────┤
│ Renderer: Admin Panel (pos/admin.html)                             │
│  └── preload.js → window.pos.* API                                 │
├─────────────────────────────────────────────────────────────────────┤
│ Renderer: Customer Display (pos/customer.html)                     │
│  └── Direct IPC via require('electron').ipcRenderer                │
│     (nodeIntegration: true, no contextBridge)                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User action** → Renderer calls `window.pos.someMethod(args)` via preload bridge
2. **IPC handler** in `main.js` receives, executes SQL via `dbRun()` / `dbAll()` / `dbGet()`
3. **Write path**: `dbRun()` → `scheduleSave()` (1-second debounced) → exports sql.js DB bytes → writes to disk
4. **Sync path**: If write is a product/deal/staff upsert → `queueSync()` appends to `sync_queue` table
5. **Cloud sync**: `pos/js/sync.js` periodically pushes `sync_queue` to Supabase and pulls updates
6. **LAN sync**: Server exposes HTTP API; clients pull every 15 seconds

---

## 2. Screens & Pages

### Total: 3 screens + 12 modal overlays

| # | Screen | File | Purpose |
|---|---|---|---|
| 1 | **POS Register** | `pos/index.html` | Main cashier-facing transaction screen |
| 2 | **Admin Panel** | `pos/admin.html` | Back-office management (12 tabs) |
| 3 | **Customer Display** | `pos/customer.html` | Customer-facing second monitor |

### POS Register Sub-views

| View | Description |
|---|---|
| Login Overlay | Full-screen PIN entry (visible at startup) |
| Keyboard Home | Dynamic grid from DB (Page 1 = main register layout) |
| Section View | Product grid when drilling into a category |
| Product Pages | Full-width product grids (Pages 2-6: Fruit A-M, Fruit N-Z, Veg A-G, Veg H-Z, Grocery) |

### POS Register Modals (12)

| Modal ID | Purpose | Size |
|---|---|---|
| `cashModal` | Cash payment with numpad, quick amounts, split payment | 440px |
| `openPriceModal` | Enter price for open-price items (cents input) | 400px |
| `priceChangeModal` | Change price of last/selected item | 400px |
| `weightModal` | Enter weight for kg/100g products | 400px |
| `recallModal` | List and restore parked/held transactions | 480px |
| `discountModal` | Enter discount percentage | 400px |
| `supervisorModal` | Supervisor PIN entry for elevated access | 320px |
| `priceCheckModal` | Look up product price by barcode/search | 420px |
| `uberModal` | Uber Eats 30% markup adjustment | 400px |
| `returnLookupModal` | Find receipt for returns, select items to refund | 520px |
| `reprintModal` | Reprint previous receipt | 400px |
| `drawerModal` | Cash drawer float/pickup/drop entry | 400px |

### Admin Panel Tabs (12)

| # | Tab | Purpose |
|---|---|---|
| 1 | Dashboard | Daily sales summary, top products |
| 2 | Transactions | Search/filter transactions, CSV export |
| 3 | Cash Drawer | Float/pickup/drop log, drawer balance |
| 4 | Z Report | End-of-day report with printable view |
| 5 | Products | CRUD products, search, edit panel |
| 6 | Deals | Manage promotions (multi_buy, buy_x_get_y, etc.) |
| 7 | Staff | Add/edit staff, PIN management |
| 8 | Keyboard | Visual grid layout editor with drag-and-drop |
| 9 | Network | LAN sync configuration (server/client mode) |
| 10 | Hardware | Device probing, status indicators |
| 11 | Import | JSON paste/URL + CSV drag-drop product import |
| 12 | Settings | Store details, receipt text, Supabase sync config |

---

## 3. POS Register Screen — Features

### 3.1 PIN Login

| Aspect | Detail |
|---|---|
| **Trigger** | Shown at startup, also when LOCK pressed |
| **UI** | Logo, store name, PIN dot display, 3×4 numpad (1-9, CLR, 0, GO) |
| **Auth** | `window.pos.staffLogin(pin)` → returns `{id, name, role}` or null |
| **On success** | Hide overlay, set `currentStaff`, show welcome toast, focus barcode input |
| **On failure** | Red "Invalid PIN" text, clear PIN buffer |
| **Roles** | cashier, manager, admin — role stored but not heavily enforced in UI |
| **Seeded default** | If no active staff exist, seeds a default (PIN: 1234, role: admin) |

### 3.2 Barcode Scanning / Product Search

| Aspect | Detail |
|---|---|
| **Input** | `#searchInput` in status bar, always auto-focused |
| **Scan flow** | On Enter: `getProductByBarcode(value)` → if found, add directly to cart |
| **Search flow** | On input (debounced 250ms): if 2+ chars, `searchProducts(query)` → shows results in product grid |
| **Search SQL** | LIKE match on name, barcode, PLU; joins specials for active price; limit 50 |
| **Recent drawer** | Shows recent items below search input |

### 3.3 Shopping Cart

| Aspect | Detail |
|---|---|
| **Location** | Left panel, 320px wide, white background |
| **Class** | `Cart` in `pos/js/cart.js` |
| **Add behavior** | If unit=`each` and already in cart: increments qty. Otherwise: new line |
| **Per-item controls** | +/- qty buttons, delete button |
| **Item display** | Name, qty × unit_price, line_total. Special badge (red) or deal badge (green) if applicable |
| **Totals** | Subtotal, Discount (shown if non-zero), GST (incl.), Total |
| **Tax calc** | `tax = line_total × tax_rate / (1 + tax_rate)` — extracts GST from inclusive price |
| **Actions** | Pay Cash (green), Card/EFTPOS (gray), Park (outlined) |
| **Persistence** | Cart items stored in `localStorage` for crash recovery |
| **Clear** | "Clear All" button in cart header |

### 3.4 Numpad (On-Screen)

| Aspect | Detail |
|---|---|
| **Layout** | 4×4 grid: 7-8-9-QTYX / 4-5-6-CLEAR / 1-2-3-(empty) / 0-00-CODE ENTER |
| **Buffer** | `numBuf` string, shown in status bar (green LED style when active) |
| **QTY X** | Sets `qtyMultiplier` from numBuf, shows orange floating badge "QTY x5" |
| **CLEAR** | Resets numBuf and qtyMultiplier |
| **CODE ENTER** | Looks up numBuf as PLU/barcode |

### 3.5 Payment — Cash

| Aspect | Detail |
|---|---|
| **Trigger** | SUB TOTAL button, Pay Cash button, or F2 |
| **Modal** | Shows total, tendered input (read-only, uses numpad), quick amounts (Exact/$5/$10/$20/$50/$100) |
| **Numpad** | 4×4: digits, C (clear), 00, backspace, decimal, ENTER |
| **Change calc** | Green if overpaid (shows change amount), red if short |
| **Change breakdown** | Shows denomination breakdown (e.g., 2×$20 + 1×$5) |
| **Split payment** | "Split: Card" button allows partial card payment first, then cash for remainder |
| **Complete** | Saves transaction, prints receipt, opens cash drawer, shows completion animation |

### 3.6 Payment — Card/EFTPOS

| Aspect | Detail |
|---|---|
| **Trigger** | Card/EFTPOS button or F3 |
| **Flow** | Immediate completion with method='card', amount=total |
| **No integration** | Does not talk to a payment terminal — assumes manual EFTPOS entry |

### 3.7 Split Payments

| Aspect | Detail |
|---|---|
| **Flow** | In cash modal, click "Split: Card" → enter card amount → remainder becomes cash amount |
| **Display** | Split badges show each payment method and amount, with remove option |
| **Transaction save** | Creates multiple payment records in `payments` table |

### 3.8 Open Price Entry

| Aspect | Detail |
|---|---|
| **Trigger** | `open_price` type buttons (e.g., "FRUIT & VEG") |
| **Modal** | Numpad, price display in dollars (input is in cents: 150 = $1.50) |
| **Result** | Adds generic product line item with entered price and button's label as name |

### 3.9 Weight Entry

| Aspect | Detail |
|---|---|
| **Trigger** | Scanning a product with unit = `kg` or `100g` |
| **Modal** | Numpad with decimal point, shows product name and per-kg/100g price |
| **Calc** | line_total = price × weight (or price × weight / 10 for 100g) |

### 3.10 Register Function Buttons

| Button | Type | Behavior |
|---|---|---|
| **LOCK** | `lock` | Show PIN login overlay, clear any return/supervisor mode |
| **SUPERVISOR ONLY** | `supervisor` | Prompt for manager/admin PIN → enables supervisor mode for 60 seconds |
| **RETURN** | `return` | If cart empty: show return-by-receipt lookup. If cart has items: toggle return mode (next scans are negative) |
| **VOID** | `void` | Remove last item from cart |
| **Hold Sale** | `hold` | Park current cart as transaction with status='parked', clear cart |
| **NO SALE** | `nosale` | Open cash drawer via `window.pos.openDrawer()` |
| **VIEW OR...** | `viewor` | Placeholder — not implemented |
| **PRICE CHECK** | `pricecheck` | Modal: search product by barcode/name, shows price + stock + special info |
| **REPRINT** | `reprint` | Reprint last completed receipt |
| **% DISCOUNT** | `pctdiscount` | % off whole sale — numpad shortcut: type number then press button |
| **% ONE ITEM** | `pctone` | % off last item — numpad shortcut: type number then press button |
| **MOVE DRAWER** | `movedrawer` | Open cash drawer |
| **ERROR CORRECT** | `errcorrect` | Same as VOID — remove last item |
| **Recall Sale** | `recall` | Show list of parked sales, click to restore into current cart |
| **UBER EATS ADJ** | `ubereats` | Modal: enter order ref → adds 30% markup as line item |

### 3.11 Return / Refund Workflow

| Step | Detail |
|---|---|
| **1. Initiate** | Press RETURN when cart is empty |
| **2. Find receipt** | Return Lookup Modal: quick date buttons (Today/Yesterday/Last 7 Days), searches transactions |
| **3. Select items** | Shows transaction items with checkboxes, select which to return |
| **4. Process** | Selected items added to cart with negative quantities |
| **5. Complete** | Process as normal payment (negative total = refund) |

### 3.12 Deals / Promotions Engine

| Deal Type | Config | Behavior |
|---|---|---|
| `multi_buy` | `{qty, price}` | e.g., "3 for $5" — triggers when qty reached |
| `buy_x_get_y` | `{buy, free}` | e.g., "Buy 2 Get 1 Free" |
| `discount_pct` | `{pct}` | Percentage off matching products |
| `discount_amt` | `{amt}` | Fixed dollar discount |
| `combo` | `{qty, price}` | Same as multi_buy (aliased) |

- Deals auto-apply when matching products are in cart
- Deal badge shown on affected items (green)
- `deal_products` linking table with role='trigger' or 'reward'

### 3.13 Category / Section Navigation

| Mechanism | Detail |
|---|---|
| **Section buttons** | `type='section'` — opens product grid filtered by category |
| **Page link buttons** | `type='page_link'` — navigates to a different keyboard page |
| **Nav buttons** | `type='nav'` — filters by category + optional alpha range |
| **Section stack** | `pushSection()` / `popSection()` / `goHome()` for navigation history |
| **Product grouping** | Products grouped by first word; if multiple share same prefix → group button → drill in |

### 3.14 Keyboard Shortcuts

| Key | Action |
|---|---|
| **F1** | Focus barcode input |
| **F2** | Open cash payment modal |
| **F3** | Card/EFTPOS payment |
| **F4** | Clear cart |
| **F11** | Toggle fullscreen/kiosk |
| **Escape** | Close active modal, or pop section, or exit kiosk |
| **Backspace** (not in search) | Go back to previous section |

### 3.15 Customer Display Sync

| Aspect | Detail |
|---|---|
| **Trigger** | Every cart change sends `customer:update` IPC to customer window |
| **Data sent** | items array, total, tax, count, storeName |
| **Sale complete** | Sends `customer:saleComplete` with change amount |

---

## 4. Admin Panel — Features

### 4.1 Dashboard

| Aspect | Detail |
|---|---|
| **Data** | `dailySummary(today)` + `topProducts(today)` |
| **Stat cards (4)** | Total Sales, Transactions, Tax Collected, Discounts |
| **Top products table** | Name, qty sold, revenue — top 20 products by quantity |
| **Refresh** | Loads on tab activation |

### 4.2 Transactions

| Aspect | Detail |
|---|---|
| **Search** | `searchTransactions(opts)` with date range, status filter |
| **Table columns** | ID (truncated), Date/Time, Staff, Items, Total, Status (badge), Actions |
| **Actions** | View details, Void, Refund |
| **CSV Export** | Downloads transaction list as CSV |
| **Detail view** | Modal showing items + payments for a transaction |

### 4.3 Cash Drawer

| Aspect | Detail |
|---|---|
| **Actions** | Float (set opening balance), Pickup (remove cash), Drop (add cash) |
| **Log** | `getCashDrawerLog(date)` — shows all actions with timestamps |
| **Summary** | `getCashDrawerSummary(date)` — calculated balance |
| **Fields** | Amount, note, staff who performed action |

### 4.4 Z Report

| Aspect | Detail |
|---|---|
| **Data** | `zReport(date)` — comprehensive end-of-day report |
| **Includes** | Total sales, transaction count, sales by method, sales by category, sales by hour, void/refund counts |
| **Print** | Printable view opens in new window |

### 4.5 Products

| Aspect | Detail |
|---|---|
| **Search** | Debounced 300ms, calls `searchProducts(query)` |
| **Table** | Name, Barcode, Category, Price, Unit, Stock, Edit button |
| **Add** | "+ Add Product" button opens edit panel |
| **Edit panel** | 3-column grid: Name, Barcode, PLU, Category (dropdown), Sell Price, Cost Price, Unit (each/kg/100g/litre), Tax Rate, Track Stock, Stock Qty, Image URL |
| **Save** | `upsertProduct()` — auto-generates UUID for new |
| **Delete** | Soft-delete (sets active=0) |

### 4.6 Deals

| Aspect | Detail |
|---|---|
| **Table** | Name, Type, Details (human-readable config), Products, Status, Edit |
| **Add** | "+ New Deal" |
| **Type-specific config** | multi_buy/combo: Qty + Price, buy_x_get_y: Buy + Free, discount_pct: %, discount_amt: $ |
| **Product picker** | Search (2+ chars), click to add as badge, × to remove |
| **Date range** | Optional start/end dates |
| **Save** | `upsertDeal()` then `setDealProducts()` |

### 4.7 Staff

| Aspect | Detail |
|---|---|
| **Table** | Name, Role, Status badge (green Active / red Inactive) |
| **Add form** | Name, PIN (max 6 chars), Role dropdown (cashier/manager/admin) |
| **Edit** | Click row to edit, shows PIN via `getStaffWithPin(id)` |
| **Save** | `upsertStaff()` |

### 4.8 Keyboard Layout Editor

| Aspect | Detail |
|---|---|
| **Page tabs** | One tab per page, "+ Page" to create, "Delete Page" to remove |
| **Grid settings** | Columns: 6/8/10/12, Rows: 5/7/8/10 |
| **Grid rendering** | CSS Grid with 4px gap, cells 60px tall, colored buttons with type badge + label |
| **Empty cells** | Dashed border with "+" indicator |
| **Click empty** | If product selected in sidebar → auto-create button. Otherwise → blank edit form |
| **Click occupied** | Opens edit panel with all fields |
| **Drag-select** | Mousedown + mousemove across empty cells → highlights in blue → creates multi-span button |
| **Drag-and-drop** | HTML5 DnD to swap or move buttons |
| **Product sidebar** | 240px right panel: search + scrollable product list, click to select (blue highlight) |
| **Edit fields** | Label, Type (optgroups), Category/Value, Alpha Range, Price, BG Color (picker), Text Color (picker), Col Span, Row Span |
| **Image upload** | File input → resized to 128px max via canvas → stored as JPEG data URL (0.8 quality) |
| **Live preview** | 100×60px colored box updates in real-time |

### 4.9 Network (LAN Sync)

| Aspect | Detail |
|---|---|
| **Modes** | Server (master) / Client (slave) / Off |
| **Server** | Starts HTTP API + UDP broadcast |
| **Client** | Discovers server via UDP, syncs every 15 seconds |
| **Test** | Connection test button |
| **Status** | Shows mode, connected status, last sync time, error |

### 4.10 Hardware

| Aspect | Detail |
|---|---|
| **Probe** | Calls `probeDevices()` → PowerShell `Get-PnpDevice` scan |
| **Status cards (4)** | Receipt Printer, Cash Drawer, Barcode Scanner, Scale |
| **Color coding** | Green=connected, Amber=assumed/HID mode, Red=not found |
| **USB table** | Vendor ID (hex), Product ID (hex), Manufacturer, Product, Class |
| **Scanner test** | Input field to test barcode scanning |
| **Known vendors** | Epson (0x04b8), Seiko (0x0519), Star (0x0416), Honeywell (0x05e0), Zebex (0x1a86), CAS (0x0b67), Ohaus (0x0922), Mettler-Toledo (0x0eb8) |

### 4.11 Import

| Aspect | Detail |
|---|---|
| **JSON import** | Textarea for paste or URL fetch. Format: `{category: [{name, price, barcode, unit}], ...}` |
| **CSV import** | Drag-drop zone. Flexible header matching: name/description, price/sell price, category/department |
| **Result** | Shows "Imported X products across Y categories" |

### 4.12 Settings

| Aspect | Detail |
|---|---|
| **Store Details** | Store Name, ABN, Address, Phone, Register ID |
| **Receipt** | Header text (textarea), Footer text (textarea) |
| **Cloud Sync** | Supabase URL + Anon Key inputs, "Save & Connect" button |
| **Each field** | Saves individually via `setSetting(key, value)` |

---

## 5. Customer Display

| Aspect | Detail |
|---|---|
| **File** | `pos/customer.html` (153 lines) |
| **Window** | Second Electron BrowserWindow on external monitor |
| **Opening** | Via `window.pos.openCustomerDisplay()` or IPC `customer:open` |
| **Node integration** | Uses `require('electron').ipcRenderer` directly (nodeIntegration: true) |
| **Font** | Playfair Display (serif, headings) + Inter (sans-serif, body) |
| **Background** | `#1a1d27` (dark) |
| **States** | 3 states: |

### Customer Display States

| State | Trigger | Content |
|---|---|---|
| **Idle** | No active sale | Large "C" brand circle, "Welcome", "Your items will appear here" |
| **Active Sale** | Items in cart | Scrolling item list (qty, name, price), totals bar (Items, GST, Total) |
| **Sale Complete** | Transaction completed | Green checkmark animation, "Thank You!", change amount if applicable |

### Active Sale Display

- Items list: scrollable, auto-scrolls to bottom on new item
- Each item row: qty (if >1, shows "3x"), name (HTML-escaped), price (green, `$X.XX`)
- Totals bar: dark background (`#0f1117`), green top border, items count, GST, grand total (38px Playfair serif, green)
- Returns to idle after 5 seconds post-sale-complete

---

## 6. Keyboard / Grid Layout — All Pages

### Overview

| Property | Value |
|---|---|
| **Total pages** | 6 (seeded in schema.sql) |
| **Storage** | `keyboard_buttons` table in SQLite |
| **Rendering** | CSS Grid, dynamically built from DB on page load |
| **Customizable** | Via Admin → Keyboard tab |

---

### Page 1: Main Register (10 columns × 7 rows)

#### Rows 0-1: Function Buttons

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|---|---|
| 🔒 | SUPERVISOR ONLY | RETURN | VOID _(2-col)_ | — | Hold Sale | NO SALE | VIEW OR... | PRICE CHECK _(2×2)_ | — |
| REPRINT | % DISCOUNT | % ONE ITEM | MOVE DRAWER | ERROR CORRECT | Recall Sale | UBER EATS ADJ | _(empty)_ | _(PRICE CHECK cont.)_ | — |

**Styling:**
- Lock/Supervisor/Return/Hold/NoSale/ViewOR/Reprint/ErrCorrect/Recall/Ubereats: `bg:#dddddd, color:#000`
- VOID: `bg:#4466aa, color:#fff` (2-col span)
- % DISCOUNT / % ONE ITEM: `bg:#d8a820` (gold/yellow)
- MOVE DRAWER: `bg:#e07020, color:#fff` (orange)
- PRICE CHECK: `bg:#dddddd` (2-col × 2-row)

#### Rows 2-5: Cart + Departments + Numpad

| Col 0-2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8 | Col 9 |
|---|---|---|---|---|---|---|---|
| **CART** _(3-col × 4-row)_ | MEAT | COFFEE | FRUIT & VEG (open) | 7 | 8 | 9 | QTY X |
| _(cart cont.)_ | CHEESE | FLOWERS | FRUIT & VEG (section) | 4 | 5 | 6 | CLEAR |
| _(cart cont.)_ | _(empty)_ | BREAD & CROISSAN | FRUIT & VEG /KG | 1 | 2 | 3 | _(empty)_ |
| _(cart cont.)_ | BAG $0.15 | GAS | DELI | 0 | 00 | _(empty)_ | CODE ENTER |

**Department Colors:**
- MEAT: `#d87868` (salmon)
- COFFEE: `#78b8d0` (light blue)
- FRUIT & VEG (open): `#409850` (green)
- CHEESE: `#c8c4bc` (beige)
- FLOWERS: `#4880c0` (blue)
- FRUIT & VEG (section): `#409850` (green)
- BREAD & CROISSAN: `#98c030` (lime)
- FRUIT & VEG /KG: `#2d6a4f` (dark green)
- BAG: `#222222` (black)
- GAS: `#b0b0b0` (gray)
- DELI: `#c8a828` (gold)

**Numpad:** White buttons (`#ffffff`), black text. QTY X: orange (`#e07020`). CLEAR: light gray (`#eeeeee`). CODE ENTER: light gray.

**Cart Display:** `bg:#ffffff, color:#555`, type `cart_display`, 3-col × 4-row. Embeds the cart panel inline within the keyboard grid.

#### Row 6: Bottom Navigation

| Col 0-1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 | Col 8-9 |
|---|---|---|---|---|---|---|---|
| GROCERY _(2-col, page→6)_ | NUTS | _(empty)_ | FRUIT A-M _(page→2)_ | FRUIT N-Z _(page→3)_ | VEGE A-G _(page→4)_ | VEGE H-Z _(page→5)_ | SUB TOTAL _(2-col)_ |

**Colors:**
- GROCERY: `#6699cc` (steel blue)
- NUTS: `#c8b880` (tan)
- FRUIT A-M / FRUIT N-Z: `#c8a828` (gold)
- VEGE A-G / VEGE H-Z: `#409850` (green)
- SUB TOTAL: `#cc1818` (red), white text

---

### Page 2: Fruit A-M (10 columns × 4 rows)

All product buttons: `type='open_price'`, `bg:#ffffff`, `color:#000`

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7-9 |
|---|---|---|---|---|---|---|---|
| APPLES $5.99/kg 🖼️ | APRICOTS $12.99/kg 🖼️ | AVOCADOS $2.50 ea 🖼️ | BANANAS $3.99/kg 🖼️ | CHERRIES $14.99/kg 🖼️ | COCONUT $4.99 ea 🖼️ | _(empty)_ | **BACK** _(3-col, green)_ |
| CUSTARD APPLE $6.99/kg 🖼️ | DRAGON FRUIT $14.99/kg 🖼️ | FIGS $19.99/kg 🖼️ | GRAPES $7.99/kg 🖼️ | GRAPEFRUIT $4.99/kg | GUAVA $8.99/kg | _(empty)_ | **Vegetable Menu** _(3-col, light green, →pg4)_ |
| KIWI FRUITS $2.00 ea | LEMONS $8.99/kg | LIMES $1.50 ea | LONGAN $12.99/kg | LYCHEE $14.99/kg | MANDARINS $5.99 ea | _(empty)_ | **NEXT KEYBOARD FRUIT>** _(3-col × 2-row, →pg3)_ |
| MANGOES $3.50 ea 🖼️ | MELONS $3.99/kg | _(empty)_ | _(empty)_ | _(empty)_ | _(empty)_ | _(empty)_ | _(cont.)_ |

**Navigation buttons:** BACK `bg:#22c55e`, Vegetable Menu `bg:#86efac`, NEXT KEYBOARD FRUIT `bg:#86efac`

**Note:** 🖼️ = has Wikipedia image URL. First 6 products + Dragon Fruit + Grapes + Mangoes have images.

---

### Page 3: Fruit N-Z (10 columns × 3 rows)

All product buttons: `type='open_price'`, `bg:#ffffff`, `color:#000`

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7-9 |
|---|---|---|---|---|---|---|---|
| NECTARINES $7.99/kg | ORANGES $4.99/kg 🖼️ | PASSION FRUIT $1.50 ea | PAPAYA RED $5.99/kg | PAW PAW GREEN $4.99/kg | PEACHES $7.99/kg | _(empty)_ | **BACK** _(3-col, green)_ |
| PEARS $5.99/kg | PERSIMMONS $9.99/kg | SM PINEAPPLE $3.99 ea | MED PINEAPPLE $4.99 ea | XL PINEAPPLE $6.99 ea | PLUMS $9.99/kg | _(empty)_ | _(empty)_ |
| POMEGRANATE $3.99 ea | POMMELO $6.99/kg | QUINCE $7.99/kg | TANGELLO $4.99/kg | _(empty)_ | _(empty)_ | _(empty)_ | **<BACK KEYBOARD FRUIT** _(3-col, →pg2)_ |

**Total:** 16 fruit products + 2 nav buttons

---

### Page 4: Vegetables A-G (10 columns × 4 rows)

All product buttons: `type='open_price'`, `bg:#ffffff`, `color:#000`

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7-9 |
|---|---|---|---|---|---|---|---|
| ASIAN VEGE $3.99 ea | ASPARAGUS $4.99 ea | BEANS $9.99/kg | BEETROOT $4.99/kg | BOTTLE GOURD $5.99/kg | BROCCOLI $5.99/kg 🖼️ | _(empty)_ | **BACK** _(3-col, green)_ |
| BRUSSEL SPROUTS $12.99/kg | CABBAGE $3.99 ea | CAPSICUM $12.99/kg 🖼️ | CARROTS LOOSE $2.49/kg 🖼️ | CARROT BAG $2.99 ea | CAULIFLOWER $4.99 ea | _(empty)_ | **FRUIT MENU** _(3-col, →pg2)_ |
| WHOLE CELERY $3.99 ea | CELERIAC $5.99 ea | CHILLIES $29.99/kg | CHOKOS $4.99/kg | CORN $1.99 ea | CUCUMBERS $2.99 ea | _(empty)_ | **NEXT KEYBOARD VEGE>** _(3-col × 2-row, →pg5)_ |
| EGGPLANT $5.99/kg | LEB EGGPLANT $7.99/kg | FENNEL $4.99 ea | GARLIC $19.99/kg | GINGER $24.99/kg | _(empty)_ | _(empty)_ | _(cont.)_ |

**Total:** 23 veg products + 3 nav buttons

---

### Page 5: Vegetables H-Z (10 columns × 4 rows)

All product buttons: `type='open_price'`, `bg:#ffffff`, `color:#000`

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7-9 |
|---|---|---|---|---|---|---|---|
| HERBS $2.99 ea | KALE $3.99 ea | LEEKS $3.99 ea | LETTUCES $2.99 ea 🖼️ | LETTUCE BAGS $3.99 ea | LOBOK $4.99/kg | _(empty)_ | **BACK** _(3-col, green)_ |
| MUSHROOMS $12.99/kg 🖼️ | OLIVES $14.99/kg | ONIONS $2.99/kg 🖼️ | PARSNIP $7.99/kg | PEAS $9.99/kg | POTATOES $3.99/kg 🖼️ | _(empty)_ | **FRUIT MENU** _(3-col, →pg2)_ |
| PUMPKINS $2.99/kg | RADISH BUNCH $2.99 ea | RHUBARB $4.99 ea | SHALLOTS $2.99 ea | SILVERBEET $3.99 ea | SNOW PEAS $14.99/kg | _(empty)_ | **<BACK KEYBOARD VEG** _(3-col, →pg4)_ |
| SUGAR SNAP PEAS $14.99/kg | SWEDES $4.99/kg | SWEET POTATOES $4.99/kg | TOMATOES $5.99/kg 🖼️ | TURNIP $3.99/kg | ZUCCHINI $5.99/kg | _(empty)_ | _(empty)_ |

**Total:** 24 veg products + 3 nav buttons

---

### Page 6: Grocery (10 columns × 3 rows)

| Col 0-1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7-9 |
|---|---|---|---|---|---|---|
| GROCERY _(2-col, section, `#6699cc`)_ | CONFECTIONARY $0.00 | CHIPS $3.99 | SIMPLY PIES $5.99 | WATER 12PK $6.99 | _(empty)_ | **BACK** _(3-col, green)_ |
| SALMON PIECES $7.99 | SALMON FILLET $12.99 | FRESH JUICE 500ML $4.99 | JUICE 1L $6.99 | LEMON JUICE 500ML $3.99 | _(empty)_ | _(empty)_ |
| ASSORTED SPICES $5.99 | MIXED PICKLES $6.99 | ALTERNATIVE MILK $4.99 | _(empty)_ | _(empty)_ | _(empty)_ | _(empty)_ |

**Note:** GROCERY button is `type='section'` (opens full grocery category view). All others are `type='open_price'`.

**Total:** 1 section button + 12 grocery products + 1 nav button

---

### Keyboard Button Summary

| Page | Name | Products | Nav | Function | Other | Total Buttons |
|---|---|---|---|---|---|---|
| 1 | Main Register | 1 (BAG) | 7 (page links) | 15 | 15 (numpad) + 1 (cart) + 1 (subtotal) | 40 |
| 2 | Fruit A-M | 20 | 3 | 0 | 0 | 23 |
| 3 | Fruit N-Z | 16 | 2 | 0 | 0 | 18 |
| 4 | Veg A-G | 23 | 3 | 0 | 0 | 26 |
| 5 | Veg H-Z | 24 | 3 | 0 | 0 | 27 |
| 6 | Grocery | 12 | 1 | 0 | 1 (section) | 14 |
| **Total** | | **96** | **19** | **15** | **18** | **148** |

---

## 7. Design & Visual Style

### 7.1 POS Register Screen

| Property | Value |
|---|---|
| **Background** | `#f0f1f3` (light gray) |
| **Status bar** | `#1e2028` (dark navy), 48px tall |
| **Font** | Inter (sans-serif), system-ui fallback |
| **Headings font** | Playfair Display (serif) — used on login screen only |
| **Base font size** | 13px |
| **Border radius** | 8-10px (buttons, inputs), 16px (modals) |
| **Touch targets** | Minimum 34-48px height throughout |
| **Primary blue** | `#5b8def` (used for focus states, subtotal label, active tabs) |
| **Green (success)** | `#059669` (pay button, prices, confirm actions) |
| **Red (danger)** | `#ef4444` (void, delete, errors, return mode) |
| **Orange** | `#f97316` (QTY badge, qty multiplier) |
| **Text primary** | `#1a1a2e` |
| **Text secondary** | `#8891a5` |
| **Text tertiary** | `#6b7080` |
| **Scrollbar** | 5px thin, `#c0c4cc` thumb, transparent track |
| **Animations** | `modalIn` (scale + fade, 0.25s), `popIn` (scale bounce, 0.3s) |
| **Touch behavior** | `touch-action: manipulation`, `-webkit-tap-highlight-color: rgba(0,0,0,.06)` |
| **User select** | Disabled (`user-select: none`) |

### 7.2 Cart Panel

| Property | Value |
|---|---|
| **Width** | 320px fixed |
| **Background** | `#fff` (white) |
| **Border** | 1px solid `#e2e4e8` right border |
| **Header** | `#fafbfc` background, 10px padding |
| **Item height** | Min 52px |
| **Item name** | 13px, font-weight 600, ellipsis overflow |
| **Item price** | 14px, font-weight 700 |
| **Qty buttons** | 34×34px, rounded 8px, 1px solid border |
| **Total font** | 22px, font-weight 800, Inter |
| **Pay button** | Green (`#059669`), 48px min-height, 14px bold, box-shadow |
| **Card button** | Gray (`#f0f1f3`), 1px border |

### 7.3 Keyboard Panel

| Property | Value |
|---|---|
| **Background** | `#e8eaef` |
| **Grid gap** | 4px |
| **Button style** | 8px border-radius, 600 weight, 11px font, box-shadow |
| **Button press** | `transform: scale(0.96)` on `:active` |
| **Digit buttons** | 26px font, 700 weight, white bg |
| **Num display** | `#1e2028` bg, `#34d399` green text, Courier New monospace, 20px |

### 7.4 Admin Panel

| Property | Value |
|---|---|
| **Background** | `#080b12` (near-black) |
| **Sidebar bg** | `#0c1018` |
| **Surface** | `#111620` (cards, panels) |
| **Surface 2** | `#1a2030` (elevated) |
| **Surface 3** | `#232c3c` (highest) |
| **Border** | `#1e2738` |
| **Text** | `#e2e8f0` |
| **Text dim** | `#6b7a94` |
| **Green accent** | `#10b981` (active tabs, success) |
| **Red** | `#ef4444` |
| **Blue** | `#3b82f6` |
| **Sidebar width** | 250px, fixed position |
| **Active tab** | Green text + green-glow background + green left border |
| **Font** | -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui |
| **Border radius** | 10px (--radius), 14px (--radius-lg) |

### 7.5 Customer Display

| Property | Value |
|---|---|
| **Background** | `#1a1d27` (dark) |
| **Font** | Playfair Display (headings) + Inter (body) |
| **Brand circle** | 48px header / 100px idle, green `#1B4332`, "C" letter |
| **Item price color** | `#10b981` (green) |
| **Total font** | 38px Playfair Display, green |
| **Totals bar** | `#0f1117` bg, 2px green top border |
| **Check animation** | `#10b981` green circle, 80px, popIn animation |

### 7.6 Responsive Behavior

| Aspect | Detail |
|---|---|
| **Register** | Fixed layout designed for touch-screen register (no responsive breakpoints) |
| **Admin** | Fixed sidebar, scrollable content area, no mobile breakpoints |
| **Customer** | Fills available space, scrollable items list |
| **Target hardware** | 15.6" touch-screen POS monitor, 1920×1080 or similar |

---

## 8. Backend & Data Layer

### 8.1 Database

| Property | Value |
|---|---|
| **Engine** | SQLite via sql.js WASM |
| **Location** | `~/Library/Application Support/crisp-pos/crisp-pos.sqlite` (macOS) or equivalent `userData` path |
| **Tables** | 12: categories, products, specials, deals, deal_products, staff, transactions, transaction_items, payments, cash_drawer, sync_queue, settings, keyboard_buttons |
| **Schema file** | `db/schema.sql` (431 lines) |
| **Init** | Load file if exists, else create empty → run schema (idempotent with IF NOT EXISTS / OR IGNORE) → run migrations → save |
| **Write** | Debounced 1-second save (export WASM DB to bytes → write file) |

### 8.2 Seed Data

| Data | Count |
|---|---|
| **Categories** | 12 (Fruit, Vegetables, Meat, Dairy, Bread, Deli, Flowers, Cheese, Coffee, Nuts, Grocery, Gas) |
| **Products** | ~35 (8 fruit, 8 veg, 3 meat, 3 dairy, 3 bread, 3 coffee, 2 cheese, 2 flowers, 2 nuts, 1 grocery) |
| **Keyboard buttons** | 148 across 6 pages |
| **Settings** | 11 defaults (store_name, address, phone, ABN, receipt_header, receipt_footer, register_id, tax_name, tax_rate, layout_v3_shifted, nav_buttons_fixed) |

### 8.3 Tax Handling

| Aspect | Detail |
|---|---|
| **Model** | Tax-inclusive pricing (Australian standard) |
| **Default rate** | 10% GST (`tax_rate = 0.10`) |
| **Fresh produce** | 0% GST (`tax_rate = 0.00`) — all fruit, veg, meat, dairy, bread, coffee, cheese, flowers |
| **Processed items** | 10% GST — nuts, grocery (bag) |
| **Extraction formula** | `tax = line_total × tax_rate / (1 + tax_rate)` |

### 8.4 IPC Channels

~50 channels organized by domain:

| Domain | Channels | Key Operations |
|---|---|---|
| Products | 7 | search, getByBarcode, getById, getByCategory, upsert, delete, getCategories |
| Specials | 3 | getAll, upsert, delete |
| Deals | 5 | getAll, getActive, upsert, delete, getProducts, setProducts |
| Transactions | 7 | save, void, refund, getParked, getItems, getPayments, delete, search |
| Staff | 4 | login, getAll, getWithPin, upsert |
| Settings | 3 | get, getAll, set |
| Sync | 2 | getPending, markSynced |
| Reports | 7 | dailySummary, topProducts, salesByHour, salesByMethod, salesByCategory, voidRefundCount, zReport |
| Keyboard | 6 | getAll, getByPage, getPages, getAllIncludingInactive, upsert, delete, deletePage |
| Import | 1 | importProducts |
| Hardware | 3 | printReceipt, openDrawer, probeDevices |
| Cash Drawer | 3 | log, getLog, summary |
| Stock | 2 | lowStock, adjustStock |
| Window | 2 | exitFullscreen, quit |
| LAN Sync | 3 | getStatus, testConnection, restart |
| Customer Display | 3 | update, saleComplete, open |

---

## 9. Hardware Integration

### 9.1 Receipt Printer

| Aspect | Detail |
|---|---|
| **Protocol** | ESC/POS |
| **Connection** | Via PowerShell `rawprint.ps1` using `winspool.drv` P/Invoke |
| **Commands** | INIT, ALIGN (left/center/right), BOLD on/off, DOUBLE_SIZE, UNDERLINE, CUT, DRAWER_KICK |
| **Receipt format** | Header (store name, address, centered) → Items (name, qty, price) → Totals → Payment method → Footer → Cut |
| **Failure handling** | Graceful — shows error toast, does not block transaction |
| **Reprint** | Stores last receipt data, REPRINT button re-sends |

### 9.2 Cash Drawer

| Aspect | Detail |
|---|---|
| **Connection** | Via receipt printer DK port (standard ESC/POS drawer kick command) |
| **Trigger** | Cash payment completion, NO SALE button, MOVE DRAWER button |
| **Command** | ESC p 0 (standard drawer kick pulse) |

### 9.3 Barcode Scanner

| Aspect | Detail |
|---|---|
| **Mode** | HID keyboard emulation (scanner types into focused input) |
| **Detection** | Hardware probe via USB vendor IDs (Honeywell, Zebex, etc.) |
| **Input** | `#searchInput` receives scanned data, Enter key triggers lookup |

### 9.4 Scale

| Aspect | Detail |
|---|---|
| **Status** | Detection only — no live weight reading integration |
| **Detection** | USB vendor IDs (CAS, Ohaus, Mettler-Toledo) |
| **Weight entry** | Manual via weight modal numpad |

---

## 10. Networking & Sync

### 10.1 Supabase Cloud Sync

| Aspect | Detail |
|---|---|
| **File** | `pos/js/sync.js` (132 lines) |
| **Init** | Dynamically imports Supabase JS SDK from CDN |
| **Push** | Reads `sync_queue` where synced=0, upserts/deletes to Supabase, marks synced=1 |
| **Pull** | Fetches products, categories from Supabase, upserts locally |
| **Realtime** | Subscribes to changes on products, categories, specials, deals |
| **Auto-sync** | Polls every 30 seconds |
| **Offline** | Queue continues to accumulate; pushes when back online |

### 10.2 LAN Multi-Register Sync

| Aspect | Detail |
|---|---|
| **File** | `lan-sync.js` (635 lines) |
| **Server endpoints** | `/api/heartbeat`, `/api/products`, `/api/categories`, `/api/specials`, `/api/deals`, `/api/staff`, `/api/keyboard`, `/api/settings`, `/api/full-sync`, `POST /api/transactions`, `POST /api/cash_drawer` |
| **Discovery** | UDP broadcast on port 5556 |
| **Auth** | `X-POS-Secret` header with shared secret key |
| **Client sync interval** | 15 seconds |
| **Client flow** | Full-sync on first connect, then incremental pulls |
| **Transaction push** | Clients POST completed transactions to server |
| **No dependencies** | Uses Node.js built-in `http` and `dgram` modules |

### 10.3 Cloud Postgres Schema

| Aspect | Detail |
|---|---|
| **File** | `supabase/schema.sql` (198 lines) |
| **Differences from SQLite** | UUID types, TIMESTAMPTZ, JSONB for deal config |
| **Security** | Row-level security (RLS) policies |
| **Reporting views** | `daily_sales`, `product_sales` |
| **Realtime** | Enabled on products, categories, specials, deals |

---

## 11. Business Intent Analysis

### 11.1 Core Purpose

This POS system is built to replace **Profit Track**, the legacy register system at Crisp on Creek (a fruit & vegetable shop). The keyboard layout, button positioning, color coding, and department structure are designed to mirror the existing Profit Track register as closely as possible, minimizing staff retraining.

### 11.2 Design Decisions

| Decision | Rationale |
|---|---|
| **Open-price for produce** | Fruit & veg are priced by weight/each — cashier enters amount manually rather than scanning pre-priced labels |
| **6 keyboard pages** | Mirrors PT's physical keyboard overlay: main register + alphabetical product pages for fruit (A-M, N-Z) and veg (A-G, H-Z) + grocery |
| **In-grid cart** | Cart is embedded in the keyboard grid (cols 0-2, rows 2-5 on Page 1) to maximize screen real estate and match PT's layout |
| **Tax-inclusive pricing** | Australian retail standard — all displayed prices include GST |
| **0% GST on fresh produce** | Correct for Australian tax law — fresh fruit, veg, meat, dairy, bread are GST-free |
| **Uber Eats adjustment** | Store fulfills Uber Eats orders; 30% markup covers platform fees |
| **Split payments** | Common in retail — partial card + cash payments |
| **Offline-first** | Register must work without internet; sync is supplementary |
| **LAN sync** | Multi-register deployment within same store — one master, multiple clients |
| **ESC/POS printing** | Industry standard for receipt printers (Epson, Star, etc.) |

### 11.3 Target Users

| Role | Use |
|---|---|
| **Cashier** | POS register screen — scan/tap products, process payments |
| **Manager** | Supervisor mode for overrides, admin panel for reports + products |
| **Owner (Matthias)** | Full admin access, settings, keyboard layout customization, import |

### 11.4 White-Label SaaS Vision

Per project memory, Crisp on Creek is the test deployment. The long-term vision is a **white-label SaaS POS product** with planned features including self-checkout, Instagram integration, advanced cash management, and phone app.

---

## 12. Missing / Next Build Priorities

### 12.1 Known Gaps

| Area | Gap | Severity |
|---|---|---|
| **VIEW OR... button** | Not implemented — placeholder | Low |
| **Scale integration** | Detection only, no live weight reading from scale | Medium |
| **Payment terminal** | No integration with EFTPOS/payment terminals (e.g., Tyro) | High |
| **Staff permissions** | Role stored but not enforced beyond supervisor PIN check | Medium |
| **Audit trail** | No logging of who voided/refunded/modified what | Medium |
| **Customer accounts** | `customer_name` field exists but no customer database/loyalty | Low |
| **Barcode printing** | No label/barcode printing capability | Low |
| **Multi-currency** | Hardcoded to AUD | Low |
| **End-of-day wizard** | Z Report exists but no guided close-out workflow | Low |
| **Backup** | No automated DB backup beyond LAN sync | Medium |
| **Row 4, Col 3 (Page 1)** | Empty cell in department area — no button assigned | Low |
| **Customer display opening** | Exposed in preload but no UI button to open customer display from POS | Low |

### 12.2 Potential Improvements

| Area | Suggestion |
|---|---|
| **Security** | Hash staff PINs (currently stored as plain text) |
| **Customer display** | Uses `nodeIntegration: true` — should migrate to contextBridge for security |
| **Product images** | External Wikipedia URLs — should be cached locally for offline use |
| **Error handling** | Receipt print failures are silent toast — should log for debugging |
| **Stock management** | Low stock alerts exist in API but no UI notification on register screen |
| **Reporting** | Sales by hour, category, method exist in API but only Z Report tab exposes all |
| **Mobile admin** | Admin panel has no responsive design for tablet/phone access |

### 12.3 Planned Features (from project roadmap)

- Self-checkout mode
- Instagram integration
- Advanced cash management
- Phone app companion
- White-label multi-tenant SaaS

---

## Appendix A: Button Type Reference

| Type | Category | Description |
|---|---|---|
| `open_price` | Product | Cashier enters price (cents input → dollars) |
| `fixed_price` | Product | Set amount, adds immediately |
| `section` | Product | Opens category product grid |
| `nav` | Product | Filtered navigation with optional alpha_range |
| `void` | Function | Remove last cart item |
| `return` | Function | Toggle return mode or lookup receipt |
| `hold` | Function | Park current sale |
| `nosale` | Function | Open cash drawer |
| `supervisor` | Function | Prompt for manager/admin PIN |
| `lock` | Function | Lock register, show login |
| `reprint` | Function | Reprint last receipt |
| `pricecheck` | Function | Lookup product price |
| `errcorrect` | Function | Same as void |
| `recall` | Function | Restore parked sale |
| `pctdiscount` | Function | % off whole sale |
| `pctone` | Function | % off one item |
| `movedrawer` | Function | Open cash drawer |
| `ubereats` | Function | 30% Uber Eats markup |
| `viewor` | Function | Not implemented |
| `digit` | Numpad | 0-9, 00 |
| `clear` | Numpad | Clear numpad buffer |
| `qtyx` | Numpad | Quantity multiplier |
| `codeenter` | Numpad | PLU/barcode lookup |
| `subtotal` | Payment | Opens cash payment |
| `pay_cash` | Payment | Cash payment |
| `pay_card` | Payment | Card payment |
| `park` | Payment | Park sale |
| `page_link` | Navigation | Go to keyboard page (parent_id = page #) |
| `back_home` | Navigation | Return to Page 1 |
| `cart_display` | Layout | Embedded cart in grid |
| `num_display` | Layout | Numpad LED display (deactivated) |

---

## Appendix B: Database Table Summary

| Table | Rows (seeded) | Purpose |
|---|---|---|
| categories | 12 | Product categories |
| products | ~35 | Product catalog |
| specials | 0 | Price overrides |
| deals | 0 | Promotions |
| deal_products | 0 | Deal-product links |
| staff | 0 (auto-seeded on first run) | Staff accounts |
| transactions | 0 | Sales records |
| transaction_items | 0 | Line items |
| payments | 0 | Payment records |
| cash_drawer | 0 | Drawer actions log |
| sync_queue | 0 | Offline sync queue |
| settings | 11 | Key-value config |
| keyboard_buttons | 148 | POS grid layout |

---

*End of audit.*
