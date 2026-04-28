# Crisp POS

Electron-based point-of-sale system for **Crisp on Creek** (fruit & veg shop, 1832 Logan Rd, Mt Gravatt QLD 4122). Mirrors and replaces the existing Profit Track register.

## Tech Stack

- **Electron v33.2.0** -- Chromium + Node.js desktop app
- **sql.js v1.11+ (WASM)** -- SQLite via WebAssembly (not better-sqlite3, which won't compile on Node v25.9.0 + path with spaces)
- **Vanilla JS + HTML** -- no build step, no framework, ES modules
- **IPC bridge** -- `preload.js` exposes `window.pos.*` methods via `contextBridge`/`ipcRenderer`
- **uuid v11** -- UUID generation for all record IDs
- **Supabase** -- cloud sync target (edge functions in `/supabase`)

## Project Structure

```
main.js              -- Electron main process, DB init, all IPC handlers, hardware probing
preload.js           -- contextBridge API (window.pos.*)
db/schema.sql        -- SQLite schema + seed data (categories, products, keyboard layout, settings)
pos/index.html       -- POS register screen (cashier-facing, full transaction flow)
pos/admin.html       -- Admin panel (8 tabs: dashboard, products, staff, deals, keyboard, hardware, import, settings)
pos/js/ui.js         -- Shared UI helpers (esc, $, $$, money, showToast, debounce, formatTime, formatDate)
pos/js/cart.js       -- Shopping cart class (items, totals, tax calc, toTransaction)
pos/js/sync.js       -- Supabase cloud sync engine (push/pull, realtime subscriptions)
migrate-from-pt.js   -- One-shot migration from Profit Track (products.json import)
supabase/            -- Supabase edge functions + Postgres schema for cloud sync
```

## Running

```bash
npm start              # production mode (fullscreen/kiosk)
npm run dev            # dev mode (windowed + DevTools)
npx electron .         # same as npm start
npx electron . --dev   # same as npm run dev
```

**Keyboard shortcuts:**
- **F11** -- toggle fullscreen/kiosk mode
- **Escape** -- exit kiosk mode (when in kiosk)
- Both screens have an "Exit FS" button in the top bar

---

## Database

SQLite stored at `~/Library/Application Support/crisp-pos/crisp-pos.sqlite`. Schema in `db/schema.sql`.

### Initialization Flow (main.js)

1. Check if DB file exists on disk; if yes, load bytes into sql.js WASM database; if not, create empty in-memory DB
2. Read `db/schema.sql`, split by `;`, execute each statement (try-catch for idempotency with `CREATE IF NOT EXISTS` / `INSERT OR IGNORE`)
3. Run migration array (ALTER TABLE statements) for existing DBs that lack new columns
4. Call `saveDB()` to persist to disk

### Write Path

1. Renderer calls `window.pos.someMethod(args)` (via preload bridge)
2. Main process IPC handler calls `dbRun(sql, params)` which executes via sql.js
3. `dbRun` calls `scheduleSave()` -- a 1-second debounced timer that exports the sql.js database to bytes and writes the file
4. If the write is a product/deal/staff/etc upsert, `queueSync()` also appends a record to `sync_queue` for cloud push

### Tables

**categories**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| sort_order | INTEGER | Default 0 |
| colour | TEXT | Hex color, default `#10b981` |
| active | INTEGER | 0/1 boolean |
| updated_at | TEXT | ISO datetime |

**products**
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

**specials** (price overrides per product, date-ranged)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| product_id | TEXT FK | References products(id) |
| special_price | REAL | Override price |
| start_date / end_date | TEXT | ISO date, nullable |
| active | INTEGER | |

**deals** (promotions)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | e.g. "Apples 2 for $4" |
| type | TEXT | `multi_buy` / `buy_x_get_y` / `discount_pct` / `discount_amt` / `combo` |
| config | TEXT | JSON string: `{qty, price}` or `{buy, free}` or `{pct}` or `{amt}` |
| start_date / end_date | TEXT | Nullable |
| active | INTEGER | |

**deal_products** (linking table)
| Column | Type | Notes |
|---|---|---|
| deal_id | TEXT FK | |
| product_id | TEXT FK | |
| role | TEXT | `trigger` or `reward` |
| PK | composite | (deal_id, product_id) |

**staff**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT | |
| pin | TEXT | Plain text, 4-6 digits |
| role | TEXT | `cashier` / `manager` / `admin` |
| active | INTEGER | |

**transactions**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| register_id | TEXT | e.g. "LANE01" (from settings) |
| staff_id | TEXT FK | |
| customer_name | TEXT | |
| subtotal | REAL | Sum of line totals |
| tax | REAL | Extracted GST (inclusive) |
| discount | REAL | |
| total | REAL | = subtotal (tax is inclusive) |
| status | TEXT | `completed` / `voided` / `refunded` / `parked` |
| created_at | TEXT | |

**transaction_items**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| transaction_id | TEXT FK | |
| product_id | TEXT FK | |
| name | TEXT | Product name at time of sale (snapshot) |
| qty | REAL | |
| unit_price | REAL | |
| discount | REAL | |
| line_total | REAL | qty * unit_price - discount |
| tax | REAL | Inclusive GST extracted |
| deal_id | TEXT FK | Nullable, which deal applied |

**payments**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| transaction_id | TEXT FK | |
| method | TEXT | `cash` / `card` / `eftpos` / `account` |
| amount | REAL | |
| reference | TEXT | Tyro txn ref, card last 4, etc. |

**cash_drawer**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| register_id | TEXT | |
| staff_id | TEXT FK | |
| action | TEXT | `open` / `close` / `float` / `pickup` / `drop` |
| amount | REAL | For float/pickup/drop |
| note | TEXT | |

**sync_queue** (offline-first)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | AUTOINCREMENT |
| table_name | TEXT | Which table |
| record_id | TEXT | Row ID |
| action | TEXT | `insert` / `update` / `delete` |
| payload | TEXT | Full row as JSON |
| synced | INTEGER | 0 = pending, 1 = pushed |

Index: `idx_sync_pending` on (synced) WHERE synced = 0

**settings** (key-value store)
| Column | Type |
|---|---|
| key | TEXT PK |
| value | TEXT |

Default settings: `store_name`, `store_address`, `store_phone`, `store_abn`, `receipt_header`, `receipt_footer`, `register_id`, `tax_name`, `tax_rate`

**keyboard_buttons** (POS grid layout)
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| label | TEXT | Button display text |
| type | TEXT | See Button Types below |
| price | REAL | For fixed_price buttons |
| image | TEXT | Data URL or path |
| color | TEXT | Text color, default `#fff` |
| bg_color | TEXT | Background, default `#1B4332` |
| parent_id | TEXT | For child buttons |
| category_filter | TEXT | e.g. "Fruit", "Coffee", `__all__` |
| alpha_range | TEXT | e.g. "A-M", "N-Z" |
| sort_order | INTEGER | |
| position | TEXT | `main` / `bottom` (legacy) / `grid` (new) |
| page | INTEGER | 1-based page number |
| grid_row | INTEGER | 0-based row position |
| grid_col | INTEGER | 0-based column position |
| col_span | INTEGER | Cells wide (1-10) |
| row_span | INTEGER | Cells tall (1-5) |
| active | INTEGER | |

### Seed Data

Schema seeds 12 categories, ~35 products (fruit, veg, meat, dairy, bread, coffee, cheese, flowers, nuts, grocery), and 46 keyboard buttons matching the Profit Track register layout:

- **Rows 0-1:** Function buttons (lock, supervisor, return, void[2-col], hold, nosale, viewor, pricecheck[2x2], reprint, %discount, %one item, movedrawer, errcorrect, recall, ubereats)
- **Rows 2-5 cols 0-2:** Department buttons (meat, coffee, fruit&veg, cheese, flowers, bread, fruit&veg/kg, bags, deli)
- **Rows 2-5 cols 4-7:** Numpad (7-8-9-QTYX, 4-5-6-CLEAR, 1-2-3, 0-00-CODE ENTER)
- **Row 6:** Bottom nav (grocery[2-col], nuts, gas, fruit A-M, fruit N-Z, veg A-G, vege H-Z, subtotal[2-col])

### Button Types

**Product:** `open_price` (cashier enters $), `fixed_price` (set amount), `section` (opens category grid), `nav` (filtered navigation with optional alpha_range)

**Register Functions:** `void`, `return`, `hold`, `nosale` (open drawer), `supervisor`, `lock`, `reprint`, `pricecheck`, `errcorrect`, `recall`, `pctdiscount` (% whole sale), `pctone` (% one item), `movedrawer`, `ubereats`, `viewor`

**Numpad:** `digit` (0-9, 00), `clear`, `qtyx` (quantity multiplier), `codeenter` (PLU lookup)

**Payment:** `subtotal`, `pay_cash`, `pay_card`, `park`

**Navigation:** `page_link` (go to page), `back_home`

---

## IPC Channels (preload.js / main.js)

All channels follow `domain:table:action` naming.

### Products
| Channel | Method | Description |
|---|---|---|
| `db:products:search` | `searchProducts(query)` | LIKE search on name/barcode/plu, joins specials for active_price, limit 50 |
| `db:products:getByBarcode` | `getProductByBarcode(code)` | Exact match on barcode OR plu |
| `db:products:getById` | `getProductById(id)` | Single product by ID |
| `db:products:getByCategory` | `getProductsByCategory(catId)` | All active products in category |
| `db:categories:getAll` | `getCategories()` | All active categories ordered by sort_order |
| `db:products:upsert` | `upsertProduct(p)` | INSERT OR REPLACE, auto-generates UUID |
| `db:categories:upsert` | `upsertCategory(c)` | INSERT OR REPLACE |
| `db:products:delete` | `deleteProduct(id)` | Soft delete (sets active=0) |

### Deals
| Channel | Method | Description |
|---|---|---|
| `db:deals:getAll` | `getDeals()` | All deals, ordered by active DESC, name |
| `db:deals:upsert` | `upsertDeal(d)` | INSERT OR REPLACE, JSON.stringify(config) |
| `db:deals:delete` | `deleteDeal(id)` | Hard delete deal + its deal_products |
| `db:deals:getProducts` | `getDealProducts(id)` | Join deal_products + products |
| `db:deals:setProducts` | `setDealProducts(id, productIds)` | Delete all + re-insert with role='trigger' |

### Transactions
| Channel | Method | Description |
|---|---|---|
| `db:transaction:save` | `saveTransaction(txn)` | Insert transaction + items + payments, decrement stock, queue sync |
| `db:transaction:void` | `voidTransaction(id)` | Set status='voided' |

### Staff
| Channel | Method | Description |
|---|---|---|
| `db:staff:login` | `staffLogin(pin)` | Returns {id, name, role} or null |
| `db:staff:getAll` | `getStaff()` | All staff |
| `db:staff:upsert` | `upsertStaff(s)` | INSERT OR REPLACE |

### Settings
| Channel | Method | Description |
|---|---|---|
| `db:settings:get` | `getSetting(key)` | Single value |
| `db:settings:getAll` | `getAllSettings()` | All as object |
| `db:settings:set` | `setSetting(k, v)` | Upsert key-value |

### Sync
| Channel | Method | Description |
|---|---|---|
| `db:sync:getPending` | `getSyncPending()` | Where synced=0 |
| `db:sync:markSynced` | `markSynced(ids)` | Set synced=1 |

### Reports
| Channel | Method | Description |
|---|---|---|
| `db:reports:dailySummary` | `dailySummary(date)` | txn_count, total_sales, total_tax, total_discounts |
| `db:reports:topProducts` | `topProducts(date)` | Top 20 products by qty |

### Keyboard Layout
| Channel | Method | Description |
|---|---|---|
| `db:keyboard:getAll` | `getKeyboardButtons()` | All active buttons, ordered by page + sort_order |
| `db:keyboard:getByPage` | `getButtonsByPage(page)` | Page-specific, ordered by grid_row + grid_col |
| `db:keyboard:getPages` | `getPages()` | SELECT DISTINCT page |
| `db:keyboard:getAllIncludingInactive` | `getAllButtons()` | All buttons including inactive |
| `db:keyboard:upsert` | `upsertButton(btn)` | Saves all grid fields (page, grid_row, grid_col, col_span, row_span) |
| `db:keyboard:delete` | `deleteButton(id)` | Delete button + children (by parent_id) |
| `db:keyboard:deletePage` | `deletePage(page)` | Delete all buttons on page |

### Import
| Channel | Method | Description |
|---|---|---|
| `db:import:products` | `importProducts(data)` | Bulk upsert products + categories from array |

### Hardware
| Channel | Method | Description |
|---|---|---|
| `hardware:printReceipt` | `printReceipt(data)` | ESC/POS receipt printing (graceful fail) |
| `hardware:openDrawer` | `openDrawer()` | ESC/POS drawer pulse |
| `hardware:probe` | `probeDevices()` | Scan USB + serial, return device status |

### Window
| Channel | Method | Description |
|---|---|---|
| `window:exitFullscreen` | `exitFullscreen()` | Exit kiosk + fullscreen |
| `window:quit` | `quit()` | Close app |

---

## POS Register Screen (pos/index.html)

### Layout Structure

```
body
  login-overlay          -- PIN login (full-screen, visible until auth)
    login-logo           -- "C" in green circle, Playfair serif
    pinDisplay           -- Dots showing PIN length
    pinPad               -- 3x4 grid (1-9, C, 0, OK)
    loginError           -- Red error text

  status-bar             -- 42px dark header
    status-left          -- Store name, barcode input, staff badge, Admin link, Exit FS, sync dot
    status-right         -- Health dots (server, drawer, scanner, scale), big subtotal display

  main-row               -- Flex container
    cart-panel (300px)   -- White sidebar
      cart-header        -- "Current Sale" title
      cart-items         -- Scrollable item list
      cart-totals        -- Subtotal, Tax (GST), Total
      cart-actions       -- Pay Cash (green), Card/EFTPOS (gray), Park buttons

    keyboard-panel       -- Flex:1, the register keyboard
      func-area          -- Function buttons (2 rows x 10 cols)
      mid-area           -- Departments (3 cols) + Numpad (4 cols) with green LED display
      product-grid       -- Section view (hidden by default, 5-col product grid)

  bottom-bar (60px)      -- Navigation buttons loaded from DB

  pos-footer (22px)      -- Lane ID + clerk name

  Modals (fixed overlays):
    cashModal            -- Cash payment (tendered amount, change calc, quick buttons)
    openPriceModal       -- Cashier enters $ for open-price items
    priceChangeModal     -- Change price of last item
    weightModal          -- Enter weight for kg/100g products
    saleComplete         -- Completion animation
```

### PIN Login Flow

1. App starts with `login-overlay` visible
2. User taps digits on `pinPad` (3x4 grid), dots appear in `pinDisplay`
3. "C" clears, "OK" submits
4. `window.pos.staffLogin(pin)` -- returns `{id, name, role}` or null
5. On success: hide overlay, set `currentStaff`, show welcome toast, focus barcode input
6. On failure: show "Invalid PIN" in red, clear buffer

### Transaction Flow

**1. Barcode Scanning:**
- `#searchInput` (scan-input) has autofocus
- On `input` (debounced 250ms): if 2+ chars, calls `searchProducts(query)`, shows results in section view as product grid
- On `Enter`: calls `getProductByBarcode(value)`, if found adds directly to cart

**2. Adding to Cart:**
- If product unit is `kg` or `100g`: show weight modal, store in `pendingWeightProduct`
- Otherwise: `cart.addProduct(product, qtyMultiplier)`
- If product is `each` and already in cart: increments qty instead of adding new line
- Reset: `numBuf=''`, `qtyMultiplier=1`, clear search, refocus input

**3. Cart Display:**
- Each item shows: name, qty x unit_price, line_total
- +/- qty buttons per item
- Delete button per item
- Special badge if `is_special` flag set
- `onChange` callback triggers `renderCart()` and `updateTotals()`

**4. Numpad & Quantity:**
- Digit buttons append to `numBuf` (shown on green LED display)
- `QTY X` button: sets `qtyMultiplier` from numBuf, shows "QTY x5" in orange
- `CLEAR` resets numBuf and qtyMultiplier
- `CODE ENTER` looks up numBuf as PLU/barcode

**5. Open Price Entry:**
- Triggered by `open_price` buttons (e.g. "FRUIT & VEG")
- Shows `openPriceModal` with numpad
- Input is in cents (e.g. 150 = $1.50)
- Adds generic product with entered price

**6. Weight Entry:**
- Triggered when scanning kg/100g products
- Shows `weightModal` with numpad + decimal point
- Confirm multiplies product price by weight

**7. Payment:**
- `SUB TOTAL` button or "Pay Cash" from cart actions opens `cashModal`
- Quick buttons: Exact, $5, $10, $20, $50, $100
- Change display: green if overpaid (shows change), red if short
- Confirm: saves transaction via `window.pos.saveTransaction()`, triggers receipt print, opens cash drawer, clears cart, shows completion animation
- Card/EFTPOS: payment with method='card', amount=total

**8. Totals Calculation (Cart class):**
- Tax-inclusive pricing (standard in Australia)
- `tax = line_total * tax_rate / (1 + tax_rate)` -- extracts GST from inclusive price
- `total = subtotal` (tax already included)
- `discount = sum(item.discount)`

### Department & Section Navigation

**Bottom bar** buttons loaded dynamically from `keyboard_buttons` DB:
- Filters by type `nav` or legacy `position='bottom'`
- Each button has `category_filter` and optional `alpha_range`

**Section navigation uses a stack:**
- `pushSection(title, renderFn)` -- add section, show product grid view
- `popSection()` -- go back to previous section
- `goHome()` -- clear stack, show keyboard home view

**Category filtering:**
- `section` type: `getProductsByCategory(catId)` then group by first word
- `nav` type: filter by category + alpha range (e.g. "Fruit" + "A-M")
- Single product: renders as product button (name + price)
- Multiple products starting with same word: renders as group button, click to drill in

### Register Function Buttons

| Button | Type | Behavior |
|---|---|---|
| VOID | `void` | Remove last item from cart |
| ERROR CORRECT | `errcorrect` | Same as void |
| HOLD SALE | `hold` | Save cart as transaction with status='parked', clear cart |
| NO SALE | `nosale` | Open cash drawer via `window.pos.openDrawer()` |
| MOVE DRAWER | `movedrawer` | Open cash drawer |
| PRICE CHECK | `pricecheck` | Show price change modal for last item |
| RECALL SALE | `recall` | Recall a parked transaction (coming soon) |
| LOCK | `lock` | Lock register, show login overlay (coming soon) |
| SUPERVISOR | `supervisor` | Supervisor mode (coming soon) |
| REPRINT | `reprint` | Reprint last receipt (coming soon) |
| RETURN | `return` | Return mode (coming soon) |
| % DISCOUNT | `pctdiscount` | % off whole sale (coming soon) |
| % ONE ITEM | `pctone` | % off one item (coming soon) |
| UBER EATS ADJ | `ubereats` | Uber Eats adjustment (coming soon) |
| VIEW OR... | `viewor` | View options (coming soon) |

### Register Keyboard Shortcuts

- **F1:** Focus barcode input
- **F2:** Open cash payment modal
- **F3:** Card/EFTPOS payment
- **F4:** Clear cart
- **Escape:** Close modals or pop section
- **Backspace (not in search):** Go back to previous section

### State Variables

- `currentStaff` -- `{id, name, role}` after PIN login
- `cart` -- Cart class instance (items, totals, not persisted between sessions)
- `numBuf` -- Numpad buffer string for code/qty input
- `qtyMultiplier` -- Qty for next scan (default 1)
- `sectionStack` -- Array of `{title, renderFn}` for navigation history
- `pendingWeightProduct` -- Product waiting for weight entry
- `allCategories` -- Cached category list

---

## Admin Panel (pos/admin.html)

8 tabs: Dashboard, Products, Staff, Deals, Keyboard, Hardware, Import, Settings

Dark theme with CSS variables: `--bg: #0f1117`, `--surface: #1a1d27`, `--surface2: #242833`, `--text: #f1f5f9`, `--text-dim: #8892a8`

### Dashboard Tab

- Calls `dailySummary(today)` and `topProducts(today)` on load
- 4 stat cards: Total Sales, Transactions, Tax Collected, Discounts
- Top products table: name, qty sold, revenue

### Products Tab

- Search input (debounced 300ms) calls `searchProducts(query)`
- Table: Name, Barcode, Category, Price, Unit, Stock, Edit button
- "+ Add Product" button
- **Edit panel** (shown on edit/add):
  - 3-column grid: Name, Barcode, PLU, Category (dropdown from DB), Sell Price, Cost Price, Unit (each/kg/100g/litre), Tax Rate, Track Stock (Y/N), Stock Qty, Image URL
  - Save: `upsertProduct()` -- auto-generates UUID for new products
  - Delete: soft-delete (sets active=0)
  - Cancel: hides panel

### Staff Tab

- Table: Name, Role, Status badge (green Active / red Inactive)
- Add form: Name, PIN (max 6 chars), Role dropdown (cashier/manager/admin)
- Save calls `upsertStaff()`, reloads table

### Deals Tab

- Table: Name, Type, Details (human-readable config), Products (View link), Status, Edit button
- "+ New Deal" button
- **Edit panel:**
  - Deal Name (text), Deal Type (dropdown)
  - **Dynamic config fields per type:**
    - `multi_buy` / `combo`: Buy Qty + For Price ($)
    - `buy_x_get_y`: Buy Qty + Get Free Qty
    - `discount_pct`: Discount %
    - `discount_amt`: Discount $
  - Date range: Start Date, End Date (optional)
  - **Product picker:** Search box (debounced, needs 2+ chars), results dropdown, click to add as badge with x to remove
  - Save: `upsertDeal()` then `setDealProducts()` with product IDs
  - Delete: hard delete via `deleteDeal()`

### Keyboard Layout Editor Tab

- **Page management:** Tab buttons per page, "+ Page" to create, "Delete Page" to remove (disabled if only 1)
- **Grid settings:** Dropdowns for columns (6/8/10/12) and rows (5/7/8/10)
- **Grid rendering (`renderGrid()`):**
  - CSS Grid with `gap:4px`, cells 60px tall
  - Occupied cells: colored div with type badge, label, price, optional image
  - Empty cells: dashed border with "+" indicator
  - Occupied cell tracking: builds `Set` of occupied coordinates and `cellMap` of button origins to skip cells covered by multi-span buttons

- **Interactions:**
  - **Click existing button:** Opens edit panel with all fields populated
  - **Click empty cell:** If a product is selected in sidebar, auto-creates button with product name/price/type=fixed_price. Otherwise opens blank new button form.
  - **Drag across empty cells (drag-select):** Mousedown starts selection, mousemove highlights cells in blue, mouseup checks all cells are free, opens new button form with col_span/row_span pre-filled. Shows error toast if selection overlaps existing button.
  - **Drag existing button:** HTML5 drag-and-drop to swap with another button or move to empty cell

- **Product sidebar (right panel, 240px):**
  - Search input (debounced)
  - Scrollable product list (up to 100 items) showing name + price
  - Click product to select (blue highlight), click again to deselect
  - Selected product auto-fills next empty cell click
  - Instruction text: "Click a product, then click an empty cell to place it"

- **Edit panel fields:**
  - Label, Function type (select with optgroups), Category/Value (datalist with DB categories + `__all__`)
  - Alpha Range, Price, BG Color (picker), Text Color (picker), Col Span, Row Span
  - Image upload: file input, resized to 128px max via canvas, stored as JPEG data URL (0.8 quality)
  - Live preview: 100x60px colored box updates in real-time
  - Save/Delete/Cancel buttons

- **State variables:** `kbButtons`, `currentPage`, `gridCols`, `gridRows`, `selectedBtnId`, `kbSelectedProduct`, `isDragSelecting`, `dragSelStart`, `dragSelCurrent`

### Hardware Tab

- **Probe button:** Calls `probeDevices()`, scans USB + serial ports
- **4 device status cards** with colored dots:
  - Receipt Printer (green=connected, red=not found)
  - Cash Drawer (green=available, amber=assumed via printer DK port, red=no printer)
  - Barcode Scanner (green=detected, amber=HID keyboard mode)
  - Scale (green=detected, red=not found)
- **USB device table:** Vendor ID (hex), Product ID (hex), Manufacturer, Product, Class
- **Scanner test input:** Type/scan barcode, press Enter to verify

**Hardcoded vendor IDs for detection:**
- Printers: 0x04b8 (Epson), 0x0519 (Seiko), 0x0416 (Star), 0x0dd4, 0x20d1, 0x0fe6, 0x1fc9, 0x0483
- Scales: 0x0b67 (CAS), 0x0922 (Ohaus), 0x1446, 0x0eb8 (Mettler-Toledo)
- Scanners: 0x05e0 (Honeywell), 0x05f9, 0x0c2e, 0x1eab, 0x2dd6, 0x1a86 (Zebex)

### Import Tab

- **JSON import:** Textarea for paste or URL. Expected format: `{category: [{name, price, barcode, unit}], ...}`
- **CSV import:** Drag-drop zone. Flexible header matching (name/description, price/sell price, category/department)
- Shows result: "Imported X products across Y categories"

### Settings Tab

- **Store Details:** Store Name, ABN, Address, Phone, Register ID -- each saves via `setSetting()`
- **Receipt:** Header text (textarea), Footer text (textarea)
- **Supabase Cloud Sync:** URL + Anon Key inputs, "Save & Connect" button

---

## Cart Class (pos/js/cart.js)

```javascript
class Cart {
  items: []              // Array of cart items
  onChange: null          // Callback for UI updates

  addProduct(product, qty=1)  // Add or increment qty (merge if 'each' and same product)
  updateQty(index, qty)       // Change qty, remove if <= 0
  removeItem(index)           // Remove by index
  updatePrice(index, price)   // Change unit_price, recalc
  setItemDiscount(index, amt) // Set discount amount
  clear()                     // Empty cart

  get subtotal    // sum(line_total)
  get tax         // sum(item tax) -- extracted from inclusive price
  get discount    // sum(item.discount)
  get total       // = subtotal (tax inclusive)
  get count       // sum(qty)
  get isEmpty

  toTransaction(staffId, payments)  // Returns full transaction object for saving
}
```

**Item structure:**
```javascript
{
  product_id, name, qty, unit, unit_price,
  discount, line_total, tax, is_special, deal_id
}
```

**Tax calculation:** `tax = line_total * tax_rate / (1 + tax_rate)` (extracts GST from inclusive price)

---

## Sync Engine (pos/js/sync.js)

- `initSync(url, key)` -- Dynamically imports Supabase JS SDK from CDN, creates client
- `isOnline()` -- Returns true if supabase initialized AND navigator.onLine
- `pushPending()` -- Get sync_queue where synced=0, upsert/delete to Supabase, mark synced=1
- `pullProducts()` / `pullCategories()` -- Fetch from Supabase, upsert locally
- `subscribeToChanges(callback)` -- Realtime channel on products/categories/specials
- `startAutoSync(intervalMs=30000)` -- Poll every 30s
- `stopAutoSync()` -- Clear interval + unsubscribe

---

## Migration (migrate-from-pt.js)

One-shot script to import from Profit Track:

```bash
node migrate-from-pt.js [path-to-products.json]
```

- If path provided: reads file. Otherwise: fetches from `https://matthiascamp.github.io/crisponcreek/products.json`
- Expected format: `{category: [{name, price, barcode, unit}], ...}`
- Uses better-sqlite3 (not sql.js) for direct DB write
- Inserts categories with sort order, then products

---

## Supabase (supabase/)

Cloud Postgres schema mirrors local SQLite with:
- UUID types instead of TEXT
- TIMESTAMPTZ instead of TEXT dates
- JSONB for deal config
- Row-level security (RLS) policies
- Reporting views: `daily_sales`, `product_sales`
- Realtime enabled on: products, categories, specials, deals

---

## Key CSS Classes

**Register (index.html):** `.cart-panel`, `.cart-item`, `.func-btn`, `.func-void`, `.func-yellow`, `.func-orange`, `.func-price-check`, `.dept-btn`, `.num-btn`, `.num-display`, `.nav-btn` (variants: `-dark`, `-small`, `-gold`, `-green`, `-red`), `.section-view`, `.product-grid`, `.product-btn`, `.modal-overlay`, `.modal`, `.toast`

**Admin (admin.html):** `.tab-content`, `.section`, `.stat-card`, `.btn-green`, `.btn-blue`, `.btn-outline`, `.badge` (`.badge-green`, `.badge-red`), `.form-field`, `.form-row`, `.kb-cell`, `.kb-cell.empty-cell`, `.kb-cell.selected`, `.kb-cell.sel-highlight`, `.kb-prod-item`, `.kb-product-sidebar`

---

## Shared Utilities (pos/js/ui.js)

| Function | Description |
|---|---|
| `esc(s)` | HTML entity escape (&, <, >, ", ') |
| `$(sel, root)` | `querySelector` wrapper |
| `$$(sel, root)` | `querySelectorAll` wrapper (returns array) |
| `money(n)` | Format as `$X.XX` |
| `showToast(msg, type)` | Floating notification (info/success/error), auto-dismiss 2.5s |
| `formatTime(date)` | HH:MM (en-AU) |
| `formatDate(date)` | DD/MM/YYYY (en-AU) |
| `debounce(fn, ms)` | Standard debounce, default 250ms |
