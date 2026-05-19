# Tillaroo POS -- Complete Internal Documentation

> **Purpose:** This document explains how every part of the app works so you can maintain it without vibe coding. It covers architecture, every file, every IPC channel, every weird decision, and every gotcha.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Map](#2-file-map)
3. [Database](#3-database)
4. [Main Process (main.js)](#4-main-process-mainjs)
5. [IPC Bridge (preload.js)](#5-ipc-bridge-preloadjs)
6. [POS Register Screen (pos/index.html)](#6-pos-register-screen-posindexhtml)
7. [Admin Panel (pos/admin.html)](#7-admin-panel-posadminhtml)
8. [Cart System (pos/js/cart.js)](#8-cart-system-posjscartjs)
9. [Supabase Cloud Sync (pos/js/sync.js)](#9-supabase-cloud-sync-posjssyncjs)
10. [LAN Multi-Register Sync (lan-sync.js)](#10-lan-multi-register-sync-lan-syncjs)
11. [Linkly EFTPOS Integration (linkly.js)](#11-linkly-eftpos-integration-linklyjs)
12. [Hardware Integration](#12-hardware-integration)
13. [Keyboard Layout System](#13-keyboard-layout-system)
14. [Deal / Discount Engine](#14-deal--discount-engine)
15. [Receipt Printing](#15-receipt-printing)
16. [Migration System](#16-migration-system)
17. [Gotchas, Workarounds & Weird Code](#17-gotchas-workarounds--weird-code)
18. [Known Issues](#18-known-issues)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process (main.js)                        │
│  - sql.js WASM database (in-memory, flushed to disk)    │
│  - All IPC handlers                                     │
│  - Hardware drivers (printer, scale, scanner, drawer)   │
│  - Linkly EFTPOS client                                 │
│  - LAN sync server/client                               │
│  - Supabase sync queue                                  │
├─────────────────────────────────────────────────────────┤
│  preload.js (contextBridge)                             │
│  - Exposes window.pos.* methods                         │
│  - All async invoke(), no data transformation           │
├─────────────┬───────────────────────────┬───────────────┤
│ Renderer:   │ Renderer:                 │ Renderer:     │
│ index.html  │ admin.html                │ customer.html │
│ (Register)  │ (Admin Panel)             │ (2nd screen)  │
│ Cart, Pay,  │ Products, Deals, Staff,   │ Cart mirror   │
│ Keyboard    │ Keyboard Editor, Reports  │               │
└─────────────┴───────────────────────────┴───────────────┘
```

**Tech stack:** Electron v33, sql.js (WASM SQLite -- not better-sqlite3, which won't compile on Node v25 with spaces in path), vanilla JS + HTML (no framework, no build step), ES modules in renderer.

**Data flow:** Renderer calls `window.pos.someMethod()` -> preload.js `ipcRenderer.invoke()` -> main.js handler runs SQL -> returns result. Writes call `dbRun()` which triggers `scheduleSave()` (3-second debounce) to flush the in-memory database to disk.

---

## 2. File Map

### Runtime files (shipped in the exe)

| File | What it does |
|---|---|
| `main.js` | Electron main process. 5800+ lines. DB init, all IPC handlers, hardware drivers, migrations |
| `preload.js` | contextBridge API. ~200 lines. Maps `window.pos.*` to IPC channels |
| `linkly.js` | Linkly Cloud EFTPOS REST client. Pairing, purchase, refund, polling, settlement |
| `lan-sync.js` | LAN multi-register sync. HTTP server/client, UDP discovery, session enforcement |
| `pos/index.html` | POS register screen. ~4000 lines of inline JS. Cart, payments, keyboard, scale |
| `pos/admin.html` | Admin panel. ~6800 lines. 16 tabs. Products, deals, keyboard editor, reports |
| `pos/js/cart.js` | Shopping cart class. Tax calc, item merge, toTransaction() |
| `pos/js/sync.js` | Supabase sync engine. Push/pull, realtime subscriptions, auto-sync |
| `pos/js/ui.js` | Shared utilities: `esc()`, `$()`, `money()`, `showToast()`, `debounce()` |
| `pos/customer.html` | Customer-facing display (2nd monitor) |
| `pos/splash.html` | Startup splash screen |
| `db/schema.sql` | SQLite schema + seed data (categories, products, keyboard layout, settings) |
| `db/keyboard-catpages.js` | Auto-generated keyboard data for category pages (2-5). Version-gated |
| `db/keyboard-subpages.js` | Auto-generated keyboard data for variety subpages (7-36). Version-gated |
| `rawprint.ps1` | PowerShell script for sending raw ESC/POS data to Windows print spooler |
| `opos-bridge.ps1` | PowerShell script for OPOS COM object communication (32-bit) |
| `scanner-bridge.exe` | Standalone 32-bit STA console app for OPOS barcode scanner events |
| `scale_reader.py` | Python bridge for MT 8217 serial scales |
| `pos/images/products/` | ~170 locally-cached product images (Coles, Woolworths, Pexels, GitHub) |

### Utility scripts (NOT in the app, development only)

All the `_*.js` files in the root (e.g., `_apply_images.js`, `_update_prices.js`, `_build_keyboard.js`, etc.) are one-shot development scripts. They are not loaded by the app at runtime.

---

## 3. Database

### Location

- **Windows:** `%APPDATA%/tillaroo/crisp-pos.sqlite`
- **macOS:** `~/Library/Application Support/tillaroo/crisp-pos.sqlite`

### How it works

sql.js loads the entire SQLite database into memory as a WASM instance. All reads/writes happen in memory. The database is flushed to disk:

- **`scheduleSave()`** -- 3-second debounced timer, triggered by every `dbRun()` call
- **`saveDBSync()`** -- Immediate synchronous write, used for keyboard operations and shutdown
- **`before-quit` handler** -- Clears timer, calls `saveDBSync()` on clean exit

**If the app crashes (not clean exit), any writes since the last save are lost.** The 3-second debounce means up to 3 seconds of data can be lost on crash.

### Tables

| Table | Purpose | PK |
|---|---|---|
| `categories` | Product categories with colour + sort order | UUID text |
| `products` | All products with barcode, PLU, price, unit, tax_rate, stock | UUID text |
| `specials` | Price overrides per product, date-ranged | UUID text |
| `deals` | Promotions (multi-buy, combos). Config stored as JSON string | UUID text |
| `deal_products` | Links deals to products with role (trigger/reward) | Composite (deal_id, product_id) |
| `staff` | Staff with **plain-text PINs**, role (cashier/manager/admin) | UUID text |
| `transactions` | Sale records with status (completed/voided/refunded/parked) | UUID text |
| `transaction_items` | Line items per transaction (snapshot of product at time of sale) | UUID text |
| `payments` | Payment records per transaction (cash/card/eftpos/account) | UUID text |
| `cash_drawer` | Drawer events (open/close/float/pickup/drop) | UUID text |
| `audit_log` | Staff action audit trail | UUID text |
| `sync_queue` | Offline-first sync queue for Supabase push | Auto-increment integer |
| `settings` | Key-value store for all app settings | Text key |
| `keyboard_buttons` | POS grid layout with position, span, type, image, colours | UUID text |
| `keyboard_pages` | Page definitions (name, cols, rows) | Integer page number |
| `deleted_records` | Tombstones to prevent sync resurrection | Composite (table_name, record_id) |

### Key settings

| Key | What it controls |
|---|---|
| `store_name`, `store_address`, `store_phone`, `store_abn` | Store identity |
| `receipt_header`, `receipt_footer` | Printed receipt text |
| `register_id` | Lane identifier (e.g., "LANE01") |
| `tax_name`, `tax_rate` | GST name and rate (0.10 = 10%) |
| `next_receipt_number` | Auto-incrementing receipt counter (string, manually incremented) |
| `app_mode` | `register` or `admin` -- which screen to show on startup |
| `supabase_url`, `supabase_anon_key` | Cloud sync credentials |
| `lan_mode` | `off`, `server`, or `client` |
| `lan_server_ip`, `lan_port`, `lan_secret` | LAN sync connection info |
| `hw_printer_*`, `hw_scale_*` | Hardware configuration |
| `company_logo` | Base64 data URL of company logo |
| `kb_catpages_ver`, `kb_subpages_ver` | Version gates for keyboard layout scripts |
| `migration_*` | One-time migration flags |

### Tax model

Australia uses **tax-inclusive pricing**. The price on the shelf IS the price you pay. GST is extracted, not added:

```
tax = line_total * tax_rate / (1 + tax_rate)
```

Fresh produce (fruit, veg) is GST-free (`tax_rate = 0.00`). Processed goods, coffee, nuts, bags are 10% GST (`tax_rate = 0.10`).

---

## 4. Main Process (main.js)

This is the big one. ~5800 lines. Everything runs here.

### Startup sequence

1. Load sql.js WASM engine
2. Check if DB file exists on disk; if yes, load it; if no, create empty
3. Execute `db/schema.sql` statement by statement (idempotent via `CREATE IF NOT EXISTS` / `INSERT OR IGNORE`)
4. Run 47 ALTER TABLE migrations for column additions and data fixes
5. Run named migrations (GST compliance, label repair, subcategories, layout shifts, etc.)
6. Run `keyboard-catpages.js` and `keyboard-subpages.js` (version-gated)
7. Run price update migration
8. Run local images migration
9. `saveDBSync()` -- flush everything to disk
10. Create startup backup
11. Start daily backup timer (every 24 hours)
12. Create splash window (420x480, frameless, 2-second minimum display)
13. Create main window (1280x800, hidden until splash closes)
14. Register all IPC handlers
15. Start LAN sync if configured
16. Restore Linkly credentials if saved
17. Close splash, show main window, enter kiosk mode (production) or open DevTools (dev)

### Database helper functions

| Function | Line | Behaviour |
|---|---|---|
| `dbAll(sql, params)` | ~1122 | Execute query, return array of `{col: val}` objects |
| `dbGet(sql, params)` | ~1140 | Return first row or null |
| `dbRun(sql, params)` | ~1145 | Execute statement, call `scheduleSave()` |
| `saveDB()` | ~1063 | Async export to file via `fs.writeFile`. Guard against concurrent saves |
| `saveDBSync()` | ~1079 | Synchronous export via `fs.writeFileSync` |
| `scheduleSave()` | ~1115 | 3-second debounced call to `saveDB()` |
| `queueSync(table, id, action)` | ~5863 | Insert into `sync_queue` + bump LAN version |

### IPC handler categories

There are 100+ IPC handlers. They follow the naming pattern `domain:table:action`:

- **Products:** search, getByBarcode, getById, getByCategory, upsert, bulkUpsert, delete
- **Categories:** getAll, upsert, bulkUpsert
- **Specials:** getAll, upsert, delete, bulkUpsert
- **Deals:** getAll, getActive, upsert, delete, getProducts, setProducts, bulkUpsert
- **Transactions:** save, get, void, refund, getParked, getItems, getPayments, delete, search
- **Staff:** login, getAll, getWithPin, upsert, bulkUpsert
- **Settings:** get, getAll, set, bulkUpsert
- **Sync:** getPending, markSynced, getDeleted
- **Reports:** dailySummary, topProducts, salesByHour, salesByMethod, salesByCategory, voidRefundCount, zReport, weeklySummary
- **Insights:** salesHeatmap, demandForecast, boughtTogether, xeroExport, salesTrend
- **Keyboard:** getAll, getByPage, getPages, createPage, renamePage, updatePageSize, upsert, delete, deletePage, getAllIncludingInactive, bulkUpsert, copyPage, export, import, reset, validate
- **Cash Drawer:** log, getLog, summary, bulkUpsert
- **Stock:** lowStock, adjust
- **Backups:** create, list, restore, openFolder
- **Audit:** log, search
- **Hardware:** probe, diagnose, diagnostic, printReceipt, openDrawer, readScale, zeroScale, scaleDebug, getSerialPorts, testScale, testPrinter, testQueue, getQueues, oposCheck, oposListDevices, oposConfigure, oposTestPrinter/Drawer/Scale, configure, getConfig, scannerRestart, scannerTest
- **LAN:** getStatus, getPeers, sessionAction, testConnection, restart, discover, networkDiagnostic
- **Linkly:** getStatus, configure, pair, purchase, refund, cancel, settlement
- **Window:** exitFullscreen, quit, navigate, setMode, printHTML
- **App:** update, version, health, logs

### Backup system

- Copies DB file to `{userData}/backups/{prefix}-{timestamp}.sqlite`
- Keeps last 14 backups, auto-prunes older ones
- Triggers: startup ("startup"), daily timer ("daily"), before restore ("pre-restore"), manual ("auto")
- Restore: creates a "pre-restore" backup first, then overwrites the DB file. Requires app restart.

### App update mechanism

`app:update` handler:
1. Kills `scanner-bridge.exe` (Windows file lock prevents git overwrite)
2. Removes stale `.git/index.lock` if present
3. Runs `git stash && git pull origin main && git stash pop`
4. Falls back to downloading a zip from GitHub if git is unavailable
5. Relaunches app after 1.5 seconds

### Window management

- **Production mode:** fullscreen + kiosk after splash closes
- **Dev mode (`--dev` flag):** windowed + DevTools open
- **F11:** toggles kiosk + fullscreen
- **Escape:** exits kiosk
- **Splash screen:** 420x480, frameless, shows progress steps, minimum 2-second display
- **Customer display:** opens on external monitor if detected, uses `nodeIntegration: true` (not contextIsolation)
- **Single instance lock:** second instance focuses existing window

### Error handling

- `uncaughtException` handler catches serial port / hardware errors and continues running instead of crashing
- Non-hardware crashes: saves DB then crashes normally
- `before-quit`: clears save timer, flushes DB synchronously

---

## 5. IPC Bridge (preload.js)

~200 lines. Pure plumbing. Every method on `window.pos` maps to `ipcRenderer.invoke(channel, ...args)`. No data transformation except:

- Insight methods wrap scalar args into objects: `getSalesHeatmap(days)` sends `{ days }`
- `onLinklyStatus(cb)`, `onScaleWeight(cb)`, `onScannerData(cb)`, etc. use `ipcRenderer.on()` for main-to-renderer push events. Each removes all prior listeners before registering the new callback.

---

## 6. POS Register Screen (pos/index.html)

~4000 lines of inline JS. This is the cashier-facing register.

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Status Bar (store name, barcode input, staff, clock)│
├──────────┬──────────────────────────────────────────┤
│ Cart     │ Keyboard Grid                            │
│ Panel    │ (function keys, department buttons,       │
│ (items,  │  numpad, product buttons)                │
│  totals, │                                          │
│  pay)    │                                          │
├──────────┴──────────────────────────────────────────┤
│ Bottom Nav (category navigation buttons)            │
└─────────────────────────────────────────────────────┘
```

The cart panel can be embedded inside the keyboard grid (via a `cart_display` button type) or sit in the left sidebar. The DOM node is physically moved between positions.

### PIN Login

1. App starts with login overlay visible (unless session restored from localStorage)
2. Staff session persists in `localStorage.tillaroo_staff` -- survives app restart
3. PIN pad: 3x4 grid, max 6 digits, calls `window.pos.staffLogin(pin)`
4. LAN session check: if staff is logged in on another register, login is blocked
5. After login: float prompt overlay for entering opening cash float

### Barcode scanning

The `#searchInput` is an invisible input (`opacity: 0`, `width: 1px`) that always has focus. A global keydown handler redirects all typed characters to it. This means:

- Physical keyboard typing goes into the barcode field
- USB barcode scanners (which emulate keyboards) scan into it
- OPOS scanners send data via IPC (`scanner:data` event) and the handler processes it the same way

On Enter: looks up by barcode, then PLU, then product ID. UUIDs (32-36 hex chars) are treated as held-sale recall barcodes.

### Transaction flow

1. **Scan/tap product** -> `addToCart(product)`
2. If `unit` is `kg` or `100g`: weight modal opens (scale auto-read or manual entry)
3. If `unit` is `each` and same product already in cart: qty increments (merges)
4. `applyDeals()` runs after every cart change
5. **SUB TOTAL / F2** opens the payment modal
6. Cash: enter tendered amount, change calculated with Australian cash rounding (nearest 5c)
7. Card: routes through Linkly terminal if paired, otherwise manual card entry
8. Split: add partial card payment, then pay remainder in cash
9. On confirm: `saveTransaction()` saves to DB, prints receipt (if enabled), opens drawer (if cash), clears cart, shows 3-second completion animation

### Keyboard grid

- Per-page grid dimensions stored in DB (`keyboard_pages` table)
- Default: 13 columns x 7 rows on page 1
- Buttons have `grid_row`, `grid_col`, `col_span`, `row_span` for positioning
- Occupied cell tracking via `Set` and `cellMap` to skip multi-span cells
- Page navigation: `page_link` buttons push current page onto `posPageHistory` stack, `back_home` pops

### Section/product navigation

Section stack (`sectionStack`) manages drill-down browsing:
- `pushSection(title, renderFn)` adds to stack, shows product grid view
- `popSection()` goes back, `goHome()` clears stack
- Products grouped by first word of name -- single items render as buttons, multiple items render as group buttons that drill further

### State variables

Key ones to know:

| Variable | What it tracks |
|---|---|
| `currentStaff` | Logged-in staff `{id, name, role}` |
| `cart` | Cart class instance |
| `numBuf` | Numpad input buffer (string of digits) |
| `qtyMultiplier` | Next item quantity (default 1, set by QTY X) |
| `returnMode` | Boolean -- items added with negative qty |
| `supervisorMode` | Boolean -- elevated access for 60 seconds |
| `posCurrentPage` | Current keyboard page number |
| `posPageHistory` | Stack of previous pages for back navigation |
| `sectionStack` | Stack for product drill-down navigation |
| `pendingPayments` | Array of partial payments for split transactions |
| `liveScaleWeight` | Last reading from continuous scale stream |
| `autoReceipt` | Whether to auto-print receipts (persisted in localStorage) |

### Keyboard shortcuts

| Key | Action |
|---|---|
| F1 | Focus barcode input |
| F2 | Open payment modal |
| F3 | Card/EFTPOS payment |
| F4 | Void last item |
| F5 | Hold sale |
| F6 | Recall held sales |
| F7 | Price check |
| F8 | Return mode toggle |
| Escape | Close modals > go home > reset to page 1 |
| Backspace (not in input) | Pop section (go back) |

### Modals (20+)

The register has a lot of modals. Key ones:

| Modal | Trigger | Purpose |
|---|---|---|
| Login overlay | App start / lock | PIN entry |
| Float overlay | After login | Opening cash float |
| Cash/payment modal | SUB TOTAL / F2 | Cash, card, split payments |
| Weight modal | kg/100g product | Enter weight (scale or manual) |
| Open price modal | Open-price button | Enter price in cents |
| Weighed open modal | weighed_open button | Enter $/kg + scale weight |
| Recall modal | RECALL / F6 | Find and restore held sales |
| Discount menu | DISCOUNT button | % discount on sale/item/pick items |
| Return lookup | RETURN (empty cart) | Find receipt, select items to return |
| Terminal modal | Card payment (Linkly) | EFTPOS status/progress |
| End of day | EOD button | Cash denomination counting |
| Item search | SEARCH button | Touch-friendly product search |

---

## 7. Admin Panel (pos/admin.html)

~6800 lines. 16 tabs organized into 4 groups.

### Mode switching

Two modes: **Admin** (full access) and **Register** (restricted).

- Register mode hides sensitive tabs (dashboard, cash drawer, reports, audit, logs, settings, staff, keyboard, labels, stock, insights, diagnostics)
- Switching to Register: one click
- Switching to Admin: requires manager/admin PIN
- Mode persists in `localStorage` AND the `app_mode` DB setting
- URL param `?mode=register` takes precedence on startup

### Tab overview

**Dashboard:** Daily stats (sales, transactions, GST, discounts), hourly bar chart, payment methods, category breakdown, top products. Date picker with prev/next/today.

**Transaction Search:** Full search with date range, status filter, quick presets (today/week/month), autocomplete product search. Summary stats (total, avg, cash/card split). Detail modal with void/refund actions. CSV export.

**Cash Drawer:** Per-register drawer management. Float/pickup/drop/close actions. Daily summary with expected cash calculation.

**Reports:** Z Report (daily summary with payment methods, categories, hourly breakdown, drawer state) and Weekly Summary (7-day breakdown with stacked bar chart). Both printable as PDF.

**Products:** Search with category/unit/sort filters. Modal-based CRUD. Barcode duplicate warnings. Soft delete. Inline category management with family field and colour picker.

**Price Tags:** WYSIWYG label designer with Code128B barcode generation (pure JS, no library). Drag-to-reposition elements. Print queue with qty controls. A4 PDF output.

**Deals:** Tiered multi-buy pricing (e.g., 2 for $4, 3 for $5). Product picker with search. Date ranges. The config is stored as JSON in the DB.

**Stock:** Low stock alerts (qty <= 5) and full tracked-product list. Quick +/- adjust buttons.

**Staff:** Name, PIN (4-6 digits, plain text), role (cashier/manager/admin). Toggle active/inactive.

**Keyboard Layout Editor:** This is complex. See [Section 13](#13-keyboard-layout-system).

**Network (LAN):** Server/client mode selection, auto-discovery, manual IP connect, peer list with status, animated network topology diagram, full network diagnostics.

**Insights:** 30-day sales trend sparkline, 7x24 sales heatmap, day-of-week demand forecast, "bought together" product pairs, Xero CSV export.

**Audit Log:** Searchable by date and action type. Tracks voids, discounts, price changes, refunds, no-sale drawer opens.

**Logs:** Application log viewer with severity filter, search, export, clear. Health cards (last DB save, backup, uptime).

**Diagnostics:** 6-step diagnostic runner (database, hardware, network, keyboard, settings, IPC). Runtime error capture.

**Settings:** Store details, tax config, receipt header/footer, company logo upload, Supabase cloud sync, backups, fullscreen toggle, software update (git pull).

---

## 8. Cart System (pos/js/cart.js)

107 lines. Clean ES module.

### Adding items

```js
cart.addProduct(product, qty, silent)
```

- Resolves price: `product.active_price ?? product.price`
- Merge logic: if same `product_id`, unit is `each`, AND `unit_price` matches -> increments existing qty
- Otherwise creates new line item

### Item structure

```js
{
  product_id, name, qty, unit, unit_price, tax_rate,
  discount: 0, line_total: 0, tax: 0,
  is_special, deal_id: null, deal_name: null,
  category_id, image_url, category_color
}
```

### Tax calculation (`_recalcItem`)

```
gross = qty * unit_price
line_total = max(0, gross - discount)     // positive (normal)
line_total = min(0, gross + discount)     // negative (returns)
tax = line_total * tax_rate / (1 + tax_rate)  // extract inclusive GST
```

### Computed properties

- `subtotal` = sum of all `line_total`
- `tax` = sum of all `tax`
- `total` = `subtotal` (tax is inclusive, so total equals subtotal)
- `count` = sum of all `qty` (can be fractional for kg items)
- `discount` = sum of all `discount`

### `toTransaction(staffId, payments)`

Returns `{ staff_id, subtotal, tax, discount, total, status: 'completed', items: [...], payments }`. Does NOT include `id`, `register_id`, or `created_at` -- those are added by the main process.

### What the Cart does NOT do

- Does not apply deals (that's done externally by `applyDeals()` in index.html)
- Does not persist itself (localStorage persistence is done by index.html's `saveCartLocal()`)
- Does not know about the database

---

## 9. Supabase Cloud Sync (pos/js/sync.js)

468 lines. Bidirectional sync between local SQLite and Supabase Postgres.

### Push flow (`pushPending()`)

Reads `sync_queue` where `synced=0`. For each record:
- **Transactions:** upserts transaction + items + payments (3 Supabase calls each)
- **Staff:** strips `pin` field before pushing (security)
- **Settings:** uses `key` as PK instead of `id`
- **Everything else:** generic upsert/delete by `id`

### Pull flow (`pullAll()`)

1. Pushes pending first (local changes win)
2. Pulls all 9 tables using `?since=` timestamp for delta sync
3. **Keyboard pull always fetches ALL buttons** (ignores since -- "small dataset")
4. Filters out locally-deleted records via `deleted_records` table
5. Updates `supabase_last_pull` timestamp

### Realtime subscriptions

Single Supabase channel subscribed to postgres_changes on 7 tables (products, categories, specials, keyboard_buttons, staff, deals, settings). Applies changes locally as they arrive.

### Auto-sync

30-second interval: pushes pending, then pulls all.

---

## 10. LAN Multi-Register Sync (lan-sync.js)

1418 lines. Zero external dependencies (just Node.js `http` and `dgram`).

### Architecture

- One register is the **server** (source of truth for master data)
- Other registers are **clients** (read-only for products/categories/staff/keyboard, push transactions back)
- Clients own their transactions -- push to server, server doesn't push transactions to clients

### Server mode

HTTP server on port 5555 with routes:
- `GET /api/version` -- lightweight version check (integer counter)
- `GET /api/full-sync` -- all tables in one response
- `GET /api/products`, `/categories`, `/specials`, etc. -- per-table with `?since=` filter
- `POST /api/transactions` -- receive transactions from clients
- `POST /api/session` -- login/logout enforcement across lanes

All routes except `/api/heartbeat` require `X-POS-Secret` header.

### Client mode

3-second sync interval:
1. **Version check** -- GET `/api/version`. If unchanged and nothing pending, skip entire cycle (key optimization)
2. **Push transactions** -- POST unsent transactions from `sync_queue`
3. **Pull master data** -- fetch all 9 endpoints in parallel with `?since=` for incremental updates

### Version/change detection

- Server maintains `dataVersion` counter, bumped by `bumpVersion()` on any data change
- Client tracks `lastKnownVersion`, compares on each cycle
- If version unchanged and no pending pushes -> skip the pull entirely

### Session enforcement

Prevents same staff logging into multiple registers simultaneously:
- Server tracks `activeSessions` map (staffId -> registerId)
- On login attempt: checks if staff is already on a different register
- **Fail-open design**: network failure = allow login (to avoid locking out cashiers)

### UDP discovery

- Server broadcasts `{service: 'crisp-pos', ip, port}` to `255.255.255.255:5556` every 5 seconds
- Clients listen on port 5556 for broadcasts
- Also does active subnet scan (probes all 254 IPs) as fallback

### Settings sync

Preserves local-only keys that should not be overwritten from server: `lan_mode`, `lan_server_ip`, `lan_port`, `lan_secret`, `register_id`, `app_mode`, `lan_autostart`.

---

## 11. Linkly EFTPOS Integration (linkly.js)

364 lines. Connects to Linkly Cloud REST API for Australian EFTPOS terminal communication.

### Pairing

1. Get a one-time pair code from the physical terminal
2. Call `pair(username, password, pairCode)` -> POST to `/v1/pairing/cloudpos`
3. Returns a `secret` (long-lived credential for all future sessions)

### Purchase flow

1. `ensureSession()` -- authenticates if no valid token (POST `/v1/sessions`, token valid ~58 minutes)
2. `purchase(amountCents, txnRef)` -- POST to `/v1/sessions/{id}/transaction` with `txnType: 'P'`
3. Poll every 1.5 seconds via GET on the transaction endpoint
4. When `poll.response` exists: extract success/failure, card type, bank ref, receipt lines
5. 2-minute timeout

### Refund flow

Same as purchase but `txnType: 'R'`.

### Cancel

Sets `state.polling = false` (breaks the polling loop) and sends cancel key to terminal.

### Settlement

POST to `/v1/sessions/{id}/settlement` -- end-of-day EFTPOS settlement.

### Error handling

- 30s timeout per HTTP request, 2 minutes per payment flow
- Auth failures: transparently re-authenticates
- Cancel/settlement: errors silently swallowed (return null)

---

## 12. Hardware Integration

All hardware code lives in main.js (lines ~3100-5600).

### Receipt Printer

**Detection:** USB VID matching (Epson 0x04b8, Star 0x0416, Seiko 0x0519, Bixolon 0x0dd4, etc.), Windows print queue scanning via `Get-Printer` (cached 30 seconds because it's slow).

**Print backends (in priority order):**
1. **OPOS** via `opos-bridge.ps1` (32-bit PowerShell for COM objects)
2. **Windows spooler** via `rawprint.ps1` (async spawn, 15s timeout)
3. **TCP/IP** for network printers
4. **CUPS** (`lp -o raw`) on macOS/Linux

**Queue management:** Auto-resume stuck queues via WMI, clear stuck jobs, cleanup duplicate queues.

### Cash Drawer

Opened via OPOS CashDrawer COM object first, falls back to ESC/POS drawer kick command (pin 2, 25ms on, 120ms off) sent through the printer port.

### Barcode Scanner

**OPOS Scanner** uses `scanner-bridge.exe` -- a dedicated 32-bit STA console app because PowerShell's MTA host silently swallowed COM events. It outputs JSON lines via stdout:

```json
{"event": "scan", "data": "9310015241413"}
{"event": "heartbeat", "uptime": 120}
```

Auto-retry with exponential backoff (up to 3 retries, max 60s delay). Fatal stop when OPOS ProgID is not registered.

Most barcode scanners work in HID keyboard mode (no special driver needed) -- the scan data just appears as keystrokes in the hidden barcode input field.

### Scale

Three communication methods:

1. **USB HID scales** -- direct reading via `node-hid`. Auto-close after 10s idle.
2. **Serial RS-232 (MT-SICS protocol)** -- 8-N-1, commands `S\r\n` (stable) and `SI\r\n` (immediate)
3. **Serial RS-232 (MT 8217 protocol)** -- 7-E-1, binary frames (STX+data+CR), BCD weight encoding

**Python bridge:** `scale_reader.py` spawned for MT 8217 scales. Uses `PYTHONUNBUFFERED=1` env var to prevent pipe buffering (without this, JSON lines are held until 4KB buffer fills and the bridge appears silent).

**Detection:** Brute-force tests all serial ports with all protocol/baud combinations (sics@9600, mt8217@9600, sics@19200, etc.).

**Polling:** 500ms interval when active. Broadcasts weight changes to renderer via `scale:weight` IPC event. Slows to 5s after 10 consecutive errors.

---

## 13. Keyboard Layout System

The POS keyboard is a fully configurable grid stored in the database.

### Data model

Each button has: `page`, `grid_row`, `grid_col`, `col_span`, `row_span`, `type`, `label`, `price`, `image`, `bg_color`, `color`, `parent_id`, `category_filter`, `alpha_range`, `product_id`.

Pages have: `page` (integer), `name`, `cols`, `rows`.

### Button types

**Product buttons:**
- `open_price` -- cashier enters price
- `fixed_price` -- set amount, adds directly
- `weighed_open` -- cashier enters $/kg, uses scale for weight
- `product` -- linked to a product record, uses its price
- `section` -- opens category product grid

**Register functions:**
`void`, `return`, `hold`, `recall`, `nosale`, `lock`, `supervisor`, `reprint`, `pricecheck`, `errcorrect`, `pctdiscount`, `pctone`, `discount`, `movedrawer`, `ubereats`, `endofday`, `product_lookup`, `item_search`

**Numpad:**
`digit` (0-9, 00), `clear`, `qtyx` (quantity multiplier), `codeenter` (PLU lookup), `num_display` (LED readout cell)

**Navigation:**
`page_link` (go to page), `back_home` (return to previous page), `nav` (filtered category navigation), `subtotal`

**Payment:**
`pay_cash`, `pay_card`, `park`

**Special:**
`cart_display` -- the cart panel is physically DOM-moved into this grid position

### Keyboard editor (admin.html)

The editor is the most complex part of the admin panel:

- **CSS Grid rendering** with occupied cell tracking
- **Three drag mechanisms:**
  1. Single button drag-and-drop (swap or move)
  2. Multi-button drag (Ctrl+Click to select multiple, drag moves all)
  3. Drag-select empty cells (creates new button with auto-sized span)
- **Product sidebar:** search products, click to select, then click empty cell to place
- **Auto-fill:** reflow buttons into clean grid slots
- **A-Z sort:** alphabetically sort buttons while keeping positions
- **Page tree:** hierarchical view showing page_link relationships
- **Undo:** Ctrl+Z with 30-snapshot stack (page-scoped)
- **Export/Import:** JSON download/upload of entire layout
- **Validate:** checks for overlaps, out-of-bounds, broken page_link targets

### Keyboard layout generation scripts

`keyboard-catpages.js` generates pages 2-5 (Fruit A-M, Fruit N-Z, Veg A-G, Veg H-Z). All buttons are 2x2 cells with product images. Version-gated by `kb_catpages_ver` setting.

`keyboard-subpages.js` generates pages 7-36 (variety subpages like Apples, Bananas, Potatoes, etc.). Same 2x2 cell pattern. Version-gated by `kb_subpages_ver`. Deletes ALL buttons where page > 5 before inserting (nuclear approach).

### Save mechanism

Keyboard operations use `saveDBSync()` (immediate synchronous write) instead of the normal `scheduleSave()` (3-second debounce). This was changed because the debounced save could be lost if the app was closed before it fired.

---

## 14. Deal / Discount Engine

### Deal types in the database

The `deals.type` field supports: `multi_buy`, `buy_x_get_y`, `combo`, `discount_pct`, `discount_amt`. But in practice, the UI only creates `multi_buy` deals with tiered pricing.

### Deal config format

```json
{
  "tiers": [
    {"qty": 2, "price": 4.00},
    {"qty": 3, "price": 5.00}
  ]
}
```

Or legacy single-tier: `{"qty": 2, "price": 4.00}`

### Auto-application (`applyDeals()` in index.html)

Runs after every cart change:
1. Clear all deal discounts from all items
2. For each active deal: find matching cart items by `product_id`
3. Greedy tier assignment: highest tier first, then lower tiers, remainder at unit price
4. Calculate savings = (full price at unit_price) - (tiered price)
5. If positive savings, apply as item discount

### Manual discounts

- **Quick discount:** type a number on numpad, press discount button -> applies that % without modal
- **Discount menu modal:** choose target (whole order / last item / pick items), preset buttons (5/10/15/20/25/50%), custom numpad entry, live savings preview

---

## 15. Receipt Printing

### ESC/POS receipt format

42-column thermal printer format, built by `buildReceiptBuffer()` in main.js (~line 4373).

Receipt structure:
1. Company logo (if configured, printed as image)
2. "WELCOME TO" + store name (centered, double size)
3. "TAX INVOICE" (centered)
4. Store address, phone, ABN
5. Divider line
6. Receipt header text (from settings)
7. GST/discount indicator legend (e.g., "* = GST Included, D = Discounted")
8. Items with markers (* for GST, D for discount), right-aligned prices
9. Divider line
10. "Total (N Items)" with total price
11. Tax extracted line
12. Payment method and amount
13. Change line (if cash)
14. EFTPOS receipt passthrough lines (from Linkly terminal)
15. Divider line
16. Receipt footer text
17. `Served by [Role] [Name] Lane #XX`
18. Receipt number
19. Barcode (Code128) of receipt number
20. Paper cut command

### Print flow

1. Renderer calls `window.pos.printReceipt(data)`
2. Main process calls `buildReceiptBuffer(data)` to create ESC/POS byte buffer
3. Routes to printer backend: OPOS -> spooler -> TCP -> CUPS
4. `rawprint.ps1` sends raw bytes to Windows print spooler

---

## 16. Migration System

Migrations ensure existing databases get schema updates without losing data. They run on every app startup but are idempotent.

### Types of migrations

1. **ALTER TABLE array** (~line 121): 47 statements for adding columns. Errors silently caught (column already exists).

2. **Named migrations** (checked via settings keys):
   - `gst_compliance_done` -- sets correct tax rates per category
   - `label_repair_done` -- fixes labels mangled by previous migration
   - `fruit_veg_subcats_done` -- creates 30 subcategories
   - `layout_v3_shift_done` -- shifts page 1 buttons right for in-grid cart
   - `nav_btn_fix_done` -- fixes bottom nav button types
   - `v4_layout_restore_done` / `v5_layout_fix_done` -- nuclear keyboard resets (delete all + re-insert from schema)
   - `rebrand_tillaroo_done` -- updates store name and branding
   - `company_logo_done` -- reads logo file, stores as base64
   - `link_kb_products_done` -- creates product records for keyboard buttons
   - `btn_colors_done` -- applies semantic color coding
   - `migration_prices_may2026_v1` -- comprehensive price/unit update for 80+ products
   - `migration_local_images_v1` -- replaces external image URLs with local paths

3. **Version-gated scripts**:
   - `kb_catpages_ver` gates `keyboard-catpages.js`
   - `kb_subpages_ver` gates `keyboard-subpages.js`

### How to add a new migration

1. Pick a unique settings key (e.g., `migration_your_thing_v1`)
2. Add a `try/catch` block after the existing migrations in `initDatabase()`
3. Check if already done: `dbAll("SELECT value FROM settings WHERE key = 'migration_your_thing_v1'")`
4. Do your work
5. Mark done: `db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_your_thing_v1', '1')")`

---

## 17. Gotchas, Workarounds & Weird Code

### The big ones

1. **sql.js, not better-sqlite3.** better-sqlite3 requires native compilation and fails on Node v25.9.0 when the project path has spaces. sql.js uses WASM and works everywhere but means the entire DB lives in memory.

2. **3-second save debounce can lose data on crash.** `scheduleSave()` waits 3 seconds before flushing to disk. If the process is killed in that window, writes are lost. Keyboard operations use `saveDBSync()` to avoid this, but regular product/transaction writes still use the debounce.

3. **`before-quit` only fires on clean exit.** If the process is force-killed (Task Manager, power loss), the handler doesn't fire and unsaved data is lost.

4. **Staff PINs are stored in plain text.** The `staff.pin` column is unencrypted. The sync engine strips PINs before pushing to Supabase, but they're plain text in the local SQLite file.

5. **Receipt number is a string counter, not a sequence.** Stored in `settings` as a string, manually incremented. Race conditions possible under concurrent saves (unlikely in single-register but possible with LAN sync).

6. **Customer display uses `nodeIntegration: true`.** Unlike the main window which uses contextIsolation, the customer display has full Node.js access. This is a security concern if it ever loads untrusted content.

### Non-obvious behaviours

7. **`movedrawer` button = logout.** Despite its name from the original Profit Track register, this button logs the user out, opens the drawer, and resets all modes. It's the end-of-shift action.

8. **CLEAR button also exits return mode.** Pressing the numpad CLEAR button clears the numpad buffer AND disables return mode. This is non-obvious.

9. **Barcode lookup also matches product ID.** `getProductByBarcode` matches on `barcode`, `plu`, OR `id`. This means a UUID scan can return a product directly.

10. **Search limit changes with query length.** Queries shorter than 2 chars get limit 200, otherwise 50.

11. **Cart DOM physically moves.** The cart panel is removed from one parent and appended to another when switching between pages with/without a `cart_display` button. This preserves event listeners but is unusual.

12. **32-bit PowerShell for OPOS.** OPOS COM objects (Epson, Datalogic) are 32-bit. On 64-bit Windows, the code explicitly uses `SysWOW64\WindowsPowerShell` to get 32-bit PowerShell. Without this, COM calls fail silently.

13. **scanner-bridge.exe exists because PowerShell couldn't.** PowerShell's MTA host silently swallowed COM events from the OPOS scanner. ComEventsHelper failed with CONNECT_E_NOCONNECTION. A standalone 32-bit STA console app was the only reliable solution.

14. **Python `PYTHONUNBUFFERED=1` is critical.** Without it, Python's pipe buffering holds JSON lines until 4KB fills, making the scale bridge appear completely silent for minutes.

15. **Nuclear keyboard migrations.** V4 and V5 layout migrations delete ALL keyboard buttons on pages 1-5 and 7+ then re-insert from schema.sql. This was a heavy-handed fix for layout corruption.

16. **`deleted_records` prevents zombie data.** When an item is deleted locally, its ID is recorded in `deleted_records`. This prevents sync (Supabase or LAN) from resurrecting it. Without this table, deleted items would reappear on the next pull.

17. **Printer queue listing is cached 30 seconds.** `Get-Printer` PowerShell cmdlet can take 10+ seconds. Without caching, every receipt print would freeze the app.

18. **Dual clock functions.** There are two `updateClock()` functions at different scopes in index.html. The outer one updates the footer clock every 1 second. The inner one (inside `init()`) updates the status bar clock every 15 seconds. They target different elements.

19. **`stock:adjust` accepts a `reason` parameter but never stores it.** The parameter is received but not written anywhere.

20. **Scale detection is brute-force.** To find a scale, the app tests every serial port with every protocol and baud rate combination. This can take 30+ seconds.

---

## 18. Known Issues

These were identified in a code audit and have NOT been fixed:

1. **`scale_reader.py` doesn't exist** -- referenced in package.json build files but not present. Scale Python bridge won't work.

2. **`scanner-bridge.exe` doesn't exist in the repo** -- referenced in build files. Must be compiled separately and placed in the project root.

3. **`opos-bridge.ps1` doesn't exist** -- referenced in build files. OPOS device integration won't work without it.

4. **`rawprint.ps1` doesn't exist** -- ESC/POS printing falls back to other methods but Windows spooler printing silently fails.

5. **Crash data loss** -- if the app crashes (not clean exit), up to 3 seconds of writes can be lost.

6. **Receipt printer no-retry** -- if the printer drops mid-print, the transaction is already saved. User gets no receipt with no retry option.

7. **`viewor` button type has no handler** -- it's defined but does nothing when pressed.

---

*Last updated: 2026-05-19*
