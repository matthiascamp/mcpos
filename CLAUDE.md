# Tillaroo POS

Electron-based point-of-sale system. Originally built for **Crisp on Creek** (fruit & veg shop, 1832 Logan Rd, Mt Gravatt QLD 4122) as a replacement for Profit Track, now evolving into a white-label SaaS product.

## Tech Stack

- **Electron v33.2.0** -- Chromium + Node.js desktop app
- **sql.js v1.11+ (WASM)** -- SQLite via WebAssembly (not better-sqlite3, which won't compile on Node v25.9.0 + path with spaces)
- **Vanilla JS + HTML** -- no build step, no framework, ES modules
- **IPC bridge** -- `preload.js` exposes `window.pos.*` methods via `contextBridge`/`ipcRenderer`
- **uuid v11** -- UUID generation for all record IDs
- **Supabase** -- cloud sync target (edge functions in `/supabase`)
- **Linkly Cloud** -- EFTPOS payment terminal integration
- **LAN Sync** -- multi-register sync via HTTP + UDP broadcast

## Project Structure

```
main.js              -- Electron main process, DB init, all IPC handlers, hardware probing
preload.js           -- contextBridge API (window.pos.*)
lan-sync.js          -- LAN sync server/client (HTTP port 5555, UDP broadcast port 5556)
linkly.js            -- Linkly Cloud EFTPOS integration (pairing, purchase, refund, settlement)
import-data.js       -- First-launch data import (products, keyboard, prices, deals)
db/schema.sql        -- SQLite schema + seed data (categories, products, keyboard layout, settings)
pos/index.html       -- POS register screen (cashier-facing, full transaction flow)
pos/admin.html       -- Admin panel (18 tabs — see Admin Panel section)
pos/js/ui.js         -- Shared UI helpers (esc, $, $$, money, showToast, debounce, formatTime, formatDate)
pos/js/cart.js       -- Shopping cart class (items, totals, tax calc, toTransaction)
pos/js/sync.js       -- Supabase cloud sync engine (push/pull, realtime subscriptions)
migrate-from-pt.js   -- One-shot migration from Profit Track (products.json import)
supabase/            -- Supabase edge functions + Postgres schema for cloud sync
rawprint.ps1         -- PowerShell ESC/POS raw printing helper
opos-bridge.ps1      -- Windows OPOS (POS for .NET) COM bridge
scale_reader.py      -- Scale serial reader
scanner-bridge.exe   -- Barcode scanner bridge (compiled)
```

## Running

```bash
npm start              # production mode (fullscreen/kiosk)
npm run dev            # dev mode (windowed + DevTools)
npx electron .         # same as npm start
npx electron . --dev   # same as npm run dev
```

## Building

```bash
npm run build          # electron-builder --win (default portable)
npm run build:portable # portable EXE (no install)
npm run build:installer # NSIS installer EXE
```

Output goes to `dist2/`. Portable artifact: `Tillaroo-1.0.0.exe`.

**Keyboard shortcuts:**
- **F11** -- toggle fullscreen/kiosk mode
- **Escape** -- exit kiosk mode (when in kiosk)
- Both screens have an "Exit FS" button in the top bar

---

## App Modes

The app runs in one of two modes, controlled by the `app_mode` setting:
- **`register`** -- Full POS register with hardware polling, scale/scanner integration, receipt printing
- **`admin`** -- Admin panel only, skips hardware probe and polling

Switching modes triggers an app restart.

---

## Database

SQLite stored at:
- **Windows:** `%APPDATA%\tillaroo\crisp-pos.sqlite`
- **Linux/macOS:** `~/.config/tillaroo/crisp-pos.sqlite`

Schema in `db/schema.sql`.

### Initialization Flow (main.js)

1. Check if DB file exists on disk; if yes, load bytes into sql.js WASM database; if not, create empty in-memory DB
2. Read `db/schema.sql`, split by `;`, execute each statement (try-catch for idempotency with `CREATE IF NOT EXISTS` / `INSERT OR IGNORE`)
3. Run migration array (ALTER TABLE statements) for existing DBs that lack new columns
4. Re-link keyboard buttons to products, apply image data
5. Call `saveDB()` to persist to disk
6. Create timestamped backup on startup

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
| method | TEXT | `cash` / `card` / `eftpos` |
| amount | REAL | |
| reference | TEXT | Linkly txn ref, card last 4, etc. |

**cash_drawer**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| register_id | TEXT | |
| staff_id | TEXT FK | |
| action | TEXT | `open` / `close` / `float` / `pickup` / `drop` |
| amount | REAL | For float/pickup/drop |
| note | TEXT | |

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

**keyboard_pages** (page metadata)
| Column | Type | Notes |
|---|---|---|
| page | INTEGER PK | 1-based page number |
| name | TEXT | Display name |
| columns | INTEGER | Grid columns for this page |
| rows | INTEGER | Grid rows for this page |

**sync_queue** (offline-first)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | AUTOINCREMENT |
| table_name | TEXT | Which table |
| record_id | TEXT | Row ID |
| action | TEXT | `insert` / `update` / `delete` |
| payload | TEXT | Full row as JSON |
| synced | INTEGER | 0 = pending, 1 = pushed |

**settings** (key-value store)
| Column | Type |
|---|---|
| key | TEXT PK |
| value | TEXT |

Default settings: `store_name`, `store_address`, `store_phone`, `store_abn`, `receipt_header`, `receipt_footer`, `register_id`, `tax_name`, `tax_rate`

### Button Types

**Product:** `product` (linked to DB product), `open_price` (cashier enters $), `fixed_price` (set amount), `section` (opens category grid), `nav` (filtered navigation with optional alpha_range)

**Register Functions:** `void`, `return`, `hold`, `nosale` (open drawer), `supervisor`, `lock`, `reprint`, `pricecheck`, `errcorrect`, `recall`, `pctdiscount` (% whole sale), `pctone` (% one item), `movedrawer`, `ubereats`, `viewor`

**Numpad:** `digit` (0-9, 00), `clear`, `qtyx` (quantity multiplier), `codeenter` (PLU lookup)

**Payment:** `subtotal`, `pay_cash`, `pay_card`, `park`

**Navigation:** `page_link` (go to page), `back_home`

**Layout:** `cart_display` (cart / receipt area), `num_display` (LCD display)

---

## IPC Channels (preload.js / main.js)

All channels follow `domain:table:action` naming. 120+ channels total. Key categories:

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
| `db:transaction:search` | `searchTransactions(query)` | Search by ID, staff, date range |
| `db:transaction:get` | `getTransaction(id)` | Full transaction with items and payments |
| `db:transaction:refund` | `refundTransaction(id)` | Create refund transaction |
| `db:transaction:delete` | `deleteTransaction(id)` | Hard delete |

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

### Reports
| Channel | Method | Description |
|---|---|---|
| `db:reports:dailySummary` | `dailySummary(date)` | txn_count, total_sales, total_tax, total_discounts |
| `db:reports:topProducts` | `topProducts(date)` | Top 20 products by qty |
| `db:reports:salesByHour` | `salesByHour(date)` | Hourly breakdown |
| `db:reports:salesByMethod` | `salesByMethod(date)` | By payment method |
| `db:reports:salesByCategory` | `salesByCategory(date)` | By product category |
| `db:reports:weeklySummary` | `weeklySummary(date)` | 7-day summary |
| `db:reports:voidRefundCount` | `voidRefundCount(date)` | Void/refund stats |
| `db:reports:zReport` | `zReport(date)` | End-of-day Z-report |

### Insights
| Channel | Method | Description |
|---|---|---|
| `db:insights:salesHeatmap` | `salesHeatmap(range)` | Sales heatmap by hour/day |
| `db:insights:demandForecast` | `demandForecast()` | Demand prediction |
| `db:insights:boughtTogether` | `boughtTogether()` | Frequently bought together |
| `db:insights:salesTrend` | `salesTrend(range)` | Sales trend over time |
| `db:insights:xeroExport` | `xeroExport(range)` | Xero accounting export |

### Keyboard Layout
| Channel | Method | Description |
|---|---|---|
| `db:keyboard:getAll` | `getKeyboardButtons()` | All active buttons, ordered by page + sort_order |
| `db:keyboard:getByPage` | `getButtonsByPage(page)` | Page-specific, ordered by grid_row + grid_col |
| `db:keyboard:getPages` | `getPages()` | All pages with metadata |
| `db:keyboard:getAllIncludingInactive` | `getAllButtons()` | All buttons including inactive |
| `db:keyboard:upsert` | `upsertButton(btn)` | Saves all grid fields |
| `db:keyboard:delete` | `deleteButton(id)` | Delete button + children |
| `db:keyboard:deletePage` | `deletePage(page)` | Delete all buttons on page |
| `db:keyboard:createPage` | `createPage(name)` | Create new keyboard page |
| `db:keyboard:renamePage` | `renamePage(page, name)` | Rename page |
| `db:keyboard:updatePageSize` | `updatePageSize(page, cols, rows)` | Set grid dimensions |
| `db:keyboard:copyPage` | `copyPage(srcPage)` | Duplicate a page |
| `db:keyboard:export` | `exportKeyboard()` | Export full layout as JSON |
| `db:keyboard:import` | `importKeyboard(data)` | Import layout from JSON |

### Stock
| Channel | Method | Description |
|---|---|---|
| `db:stock:lowStock` | `getLowStock()` | Products below threshold |
| `db:stock:adjust` | `adjustStock(id, qty)` | Manual stock adjustment |

### Cash Drawer
| Channel | Method | Description |
|---|---|---|
| `db:cash_drawer:log` | `logCashDrawer(action)` | Log drawer open/close/float/pickup/drop |
| `db:cash_drawer:getLog` | `getCashDrawerLog(date)` | Get log for date |
| `db:cash_drawer:summary` | `getCashDrawerSummary(date)` | Daily summary |

### Audit
| Channel | Method | Description |
|---|---|---|
| `db:audit:log` | `auditLog(action)` | Write audit entry |
| `db:audit:search` | `searchAudit(query)` | Search audit log |

### Backup
| Channel | Method | Description |
|---|---|---|
| `db:backup:create` | `createBackup()` | Manual backup |
| `db:backup:list` | `listBackups()` | List available backups |
| `db:backup:restore` | `restoreBackup(name)` | Restore from backup |

### Hardware
| Channel | Method | Description |
|---|---|---|
| `hardware:printReceipt` | `printReceipt(data)` | ESC/POS or OPOS receipt printing |
| `hardware:openDrawer` | `openDrawer()` | ESC/POS or OPOS drawer pulse |
| `hardware:probe` | `probeDevices()` | Scan USB + serial, OPOS, return device status |
| `hardware:scaleRead` | `readScale()` | Get current scale weight |
| `hardware:scaleZero` | `zeroScale()` | Zero/tare the scale |

### LAN Sync
| Channel | Method | Description |
|---|---|---|
| `lan:getStatus` | `getLanStatus()` | Server/client status |
| `lan:getPeers` | `getLanPeers()` | Connected registers |
| `lan:pushToRegisters` | `pushToRegisters()` | Push keyboard/products to all registers |
| `lan:discover` | `discoverPeers()` | UDP broadcast discovery |
| `lan:networkDiagnostic` | `networkDiagnostic()` | Network connectivity check |

### Linkly EFTPOS
| Channel | Method | Description |
|---|---|---|
| `linkly:getStatus` | `getLinklyStatus()` | Terminal connection status |
| `linkly:configure` | `configureLinkly(config)` | Set merchant credentials |
| `linkly:pair` | `pairTerminal()` | OAuth pairing flow |
| `linkly:purchase` | `purchase(amount)` | Initiate card payment |
| `linkly:refund` | `refund(amount)` | Initiate refund |
| `linkly:settlement` | `settlement()` | End-of-day settlement |

### Window / App
| Channel | Method | Description |
|---|---|---|
| `window:exitFullscreen` | `exitFullscreen()` | Exit kiosk + fullscreen |
| `window:quit` | `quit()` | Close app |
| `app:health` | `getHealth()` | App health check |
| `app:version` | `getVersion()` | App version |
| `app:logs:get` | `getLogs()` | Get app log entries |

---

## POS Register Screen (pos/index.html)

### Layout Structure

```
body
  login-overlay          -- PIN login (full-screen, visible until auth)
    login-logo           -- "T" logo, Playfair serif
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
    cashModal            -- Cash payment (numpad always visible, change calc, quick buttons)
    openPriceModal       -- Cashier enters $ for open-price items
    priceChangeModal     -- Change price of last item
    weightModal          -- Enter weight for kg/100g products (skipped if scale has reading)
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
- If product unit is `kg` or `100g`: auto-use scale weight if available, otherwise show weight modal
- Otherwise: `cart.addProduct(product, qtyMultiplier)`
- If product is `each` and already in cart: increments qty instead of adding new line
- Confirmation dialog shown when minus button removes last item
- Reset: `numBuf=''`, `qtyMultiplier=1`, qty badge reset, return to main keyboard, clear search, refocus input

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
- If scale has an active reading, weight is auto-applied (modal skipped)
- Otherwise shows `weightModal` with numpad + decimal point
- Confirm multiplies product price by weight

**7. Payment:**
- `SUB TOTAL` button or "Pay Cash" from cart actions opens `cashModal`
- Numpad always visible in payment modal
- Quick buttons: Exact, $5, $10, $20, $50, $100
- Change display: green if overpaid (shows change), red if short
- Confirm: saves transaction via `window.pos.saveTransaction()`, triggers receipt print, opens cash drawer, clears cart, shows completion animation
- Card/EFTPOS: payment with method='card', amount=total; includes manual "EFTPOS Accepted" button for offline terminals
- Linkly integration: if configured, initiates terminal payment via `linkly:purchase`

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
| RECALL SALE | `recall` | Show list of parked/held transactions, click to restore into cart |
| LOCK | `lock` | Lock register (clears return/supervisor mode), show PIN login overlay |
| SUPERVISOR | `supervisor` | Prompt for manager/admin PIN, enables supervisor mode for 60s |
| REPRINT | `reprint` | Reprint last completed receipt via ESC/POS |
| RETURN | `return` | If cart empty: show return-by-receipt lookup (select items from past transaction). If cart has items: toggle return mode (next scans negative) |
| % DISCOUNT | `pctdiscount` | % off whole sale — numpad shortcut: type number then press button to skip modal |
| % ONE ITEM | `pctone` | % off last item — numpad shortcut: type number then press button to skip modal |
| UBER EATS ADJ | `ubereats` | Add 30% markup to current sale total as line item |
| VIEW OR... | `viewor` | View options (not configured) |

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

18 tabs: Dashboard, Products, Staff, Deals, Keyboard, Hardware, Receipt, Settings, Audit, Cash Drawer, Diagnostics, Insights, Labels, Logs, Network, Stock, Transactions, Z-Report

Dark theme with CSS variables: `--bg: #0f1117`, `--surface: #1a1d27`, `--surface2: #242833`, `--text: #f1f5f9`, `--text-dim: #8892a8`

### Dashboard Tab
- Calls `dailySummary(today)` and `topProducts(today)` on load
- 4 stat cards: Total Sales, Transactions, Tax Collected, Discounts
- Top products table: name, qty sold, revenue

### Products Tab
- Search input (debounced 300ms) calls `searchProducts(query)`
- Table: Name, Barcode, Category, Price, Unit, Stock, Edit button
- "+ Add Product" button
- **Edit panel:** Name, Barcode, PLU, Category, Sell Price, Cost Price, Unit, Tax Rate, Track Stock, Stock Qty, Image URL
- Save: `upsertProduct()`, Delete: soft-delete (active=0)

### Staff Tab
- Table: Name, Role, Status badge (green Active / red Inactive)
- Add form: Name, PIN (max 6 chars), Role dropdown (cashier/manager/admin)

### Deals Tab
- Table: Name, Type, Details, Products, Status, Edit button
- **Dynamic config fields per type:** multi_buy/combo (qty + price), buy_x_get_y (buy + free), discount_pct (%), discount_amt ($)
- Multi-tier pricing support (multiple qty/price tiers per deal)
- Product picker with search, date range

### Keyboard Layout Editor Tab
- **Page tree sidebar (left, 180px):** Page list with create/rename/duplicate/delete, "Send to Registers" button for LAN push
- **Grid:** CSS Grid, cells 56px tall, drag-select for multi-cell buttons, drag to move/swap
- **Edit sidebar (right, 380px):** Label, Type, Price ($18px font with $ prefix), Product search/link, Category, Alpha Range, Colors, Image upload, Col/Row span, Live preview
- **Product sidebar:** Search + click-to-place product buttons
- Keyboard export/import as JSON with versioning

### Hardware Tab
- Probe button: scans USB + serial ports + OPOS devices
- 4 device status cards: Receipt Printer, Cash Drawer, Barcode Scanner, Scale
- USB device table, Scanner test input
- OPOS integration for Windows POS for .NET devices
- Fallback chain: OPOS -> ESC/POS -> manual

### Insights Tab
- Sales heatmap (hour x day grid)
- Demand forecast
- Frequently bought together analysis
- Sales trends over time
- Xero accounting export

### Labels Tab
- Price tag editor with fixed 3x10 A4 sheet layout
- Product search, drag to arrange
- Print-ready output

### Transactions Tab
- Transaction history search and lookup
- View/reprint completed sales (Find Sale)
- Refund processing

### Cash Drawer Tab
- Cash drawer event log (open/close/float/pickup/drop)
- Daily and shift summaries

### Stock Tab
- Low stock alerts (products below threshold)
- Manual stock adjustments

### Z-Report Tab
- End-of-day settlement report
- Sales totals by payment method, category

### Audit Tab
- Searchable audit log of all system actions

### Logs Tab
- App log viewer with level filtering
- Log export

### Network Tab
- LAN sync configuration
- Network diagnostics (ping, interface listing)
- Peer discovery and connection status

### Diagnostics Tab
- Hardware diagnostics and OPOS device testing
- Serial port enumeration

### Receipt Tab
- Receipt header/footer text editing

### Settings Tab
- Store Details: Store Name, ABN, Address, Phone, Register ID
- Supabase Cloud Sync: URL + Anon Key
- App mode: Register / Admin

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

## LAN Sync (lan-sync.js)

Multi-register sync without requiring Supabase/internet:

- **Server** (port 5555 HTTP, port 5556 UDP): runs on the "main" register
- **Client**: other registers discover server via UDP broadcast, sync via HTTP
- **Sync model**: version-based change detection, 3-second poll interval
- **Data synced**: products, categories, deals, keyboard layout, settings
- **Transactions**: pushed from client registers to server
- **Session tracking**: concurrent staff logins across registers
- **"Send to Registers"**: push keyboard layout changes from admin to all connected registers
- Auto-started on app launch

---

## Linkly EFTPOS (linkly.js)

Integration with Linkly Cloud for payment terminal communication:

- Sandbox and production environment support
- OAuth pairing flow with terminal
- Purchase, refund, settlement via Linkly Cloud REST API
- Real-time status polling during transactions
- Manual "EFTPOS Accepted" fallback button for offline terminals

---

## Sync Engine (pos/js/sync.js)

Supabase cloud sync (separate from LAN sync):

- `initSync(url, key)` -- Dynamically imports Supabase JS SDK from CDN, creates client
- `isOnline()` -- Returns true if supabase initialized AND navigator.onLine
- `pushPending()` -- Get sync_queue where synced=0, upsert/delete to Supabase, mark synced=1
- `pullProducts()` / `pullCategories()` -- Fetch from Supabase, upsert locally
- `subscribeToChanges(callback)` -- Realtime channel on products/categories/specials
- `startAutoSync(intervalMs=30000)` -- Poll every 30s
- `stopAutoSync()` -- Clear interval + unsubscribe

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

## Hardware Integration

**Receipt Printer:** OPOS (Windows POS for .NET) or ESC/POS via USB/network. Graceful fallback.

**Cash Drawer:** OPOS or ESC/POS DK port pulse. Logged to cash_drawer table.

**Barcode Scanner:** OPOS or HID keyboard mode. Scanner bridge exe for non-HID devices. Auto-restart on disconnect.

**Scale:** Serial port reading with continuous polling. Weight events sent to renderer. Auto-use weight for kg/100g products (skip weight modal). Zero/tare support.

**Hardcoded vendor IDs for USB detection:**
- Printers: 0x04b8 (Epson), 0x0519 (Seiko), 0x0416 (Star), 0x0dd4, 0x20d1, 0x0fe6, 0x1fc9, 0x0483
- Scales: 0x0b67 (CAS), 0x0922 (Ohaus), 0x1446, 0x0eb8 (Mettler-Toledo)
- Scanners: 0x05e0 (Honeywell), 0x05f9, 0x0c2e, 0x1eab, 0x2dd6, 0x1a86 (Zebex)

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
