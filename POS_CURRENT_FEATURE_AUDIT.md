# Crisp POS -- Current Feature Audit

**Generated:** 2026-05-05
**App Version:** 1.0.0
**Database State:** Live (queried from running instance)

---

## 1. App Overview

| Field | Value |
|---|---|
| Name | Crisp POS |
| Version | 1.0.0 |
| Platform | Electron v33.2.0 (Chromium + Node.js) |
| Target OS | Windows (primary), macOS (secondary) |
| Database | sql.js v1.11+ (SQLite via WebAssembly) |
| UI | Vanilla JS + HTML, no framework, no build step, ES modules |
| IPC | preload.js contextBridge -- ~50 methods exposed as `window.pos.*` |
| ID Generation | uuid v11 (UUIDs for all record primary keys) |
| Cloud Sync | Supabase (optional, not currently configured) |
| Deployment | Crisp on Creek, 1832 Logan Rd, Mt Gravatt QLD 4122 |
| Status | Pre-production (0 transactions recorded) |

---

## 2. File Inventory

| File | Lines | Purpose |
|---|---|---|
| `main.js` | ~1250 | Electron main process: DB init, all IPC handlers, migrations, hardware probing, receipt printing, customer display, LAN sync, backups |
| `preload.js` | ~115 | contextBridge API exposing `window.pos.*` methods |
| `db/schema.sql` | ~443 | Full SQLite schema + seed data (categories, products, keyboard layout, settings) |
| `pos/index.html` | ~2090 | POS register screen (cashier-facing, full transaction flow) |
| `pos/admin.html` | ~3100 | Admin panel (13 tabs) |
| `pos/js/cart.js` | 102 | Cart class (items, totals, tax calc, toTransaction) |
| `pos/js/ui.js` | 50 | Shared UI helpers (esc, $, $$, money, showToast, debounce, formatTime, formatDate) |
| `pos/js/sync.js` | 132 | Supabase cloud sync engine (push/pull, realtime subscriptions) |
| `pos/customer.html` | 153 | Customer-facing display (second monitor) |
| `lan-sync.js` | 635 | LAN multi-register sync |
| `rawprint.ps1` | 75 | PowerShell ESC/POS raw printer bridge |

---

## 3. Architecture

### Data Flow

```
Renderer (index.html / admin.html)
  |
  | window.pos.someMethod(args)
  |
  v
preload.js (contextBridge / ipcRenderer)
  |
  | ipcMain.handle('channel', handler)
  |
  v
main.js (IPC handlers)
  |
  | dbRun(sql, params) / dbAll(sql, params)
  |
  v
sql.js (WASM SQLite in-memory)
  |
  | scheduleSave() -- 1s debounced write to disk
  |
  v
~/Library/Application Support/crisp-pos/crisp-pos.sqlite
```

### DB Initialization Flow

1. Check if DB file exists on disk; if yes, load bytes into sql.js WASM database; if not, create empty in-memory DB
2. Read `db/schema.sql`, split by `;`, execute each statement (try-catch for idempotency with `CREATE IF NOT EXISTS` / `INSERT OR IGNORE`)
3. Run migration array (ALTER TABLE statements) for existing DBs that lack new columns
4. Call `saveDB()` to persist to disk
5. Auto-backup on startup

### Write Path

1. Renderer calls `window.pos.someMethod(args)`
2. Main process IPC handler calls `dbRun(sql, params)`
3. `dbRun` calls `scheduleSave()` -- a 1-second debounced timer that exports the sql.js database to bytes and writes the file
4. If the write is a product/deal/staff/etc upsert, `queueSync()` also appends a record to `sync_queue` for cloud push

---

## 4. Database

### Tables and Live Row Counts

| Table | Rows | Purpose |
|---|---|---|
| `categories` | 12 | Product categories (Fruit, Vegetables, Meat, etc.) |
| `products` | 35 | Product catalog with pricing, barcodes, stock |
| `specials` | 0 | Price overrides per product (date-ranged) -- none configured |
| `deals` | 0 | Promotions (multi_buy, buy_x_get_y, etc.) -- none configured |
| `deal_products` | 0 | Linking table for deals to products -- none configured |
| `staff` | 2 | Staff accounts with PINs and roles |
| `transactions` | 0 | Completed/voided/refunded/parked sales -- none recorded |
| `transaction_items` | 0 | Line items for transactions -- none recorded |
| `payments` | 0 | Payment records (cash, card, eftpos) -- none recorded |
| `cash_drawer` | 0 | Cash drawer actions (open, close, float, pickup, drop) |
| `sync_queue` | 2 | Offline-first sync queue (2 pending, unsynced) |
| `settings` | 11 | Key-value store for app configuration |
| `keyboard_buttons` | 157 | POS keyboard grid layout across 6 pages |
| `audit_log` | 1 | Audit trail for sensitive actions |

### Table Schemas

#### categories

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| sort_order | INTEGER | Default 0 |
| colour | TEXT | Hex color, default `#10b981` |
| active | INTEGER | 0/1 boolean |
| updated_at | TEXT | ISO datetime |

**Live data (12 rows):** Fruit, Vegetables, Meat, Dairy, Bread & Croissants, Deli, Flowers, Cheese, Coffee, Nuts, Grocery, Gas

#### products

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| barcode | TEXT | EAN/UPC |
| plu | TEXT | Product lookup number |
| name | TEXT NOT NULL | |
| category_id | TEXT FK | References categories(id) |
| price | REAL | Sell price (tax-inclusive) |
| cost_price | REAL | |
| unit | TEXT | `each` / `kg` / `100g` / `litre` |
| tax_rate | REAL | Default 0.10 (GST 10%) |
| track_stock | INTEGER | 0/1 boolean |
| stock_qty | REAL | Decremented on sale if track_stock=1 |
| active | INTEGER | Soft-delete flag |
| image_url | TEXT | |
| updated_at | TEXT | |

Indexes: `barcode`, `plu`, `category_id`, `name`

**Live data (35 rows):** Bananas, Royal Gala Apples, Granny Smith Apples, Navel Oranges, Strawberries Punnet, Avocado Hass, Mangoes, Watermelon, Tomatoes, Potatoes Washed, Brown Onions, Carrots, Broccoli, Iceberg Lettuce, Red Capsicum, Cup Mushrooms, Chicken Breast, Beef Mince 500g, Beef Sausages 500g, Full Cream Milk 2L, Free Range Eggs 12pk, Butter 250g, Sourdough Loaf, Croissant, Baguette, Regular Coffee, Large Coffee, Flat White, Cheddar Cheese, Brie Wheel, Rose Bunch, Mixed Flower Bunch, Mixed Nuts 250g, Cashews 200g, Reusable Bag

#### specials

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| product_id | TEXT FK | References products(id) |
| special_price | REAL | Override price |
| start_date | TEXT | ISO date, nullable |
| end_date | TEXT | ISO date, nullable |
| active | INTEGER | 0/1 |

**Live data:** 0 rows

#### deals

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | e.g. "Apples 2 for $4" |
| type | TEXT | `multi_buy` / `buy_x_get_y` / `discount_pct` / `discount_amt` / `combo` |
| config | TEXT | JSON string |
| start_date | TEXT | Nullable |
| end_date | TEXT | Nullable |
| active | INTEGER | 0/1 |

**Live data:** 0 rows

#### deal_products

| Column | Type | Notes |
|---|---|---|
| deal_id | TEXT FK | References deals(id) |
| product_id | TEXT FK | References products(id) |
| role | TEXT | `trigger` or `reward` |
| PK | composite | (deal_id, product_id) |

**Live data:** 0 rows

#### staff

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT | |
| pin | TEXT | Plain text, 4-6 digits |
| role | TEXT | `cashier` / `manager` / `admin` |
| active | INTEGER | 0/1 |

**Live data (2 rows):**
- Owner (admin) PIN: 1234
- Cashier (cashier) PIN: 0000

#### transactions

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| register_id | TEXT | e.g. "LANE01" |
| staff_id | TEXT FK | |
| customer_name | TEXT | |
| subtotal | REAL | Sum of line totals |
| tax | REAL | Extracted GST (inclusive) |
| discount | REAL | |
| total | REAL | = subtotal (tax is inclusive) |
| status | TEXT | `completed` / `voided` / `refunded` / `parked` |
| created_at | TEXT | ISO datetime |

**Live data:** 0 rows

#### transaction_items

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| transaction_id | TEXT FK | |
| product_id | TEXT FK | |
| name | TEXT | Product name snapshot at time of sale |
| qty | REAL | |
| unit_price | REAL | |
| discount | REAL | |
| line_total | REAL | qty * unit_price - discount |
| tax | REAL | Inclusive GST extracted |
| deal_id | TEXT FK | Nullable |

**Live data:** 0 rows

#### payments

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| transaction_id | TEXT FK | |
| method | TEXT | `cash` / `card` / `eftpos` / `account` |
| amount | REAL | |
| reference | TEXT | Card last 4, Tyro ref, etc. |

**Live data:** 0 rows

#### cash_drawer

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| register_id | TEXT | |
| staff_id | TEXT FK | |
| action | TEXT | `open` / `close` / `float` / `pickup` / `drop` |
| amount | REAL | For float/pickup/drop |
| note | TEXT | |

**Live data:** 0 rows

#### sync_queue

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | AUTOINCREMENT |
| table_name | TEXT | Which table |
| record_id | TEXT | Row ID |
| action | TEXT | `insert` / `update` / `delete` |
| payload | TEXT | Full row as JSON |
| synced | INTEGER | 0 = pending, 1 = pushed |

Index: `idx_sync_pending` on (synced) WHERE synced = 0

**Live data:** 2 rows (both pending/unsynced)

#### settings

| Column | Type |
|---|---|
| key | TEXT PK |
| value | TEXT |

**Live data (11 rows):**

| Key | Value |
|---|---|
| store_name | Crisp on Creek |
| store_address | 1832 Logan Rd, Mt Gravatt QLD 4122 |
| store_phone | (not set) |
| store_abn | (not set) |
| register_id | LANE01 |
| tax_name | GST |
| tax_rate | 0.10 |
| receipt_header | (not set) |
| receipt_footer | (not set) |
| layout_v3_shifted | 1 |
| nav_buttons_fixed | 1 |

Not configured: keyboard_page_names, keyboard_grid_cols, keyboard_grid_rows, Supabase URL, Supabase anon key

#### keyboard_buttons

| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| label | TEXT | Button display text |
| type | TEXT | See Button Types section |
| price | REAL | For fixed_price buttons |
| image | TEXT | Data URL or path |
| color | TEXT | Text color, default `#fff` |
| bg_color | TEXT | Background, default `#1B4332` |
| parent_id | TEXT | For child buttons |
| category_filter | TEXT | e.g. "Fruit", "Coffee", `__all__` |
| alpha_range | TEXT | e.g. "A-M", "N-Z" |
| sort_order | INTEGER | |
| position | TEXT | `main` / `bottom` / `grid` |
| page | INTEGER | 1-based page number |
| grid_row | INTEGER | 0-based row position |
| grid_col | INTEGER | 0-based column position |
| col_span | INTEGER | Cells wide (1-10) |
| row_span | INTEGER | Cells tall (1-5) |
| active | INTEGER | 0/1 |

**Live data:** 157 rows across 6 pages (49+23+18+26+27+14)

#### audit_log

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | AUTOINCREMENT |
| timestamp | TEXT | ISO datetime |
| staff_id | TEXT FK | |
| action | TEXT | Action type |
| details | TEXT | JSON details |

**Live data:** 1 row

---

## 5. Screens, Pages, and Modals

### 5.1 PIN Login Overlay

| Field | Value |
|---|---|
| File | `pos/index.html` |
| Purpose | Authenticate staff before allowing register access |
| Visible | On app start, after lock, always first |

**User Flow:**
1. App starts with login overlay covering entire screen
2. User taps digits on 3x4 numpad (1-9, C, 0, OK), dots appear in PIN display
3. "C" clears PIN buffer, "OK" submits
4. Calls `window.pos.staffLogin(pin)` -- returns `{id, name, role}` or null
5. On success: hide overlay, set `currentStaff`, show welcome toast, focus barcode input
6. On failure: show "Invalid PIN" in red, clear buffer

**IPC Calls:** `db:staff:login`

**Status:** WORKING

---

### 5.2 POS Register Screen

| Field | Value |
|---|---|
| File | `pos/index.html` |
| Purpose | Main cashier-facing transaction screen |
| Layout | Status bar (42px) + main row (cart panel 320px + keyboard panel flex) + footer (22px) |

#### 5.2.1 Status Bar

| Element | Purpose |
|---|---|
| Store name | Displays "Crisp on Creek" |
| Barcode input (#searchInput) | Autofocused text input for scanning/searching |
| Staff badge | Shows logged-in staff name |
| Admin link | Opens admin.html |
| Exit FS button | Exits fullscreen/kiosk mode |
| Sync dot | Shows cloud sync status |
| Health dots | Server, drawer, scanner, scale status indicators |
| Clock | Live time display |
| numBuf display | Shows current numpad buffer |
| Subtotal display | Large running total |

**Status:** WORKING

#### 5.2.2 Cart Panel (Left Sidebar, 320px)

| Element | Purpose |
|---|---|
| Cart header | "Current Sale" title |
| Cart items list | Scrollable list of items with name, qty x unit_price, line_total |
| +/- buttons | Per-item quantity adjustment |
| Delete button | Per-item removal |
| Special badge | Shows if item has active special pricing |
| Cart totals | Subtotal, Tax (GST), Total |
| Pay Cash button (green) | Opens cash payment modal |
| Card/EFTPOS button (gray) | Processes card payment |
| Park button | Parks/holds current sale |

**IPC Calls:** None directly (cart is client-side state)

**Status:** WORKING

#### 5.2.3 Keyboard Panel (Right Side, flex:1)

The keyboard is rendered as a CSS grid (10 columns x 7 rows) loaded from the `keyboard_buttons` database table. Page 1 is the main register layout. Pages 2-6 are product pages navigated via page_link buttons.

The keyboard includes:
- Function buttons (rows 0-1): lock, supervisor, return, void, hold, nosale, viewor, pricecheck, reprint, pctdiscount, pctone, movedrawer, errcorrect, recall, ubereats
- Cart display area (rows 2-5, cols 0-2): 3x4 embedded cart view
- Department buttons (rows 2-5, cols 3-5): meat, coffee, fruit&veg, cheese, flowers, bread, bags, gas, deli
- Numpad (rows 2-5, cols 6-9): digits 0-9, 00, QTY X, CLEAR, CODE ENTER
- Bottom navigation (row 6): grocery, nuts, fruit A-M, fruit N-Z, vege A-G, vege H-Z, subtotal

**Status:** WORKING (see Keyboard Layout document for full detail)

#### 5.2.4 Section View (Product Drill-Down)

| Field | Value |
|---|---|
| Purpose | Shows filtered product list when a section/nav button is pressed |
| Layout | Breadcrumb trail + 5-column product grid |
| Navigation | Stack-based: pushSection/popSection/goHome |

**User Flow:**
1. Press a section button (e.g. "MEAT") or nav button (e.g. "FRUIT A-M")
2. Section view overlays the keyboard area
3. Products shown as clickable buttons (name + price)
4. Products with same first word are grouped; click group to drill in
5. Click product to add to cart
6. Breadcrumb or Escape/Backspace to navigate back

**IPC Calls:** `db:products:getByCategory`, `db:categories:getAll`

**Status:** WORKING

#### 5.2.5 Footer

Shows lane ID (LANE01) and current clerk name.

**Status:** WORKING

---

### 5.3 Modal Overlays (12 total)

#### 5.3.1 Cash Payment Modal (cashModal)

| Field | Value |
|---|---|
| Purpose | Cash payment entry with change calculation |
| Trigger | "Pay Cash" button, SUB TOTAL button, or F2 |

**User Flow:**
1. Shows sale total prominently
2. Numpad for entering tendered amount (in cents)
3. Quick buttons: Exact, $5, $10, $20, $50, $100
4. Change display: green if overpaid (shows change), red if short
5. Confirm: saves transaction, triggers receipt print, opens cash drawer, clears cart, shows completion animation

**IPC Calls:** `db:transaction:save`, `hardware:printReceipt`, `hardware:openDrawer`

**Status:** WORKING

#### 5.3.2 Open Price Modal (openPriceModal)

| Field | Value |
|---|---|
| Purpose | Cashier enters price for open-price items (e.g. FRUIT & VEG) |
| Trigger | Pressing an `open_price` type button |

**User Flow:**
1. Shows item label
2. Numpad for entering price (in cents, e.g. 150 = $1.50)
3. Confirm adds generic product with entered price to cart

**IPC Calls:** None (client-side cart operation)

**Status:** WORKING

#### 5.3.3 Price Change Modal (priceChangeModal)

| Field | Value |
|---|---|
| Purpose | Change price of last item in cart |
| Trigger | PRICE CHECK button |

**User Flow:**
1. Shows current item name and price
2. Numpad for entering new price
3. Confirm updates item price in cart

**IPC Calls:** None (client-side cart operation)

**Status:** WORKING

#### 5.3.4 Weight Modal (weightModal)

| Field | Value |
|---|---|
| Purpose | Enter weight for kg/100g products |
| Trigger | Scanning/adding a product with unit=kg or unit=100g |

**User Flow:**
1. Shows product name
2. Numpad with decimal point for entering weight in kg
3. Confirm multiplies product price by weight, adds to cart

**IPC Calls:** None (client-side cart operation)

**Status:** WORKING (manual entry only -- no scale integration)

#### 5.3.5 Recall Sale Modal (recallModal)

| Field | Value |
|---|---|
| Purpose | List parked/held transactions for recall |
| Trigger | RECALL SALE button |

**User Flow:**
1. Shows list of parked sales with date, items, total
2. Click to restore into current cart
3. Original parked transaction is deleted

**IPC Calls:** `db:transaction:getParkedSales`, `db:transaction:getTransactionItems`, `db:transaction:deleteTransaction`

**Status:** WORKING

#### 5.3.6 Discount Modal (discountModal)

| Field | Value |
|---|---|
| Purpose | Apply percentage discount to whole sale or single item |
| Trigger | % DISCOUNT or % ONE ITEM buttons (when numBuf is empty) |

**User Flow:**
1. Enter percentage value
2. Apply to whole sale (pctdiscount) or last item only (pctone)
3. Shortcut: type number on numpad then press button directly (skips modal)

**IPC Calls:** `db:audit:logAudit` (logs discount action)

**Status:** WORKING

#### 5.3.7 Supervisor Modal (supervisorModal)

| Field | Value |
|---|---|
| Purpose | Prompt for manager/admin PIN to enable supervisor mode |
| Trigger | SUPERVISOR button |

**User Flow:**
1. PIN entry numpad
2. Must enter a PIN belonging to a staff with role=manager or role=admin
3. On success: enables supervisor mode for 60 seconds, shows yellow banner

**IPC Calls:** `db:staff:login`

**Status:** WORKING (but no actual permission enforcement -- supervisor mode is cosmetic)

#### 5.3.8 Price Check Modal (priceCheckModal)

| Field | Value |
|---|---|
| Purpose | Look up product price without adding to cart |
| Trigger | PRICE CHECK button (2x2 on main keyboard) |

**User Flow:**
1. Scan or search for product
2. Shows product name, price, category
3. Close without adding to cart

**IPC Calls:** `db:products:search`, `db:products:getByBarcode`

**Status:** WORKING

#### 5.3.9 Uber Eats Modal (uberModal)

| Field | Value |
|---|---|
| Purpose | Add percentage markup to current sale for Uber Eats orders |
| Trigger | UBER EATS ADJ button |

**User Flow:**
1. Shows current sale total
2. Adds 30% markup as a line item
3. Confirm adds markup to cart

**IPC Calls:** None (client-side cart operation)

**Status:** WORKING

#### 5.3.10 Return Lookup Modal (returnLookupModal)

| Field | Value |
|---|---|
| Purpose | Look up past transaction for item-level returns |
| Trigger | RETURN button (when cart is empty) |

**User Flow:**
1. Search by transaction ID or date
2. Shows transaction details with line items
3. Select items to return (adds as negative qty to cart)
4. Process return as negative payment

**IPC Calls:** `db:transaction:searchTransactions`, `db:transaction:getTransactionItems`

**Status:** WORKING

#### 5.3.11 Reprint Modal (reprintModal)

| Field | Value |
|---|---|
| Purpose | Reprint last completed receipt |
| Trigger | REPRINT button |

**User Flow:**
1. Shows last completed transaction details
2. Confirm to reprint via ESC/POS

**IPC Calls:** `hardware:printReceipt`, `db:transaction:searchTransactions`

**Status:** WORKING (requires physical receipt printer)

#### 5.3.12 Drawer Modal (drawerModal)

| Field | Value |
|---|---|
| Purpose | Cash drawer management (float, pickup, drop) |
| Trigger | Context-dependent |

**User Flow:**
1. Select action (float, pickup, drop)
2. Enter amount
3. Optional note
4. Logs action to cash_drawer table

**IPC Calls:** `db:cashDrawer:logCashDrawer`, `hardware:openDrawer`

**Status:** WORKING

---

### 5.4 Sale Complete Overlay

| Field | Value |
|---|---|
| Purpose | Animated confirmation after successful payment |
| Trigger | After transaction is saved |
| Duration | Auto-dismiss after ~2 seconds |

**Status:** WORKING

---

### 5.5 Return Mode Banner

| Field | Value |
|---|---|
| Purpose | Visual indicator that register is in return mode |
| Trigger | RETURN button (when cart has items) |
| Behavior | Next scanned items are added with negative qty |

**Status:** WORKING

---

### 5.6 Supervisor Mode Banner

| Field | Value |
|---|---|
| Purpose | Yellow banner indicating elevated privileges |
| Duration | 60 seconds, then auto-expires |

**Status:** WORKING (cosmetic only -- no actual permission changes)

---

### 5.7 Customer-Facing Display

| Field | Value |
|---|---|
| File | `pos/customer.html` |
| Purpose | Second-monitor display showing current sale items and total to customer |
| Launch | Via admin or IPC call to open second BrowserWindow |

**IPC Calls:** `customer:update`, `customer:saleComplete`

**Status:** WORKING

---

### 5.8 Admin Panel

| Field | Value |
|---|---|
| File | `pos/admin.html` |
| Layout | Dark theme sidebar nav (13 tabs) + content area |
| Theme | CSS variables: --bg:#0f1117, --surface:#1a1d27, --text:#f1f5f9 |

#### 5.8.1 Dashboard Tab

| Field | Value |
|---|---|
| Purpose | Daily sales summary and top products |
| Data | Calls dailySummary(today) and topProducts(today) on load |

**Elements:**
- 4 stat cards: Total Sales, Transactions, Tax Collected, Discounts
- Top products table: name, qty sold, revenue

**IPC Calls:** `db:reports:dailySummary`, `db:reports:topProducts`

**Status:** WORKING (shows $0 / 0 transactions -- no data yet)

#### 5.8.2 Transactions Tab

| Field | Value |
|---|---|
| Purpose | Search, view, void, refund, delete transactions |

**Elements:**
- Search input (by date, ID, status)
- Transaction list table with status badges
- Detail view showing items and payments
- Void button (sets status=voided)
- Refund button (sets status=refunded)
- Delete button (hard delete)

**IPC Calls:** `db:transaction:searchTransactions`, `db:transaction:getTransactionItems`, `db:transaction:getTransactionPayments`, `db:transaction:void`, `db:transaction:refund`, `db:transaction:deleteTransaction`

**Status:** WORKING (no data to display yet)

#### 5.8.3 Cash Drawer Tab

| Field | Value |
|---|---|
| Purpose | Daily cash drawer log, float/pickup/drop management |

**Elements:**
- Action buttons: Set Float, Cash Pickup, Cash Drop
- Amount input + note field
- Daily log table
- Summary totals

**IPC Calls:** `db:cashDrawer:logCashDrawer`, `db:cashDrawer:getCashDrawerLog`, `db:cashDrawer:getCashDrawerSummary`

**Status:** WORKING (no data yet)

#### 5.8.4 Z Report Tab

| Field | Value |
|---|---|
| Purpose | End-of-day report with payment method breakdown |

**Elements:**
- Date picker
- Sales summary (total, count, tax, discounts)
- Payment method breakdown (cash, card, eftpos)
- Hourly sales chart
- Category breakdown
- Void/refund count

**IPC Calls:** `db:reports:zReport`, `db:reports:salesByHour`, `db:reports:salesByMethod`, `db:reports:salesByCategory`, `db:reports:voidRefundCount`

**Status:** WORKING (no data yet)

#### 5.8.5 Products Tab

| Field | Value |
|---|---|
| Purpose | CRUD for product catalog |

**Elements:**
- Search input (debounced 300ms)
- Product table: Name, Barcode, Category, Price, Unit, Stock, Edit
- "+ Add Product" button
- Edit panel (3-column grid): Name, Barcode, PLU, Category dropdown, Sell Price, Cost Price, Unit (each/kg/100g/litre), Tax Rate, Track Stock, Stock Qty, Image URL
- Barcode duplicate warning on save
- Save / Delete (soft-delete) / Cancel

**IPC Calls:** `db:products:search`, `db:products:upsert`, `db:products:delete`, `db:categories:getAll`

**Status:** WORKING

#### 5.8.6 Deals Tab

| Field | Value |
|---|---|
| Purpose | CRUD for promotional deals |

**Elements:**
- Deal table: Name, Type, Details, Products, Status, Edit
- "+ New Deal" button
- Edit panel: Deal Name, Deal Type (multi_buy/buy_x_get_y/discount_pct/discount_amt/combo)
- Dynamic config fields per type:
  - multi_buy / combo: Buy Qty + For Price ($)
  - buy_x_get_y: Buy Qty + Get Free Qty
  - discount_pct: Discount %
  - discount_amt: Discount $
- Date range (optional)
- Product picker: search + badge display with remove
- Save / Delete (hard delete) / Cancel

**IPC Calls:** `db:deals:getAll`, `db:deals:upsert`, `db:deals:delete`, `db:deals:getProducts`, `db:deals:setProducts`, `db:products:search`

**Status:** WORKING (no deals configured)

#### 5.8.7 Staff Tab

| Field | Value |
|---|---|
| Purpose | CRUD for staff accounts |

**Elements:**
- Staff table: Name, Role, Status badge (green Active / red Inactive)
- Add form: Name, PIN (max 6 chars), Role dropdown (cashier/manager/admin)
- Edit/toggle active

**IPC Calls:** `db:staff:getAll`, `db:staff:upsert`

**Status:** WORKING

#### 5.8.8 Keyboard Layout Editor Tab

| Field | Value |
|---|---|
| Purpose | Full visual grid editor for POS keyboard layout |

**Elements:**
- Page tabs + "+ Page" / "Delete Page" buttons
- Grid settings: columns (6/8/10/12) and rows (5/7/8/10) dropdowns
- Visual CSS grid rendering with colored cells
- Product sidebar (right, 240px): search + product list, click to select
- Edit panel: Label, Function type, Category/Value, Alpha Range, Price, BG Color, Text Color, Col Span, Row Span, Image upload, Live preview
- Drag-drop to move/swap buttons
- Drag-select across empty cells to create multi-span buttons
- Copy Page function
- Export / Import / Reset / Validate keyboard
- Target page dropdown for page_link buttons

**IPC Calls:** `db:keyboard:getAll`, `db:keyboard:getByPage`, `db:keyboard:getPages`, `db:keyboard:getAllIncludingInactive`, `db:keyboard:upsert`, `db:keyboard:delete`, `db:keyboard:deletePage`, `db:keyboard:copyPage`, `db:keyboard:exportKeyboard`, `db:keyboard:importKeyboard`, `db:keyboard:resetKeyboard`, `db:keyboard:validateKeyboard`

**Status:** WORKING

#### 5.8.9 Network Tab

| Field | Value |
|---|---|
| Purpose | LAN multi-register sync management |

**Elements:**
- LAN sync status display
- Peer list
- Test connection button
- Restart LAN sync button

**IPC Calls:** `lan:getLanStatus`, `lan:testLanConnection`, `lan:restartLan`

**Status:** WORKING (no peers configured)

#### 5.8.10 Hardware Tab

| Field | Value |
|---|---|
| Purpose | USB device probing and hardware status |

**Elements:**
- Probe button: scans USB + serial ports
- 4 device status cards with colored dots:
  - Receipt Printer (green=connected, red=not found)
  - Cash Drawer (green=available, amber=assumed via printer DK port, red=no printer)
  - Barcode Scanner (green=detected, amber=HID keyboard mode)
  - Scale (green=detected, red=not found)
- USB device table: Vendor ID, Product ID, Manufacturer, Product, Class
- Scanner test input

**Hardcoded vendor IDs:**
- Printers: 0x04b8 (Epson), 0x0519 (Seiko), 0x0416 (Star), 0x0dd4, 0x20d1, 0x0fe6, 0x1fc9, 0x0483
- Scales: 0x0b67 (CAS), 0x0922 (Ohaus), 0x1446, 0x0eb8 (Mettler-Toledo)
- Scanners: 0x05e0 (Honeywell), 0x05f9, 0x0c2e, 0x1eab, 0x2dd6, 0x1a86 (Zebex)

**IPC Calls:** `hardware:probeDevices`

**Status:** WORKING

#### 5.8.11 Import Tab

| Field | Value |
|---|---|
| Purpose | Bulk product import from JSON or CSV |

**Elements:**
- JSON import: textarea for paste or URL, expected format `{category: [{name, price, barcode, unit}], ...}`
- CSV import: drag-drop zone, flexible header matching (name/description, price/sell price, category/department)
- Result display: "Imported X products across Y categories"

**IPC Calls:** `db:import:importProducts`

**Status:** WORKING

#### 5.8.12 Audit Log Tab

| Field | Value |
|---|---|
| Purpose | View audit trail for sensitive actions |

**Elements:**
- Date filter
- Action type filter
- Searchable audit entry list with timestamp, staff, action, details

**IPC Calls:** `db:audit:searchAudit`

**Status:** WORKING (1 entry)

#### 5.8.13 Settings Tab

| Field | Value |
|---|---|
| Purpose | App configuration |

**Elements:**
- Store Details: Store Name, ABN, Address, Phone, Register ID
- Receipt: Header text (textarea), Footer text (textarea)
- Supabase Cloud Sync: URL + Anon Key inputs, "Save & Connect" button
- Database Backups: Create Backup, List Backups, Restore Backup

**IPC Calls:** `db:settings:getAll`, `db:settings:set`, `db:backups:createBackup`, `db:backups:listBackups`, `db:backups:restoreBackup`

**Status:** WORKING

---

## 6. POS Register Features -- Detailed Status

| # | Feature | Trigger | Status | Notes |
|---|---|---|---|---|
| 1 | Staff PIN login | App start / Lock | WORKING | 2 staff configured |
| 2 | Barcode scan to cart | Scan into #searchInput + Enter | WORKING | Exact match on barcode or PLU |
| 3 | Product search | Type 2+ chars in #searchInput | WORKING | LIKE search, shows in section view |
| 4 | Open price entry | Press open_price button | WORKING | Cashier enters price in cents |
| 5 | Weight entry (kg/100g) | Scan kg/100g product | WORKING | Manual entry only, no scale integration |
| 6 | Cash payment | Pay Cash / SUB TOTAL / F2 | WORKING | Change calc, quick buttons |
| 7 | Card/EFTPOS payment | Card button / F3 | WORKING | Manual -- no terminal integration |
| 8 | Split payments | Cash modal | WORKING | Multiple payment methods per transaction |
| 9 | % Discount (whole sale) | % DISCOUNT button | WORKING | Numpad shortcut supported |
| 10 | % Discount (one item) | % ONE ITEM button | WORKING | Numpad shortcut supported |
| 11 | Void / Error Correct | VOID or ERROR CORRECT | WORKING | Removes last item from cart |
| 12 | Hold / Park sale | HOLD SALE button | WORKING | Saves as parked transaction |
| 13 | Recall sale | RECALL SALE button | WORKING | Lists parked sales, restore to cart |
| 14 | No Sale drawer open | NO SALE button | WORKING | Opens cash drawer via ESC/POS |
| 15 | Move Drawer | MOVE DRAWER button | WORKING | Opens cash drawer |
| 16 | Return mode (toggle) | RETURN button (cart has items) | WORKING | Next scans added as negative qty |
| 17 | Return by receipt | RETURN button (cart empty) | WORKING | Lookup past transaction, select items |
| 18 | Reprint receipt | REPRINT button | WORKING | Requires physical printer |
| 19 | Price Check | PRICE CHECK button | WORKING | 2x2 button, lookup without adding |
| 20 | Uber Eats adjustment | UBER EATS ADJ button | WORKING | Adds 30% markup line item |
| 21 | QTY X multiplier | Type digits + QTY X | WORKING | Sets quantity for next scan |
| 22 | Numpad code entry | Type digits + CODE ENTER | WORKING | PLU/barcode lookup |
| 23 | Keyboard page nav | page_link buttons | WORKING | 6 pages configured |
| 24 | Section drill-down | section/nav buttons | WORKING | Stack-based with breadcrumb |
| 25 | Deal auto-application | Automatic on qualifying items | WORKING | multi_buy, buy_x_get_y, discount_pct, discount_amt, combo |
| 26 | Customer display sync | Automatic during sale | WORKING | Second BrowserWindow |
| 27 | Keyboard shortcuts | F1-F8, F11, Esc, Backspace | WORKING | See shortcut table below |
| 28 | Fullscreen/kiosk toggle | F11 | WORKING | Exit via Esc or Exit FS button |
| 29 | Live clock | Status bar | WORKING | Updates every second |
| 30 | Audit logging | Void, nosale, discount actions | WORKING | Logged to audit_log table |
| 31 | Lock register | Lock button | WORKING | Shows PIN login overlay |
| 32 | Supervisor mode | SUPERVISOR button | WORKING | 60s elevated mode (cosmetic only) |

### Keyboard Shortcuts

| Key | Action |
|---|---|
| F1 | Focus barcode input |
| F2 | Open cash payment modal |
| F3 | Card/EFTPOS payment |
| F4 | Clear cart |
| F11 | Toggle fullscreen/kiosk |
| Escape | Close modals or pop section |
| Backspace | Go back to previous section (when not in search) |

---

## 7. All IPC Channels

### Products

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:products:search` | `searchProducts(query)` | Search string | Array of products (limit 50) | WORKING |
| `db:products:getByBarcode` | `getProductByBarcode(code)` | Barcode or PLU string | Single product or null | WORKING |
| `db:products:getById` | `getProductById(id)` | Product UUID | Single product | WORKING |
| `db:products:getByCategory` | `getProductsByCategory(catId)` | Category UUID | Array of active products | WORKING |
| `db:categories:getAll` | `getCategories()` | None | Array of active categories | WORKING |
| `db:products:upsert` | `upsertProduct(p)` | Product object | void (auto-generates UUID) | WORKING |
| `db:categories:upsert` | `upsertCategory(c)` | Category object | void | WORKING |
| `db:products:delete` | `deleteProduct(id)` | Product UUID | void (soft delete, active=0) | WORKING |

### Specials

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:specials:getAll` | `getSpecials()` | None | Array of specials | WORKING |
| `db:specials:upsert` | `upsertSpecial(s)` | Special object | void | WORKING |
| `db:specials:delete` | `deleteSpecial(id)` | Special UUID | void | WORKING |

### Deals

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:deals:getAll` | `getDeals()` | None | Array of deals | WORKING |
| `db:deals:getActive` | `getActiveDeals()` | None | Array of active deals with products | WORKING |
| `db:deals:upsert` | `upsertDeal(d)` | Deal object (config as JSON) | void | WORKING |
| `db:deals:delete` | `deleteDeal(id)` | Deal UUID | void (hard delete + deal_products) | WORKING |
| `db:deals:getProducts` | `getDealProducts(id)` | Deal UUID | Array of products with role | WORKING |
| `db:deals:setProducts` | `setDealProducts(id, productIds)` | Deal UUID + product ID array | void (delete all + re-insert) | WORKING |

### Transactions

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:transaction:save` | `saveTransaction(txn)` | Transaction object (items + payments) | void (insert all, decrement stock, queue sync) | WORKING |
| `db:transaction:void` | `voidTransaction(id)` | Transaction UUID | void (set status=voided) | WORKING |
| `db:transaction:refund` | `refundTransaction(id)` | Transaction UUID | void (set status=refunded) | WORKING |
| `db:transaction:getParked` | `getParkedSales()` | None | Array of parked transactions | WORKING |
| `db:transaction:getItems` | `getTransactionItems(id)` | Transaction UUID | Array of line items | WORKING |
| `db:transaction:getPayments` | `getTransactionPayments(id)` | Transaction UUID | Array of payments | WORKING |
| `db:transaction:delete` | `deleteTransaction(id)` | Transaction UUID | void (hard delete) | WORKING |
| `db:transaction:search` | `searchTransactions(params)` | Search params (date, status, etc.) | Array of transactions | WORKING |

### Staff

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:staff:login` | `staffLogin(pin)` | PIN string | {id, name, role} or null | WORKING |
| `db:staff:getAll` | `getStaff()` | None | Array of staff | WORKING |
| `db:staff:getWithPin` | `getStaffWithPin()` | None | Array of staff with PINs visible | WORKING |
| `db:staff:upsert` | `upsertStaff(s)` | Staff object | void | WORKING |

### Settings

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:settings:get` | `getSetting(key)` | Key string | Value string | WORKING |
| `db:settings:getAll` | `getAllSettings()` | None | Object of all key-value pairs | WORKING |
| `db:settings:set` | `setSetting(k, v)` | Key + value strings | void | WORKING |

### Sync

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:sync:getPending` | `getSyncPending()` | None | Array where synced=0 | WORKING |
| `db:sync:markSynced` | `markSynced(ids)` | Array of sync_queue IDs | void (set synced=1) | WORKING |

### Reports

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:reports:dailySummary` | `dailySummary(date)` | Date string | {txn_count, total_sales, total_tax, total_discounts} | WORKING |
| `db:reports:topProducts` | `topProducts(date)` | Date string | Top 20 products by qty | WORKING |
| `db:reports:salesByHour` | `salesByHour(date)` | Date string | Hourly sales breakdown | WORKING |
| `db:reports:salesByMethod` | `salesByMethod(date)` | Date string | Payment method breakdown | WORKING |
| `db:reports:salesByCategory` | `salesByCategory(date)` | Date string | Category sales breakdown | WORKING |
| `db:reports:voidRefundCount` | `voidRefundCount(date)` | Date string | Void and refund counts | WORKING |
| `db:reports:zReport` | `zReport(date)` | Date string | Full end-of-day report data | WORKING |

### Keyboard

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:keyboard:getAll` | `getKeyboardButtons()` | None | All active buttons | WORKING |
| `db:keyboard:getByPage` | `getButtonsByPage(page)` | Page number | Page-specific buttons | WORKING |
| `db:keyboard:getPages` | `getPages()` | None | Array of distinct page numbers | WORKING |
| `db:keyboard:getAllIncludingInactive` | `getAllButtons()` | None | All buttons including inactive | WORKING |
| `db:keyboard:upsert` | `upsertButton(btn)` | Button object | void | WORKING |
| `db:keyboard:delete` | `deleteButton(id)` | Button ID | void (+ children) | WORKING |
| `db:keyboard:deletePage` | `deletePage(page)` | Page number | void (all buttons on page) | WORKING |
| `db:keyboard:copyPage` | `copyPage(params)` | Source + target page | void | WORKING |
| `db:keyboard:exportKeyboard` | `exportKeyboard()` | None | Full keyboard JSON | WORKING |
| `db:keyboard:importKeyboard` | `importKeyboard(data)` | Keyboard JSON | void | WORKING |
| `db:keyboard:resetKeyboard` | `resetKeyboard()` | None | void (restore defaults) | WORKING |
| `db:keyboard:validateKeyboard` | `validateKeyboard()` | None | Validation results | WORKING |

### Backups

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:backups:create` | `createBackup()` | None | Backup filename | WORKING |
| `db:backups:list` | `listBackups()` | None | Array of backup files | WORKING |
| `db:backups:restore` | `restoreBackup(name)` | Backup filename | void | WORKING |

### Audit

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:audit:log` | `logAudit(entry)` | {staff_id, action, details} | void | WORKING |
| `db:audit:search` | `searchAudit(params)` | Search params | Array of audit entries | WORKING |

### Import

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:import:products` | `importProducts(data)` | Array of product objects | Import result summary | WORKING |

### Hardware

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `hardware:printReceipt` | `printReceipt(data)` | Receipt data object | void (graceful fail) | WORKING (requires printer) |
| `hardware:openDrawer` | `openDrawer()` | None | void | WORKING (requires printer) |
| `hardware:probeDevices` | `probeDevices()` | None | Device status object | WORKING |

### Cash Drawer

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:cashDrawer:log` | `logCashDrawer(entry)` | {action, amount, note} | void | WORKING |
| `db:cashDrawer:getLog` | `getCashDrawerLog(date)` | Date string | Array of log entries | WORKING |
| `db:cashDrawer:getSummary` | `getCashDrawerSummary(date)` | Date string | Summary totals | WORKING |

### Stock

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `db:stock:getLow` | `getLowStock()` | None | Products with low stock | WORKING |
| `db:stock:adjust` | `adjustStock(id, qty)` | Product ID + qty adjustment | void | WORKING |

### Window

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `window:exitFullscreen` | `exitFullscreen()` | None | void | WORKING |
| `window:quit` | `quit()` | None | void (closes app) | WORKING |

### LAN Sync

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `lan:getStatus` | `getLanStatus()` | None | LAN sync status object | WORKING |
| `lan:testConnection` | `testLanConnection(peer)` | Peer address | Connection test result | WORKING |
| `lan:restart` | `restartLan()` | None | void | WORKING |

### Customer Display

| Channel | Method | Input | Output | Status |
|---|---|---|---|---|
| `customer:update` | `customerUpdate(data)` | Cart/item data | void | WORKING |
| `customer:saleComplete` | `customerSaleComplete(data)` | Sale total + change | void | WORKING |
| `customer:open` | `openCustomerDisplay()` | None | void (opens second window) | WORKING |

---

## 8. Hardware Support Status

| Device | Detection | Integration | Status |
|---|---|---|---|
| Receipt Printer | USB vendor ID matching (Epson, Star, Seiko, etc.) | ESC/POS via PowerShell rawprint.ps1 | IMPLEMENTED -- requires physical hardware |
| Cash Drawer | Via printer DK port | ESC/POS drawer pulse command | IMPLEMENTED -- requires printer connection |
| Barcode Scanner | USB vendor ID matching (Honeywell, Zebex, etc.) | HID keyboard mode (no driver needed) | IMPLEMENTED -- works out of box |
| Scale | USB vendor ID matching (CAS, Ohaus, Mettler-Toledo) | Serial read NOT implemented | DETECTED ONLY -- weight entered manually |
| Payment Terminal | Not detected | No Linkly/Tyro integration | NOT STARTED |
| Customer Display | N/A (software) | Second Electron BrowserWindow | IMPLEMENTED |
| Label Printer | Not detected | Not implemented | NOT STARTED |

---

## 9. Missing Features, Risks, and Security Issues

### Security Issues

| # | Issue | Severity | Details |
|---|---|---|---|
| S1 | PINs stored in plain text | HIGH | Staff PINs are stored as plain text in the `staff` table. Anyone with DB file access can read all PINs. |
| S2 | No role-based permission enforcement | MEDIUM | Any PIN logs in with full access regardless of role (cashier/manager/admin). Supervisor mode is cosmetic only -- it shows a banner but does not gate any actions. |
| S3 | Staff PIN via getStaffWithPin IPC | MEDIUM | The `getStaffWithPin()` IPC channel returns PINs to the renderer process, which is a broader exposure surface than necessary. |
| S4 | No session timeout | LOW | Once logged in, the session persists indefinitely until manual lock. No auto-lock after inactivity. |

### Data Issues

| # | Issue | Severity | Details |
|---|---|---|---|
| D1 | np-display button overlap | LOW | `np-display` button (id=np-display, type=num_display) at page 1, row 2, col 3 has active=1 but overlaps with `btn-meat` at the same grid position. It should be inactive. |
| D2 | pg2-melons misplaced | LOW | `pg2-melons` (MELONS $3.99/kg) is at page 2, row 4, col 3 with row_span=2, which is outside the visible product area (rows 0-3). Probably moved/misplaced. |
| D3 | 0 transactions recorded | INFO | App appears to be in pre-production state with no sales data. |
| D4 | 2 unsynced sync_queue entries | LOW | Pending sync records that will never sync since Supabase is not configured. |
| D5 | No specials or deals configured | INFO | These features are implemented but have no data. |

### Missing Features

| # | Feature | Priority | Details |
|---|---|---|---|
| M1 | Payment terminal integration | HIGH | No Linkly or Tyro integration. Card/EFTPOS payments are recorded manually. |
| M2 | Scale serial port reading | MEDIUM | Scale hardware is detected but weight must be entered manually. No serial port data reading. |
| M3 | Label printing | LOW | No label printer support at all. |
| M4 | Scheduled backups | MEDIUM | Only auto-backup on startup. No configurable backup schedule (hourly, daily, etc.). |
| M5 | Receipt customization | LOW | Receipt header/footer are not configured despite settings fields existing. |
| M6 | ABN / phone not configured | LOW | Store ABN and phone number are empty in settings. |
| M7 | Supabase sync not configured | MEDIUM | Cloud sync URL and anon key are not set. 2 records stuck in sync_queue. |

### Layout Issues

| # | Issue | Details |
|---|---|---|
| L1 | Page 1 row 4 col 3 empty | Gap between department buttons (between bread row and bags row). |
| L2 | Page 1 row 4 col 9 empty | Gap in numpad area (below digit 3, above CODE ENTER). |
| L3 | Page 1 row 6 col 3 empty | Gap in bottom nav between NUTS and FRUIT A-M. |
| L4 | Page 1 row 1 col 7 empty | Gap between UBER EATS ADJ and PRICE CHECK 2x2. |
| L5 | Col 6 spacer on pages 2-6 | Consistently empty column acting as visual separator between products and navigation. Intentional but wastes screen space. |
| L6 | Open price buttons not linked to products | Keyboard FRUIT & VEG buttons use open_price type rather than linking to product records. Price must be manually entered even though products exist in the database. |

### Architectural Risks

| # | Risk | Details |
|---|---|---|
| A1 | Single-file main process | main.js at ~1250 lines handles everything (DB, IPC, hardware, sync, backups). No modularization. |
| A2 | Inline HTML/CSS/JS | Both index.html (~2090 lines) and admin.html (~3100 lines) contain all markup, styles, and scripts inline. No separation of concerns. |
| A3 | No automated tests | Zero test files. No unit tests, integration tests, or E2E tests. |
| A4 | No error reporting | Errors are caught and silently logged to console. No crash reporting or error aggregation. |
| A5 | sql.js WASM in-memory | Entire database is held in memory via WASM. Large datasets could cause memory pressure. Crash before debounced save = data loss. |
