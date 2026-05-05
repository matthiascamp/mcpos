# POS Deep Improvement Plan

## Current Structure Summary

| File | Lines | Role |
|---|---|---|
| `main.js` | ~1166 | Electron main process, all IPC handlers, DB init, migrations, hardware, receipt, customer display, LAN sync |
| `preload.js` | 100 | contextBridge API (~50 methods as `window.pos.*`) |
| `db/schema.sql` | ~431 | Full SQLite schema + seed data (13 tables, 148 keyboard buttons) |
| `pos/index.html` | ~2065 | POS register screen (HTML + CSS + JS, monolithic) |
| `pos/admin.html` | ~3050 | Admin panel (12 tabs, keyboard editor, dark theme) |
| `pos/js/cart.js` | 102 | Cart class (items, totals, tax calc) |
| `pos/js/ui.js` | 50 | Shared utilities (esc, $, money, showToast, debounce) |
| `pos/js/sync.js` | 132 | Supabase cloud sync engine |
| `pos/customer.html` | 153 | Customer-facing display (3 states) |
| `lan-sync.js` | 635 | LAN multi-register sync (HTTP + UDP) |
| `rawprint.ps1` | 75 | PowerShell ESC/POS raw printer bridge |

**Architecture:** Single-process Electron app. All business logic in main.js IPC handlers. Renderer is vanilla JS in monolithic HTML files. No build step, no framework.

**Database:** sql.js (WASM SQLite), debounced 1-second save to disk. UUID PKs. Tax-inclusive pricing (AU GST).

**Keyboard:** 6 seeded pages (Main 10x7, Fruit A-M, Fruit N-Z, Veg A-G, Veg H-Z, Grocery). Grid editor in admin with drag-drop, drag-select, product sidebar. Navigation via `page_link` (parent_id = target page) and `back_home`.

---

## Implementation Order (Safest First)

### Priority 1: Keyboard Page-Link Tree & Grid Editor Polish
**Risk:** Medium — touches core register workflow
**Why first:** Most user-visible, highest daily-use impact

**Changes:**
- **DB:** Add `page_name` column to `keyboard_buttons` or new `keyboard_pages` table (cleaner). Add `target_page` column to buttons (replace overloaded `parent_id` for page_link).
- **UI (admin.html):** Page rename inline, page reorder drag, copy-page, page-link button shows target page name in dropdown instead of raw number. Grid cell size labels. Snap-to-grid validation on save.
- **UI (index.html):** Page-link navigation uses page names for breadcrumb trail. Back button shows "← Main" instead of generic back.
- **Files:** `db/schema.sql`, `main.js` (migration + IPC), `pos/admin.html` (keyboard tab), `pos/index.html` (navigation)

**Testing:**
- [ ] Create new page, rename it, add buttons, link from main page
- [ ] Navigate page_link on register, verify back_home returns correctly
- [ ] Delete page with buttons — confirm prompt, buttons removed
- [ ] Existing 6-page layout unchanged after migration

### Priority 2: Keyboard Export/Import/Reset/Validation
**Risk:** Low — additive feature, no existing behavior changed
**Changes:**
- **IPC:** `db:keyboard:export` (dump all buttons as JSON), `db:keyboard:import` (validate + replace), `db:keyboard:reset` (re-run seed SQL)
- **UI (admin.html):** Export button (downloads JSON), Import button (file picker + validation), Reset to Default (confirm dialog)
- **Validation:** Check for overlapping buttons, out-of-grid buttons, orphan page_links
- **Files:** `main.js`, `preload.js`, `pos/admin.html`

**Testing:**
- [ ] Export → import round-trip preserves layout
- [ ] Import invalid JSON shows error
- [ ] Reset restores seed layout
- [ ] Overlapping buttons flagged

### Priority 3: Backups & Error Logs
**Risk:** Low — new functionality, no existing code modified
**Changes:**
- **DB backup:** On app start, copy DB file to `backups/` with timestamp. Keep last 10. Manual backup button in admin Settings.
- **Error log:** `electron-log` or simple file logger. Catch unhandled errors in main + renderer. Log to `logs/crisp-pos.log`. View in admin (new Log Viewer tab or section in Settings).
- **Files:** `main.js` (backup on init, error handler), `preload.js` (new IPC), `pos/admin.html` (settings section)

**Testing:**
- [ ] App start creates backup file
- [ ] Old backups pruned after 10
- [ ] JS error in renderer appears in log file
- [ ] Manual backup button works

### Priority 4: Staff Permissions & Audit Log
**Risk:** Medium — affects auth flow
**Changes:**
- **DB:** `audit_log` table (id, staff_id, action, detail, created_at). Add permission checks based on role.
- **Permissions matrix:** cashier (sale, park, recall), manager (+void, +refund, +discount, +price change), admin (+all)
- **Audit:** Log void, refund, discount, price change, no-sale, settings change
- **PIN hashing:** bcrypt or scrypt for stored PINs (migration hashes existing plain PINs)
- **Files:** `db/schema.sql`, `main.js` (audit IPC, permission checks, PIN hashing), `preload.js`, `pos/index.html` (permission gates), `pos/admin.html` (audit log viewer)

**Testing:**
- [ ] Cashier cannot void — gets "requires manager" prompt
- [ ] Manager PIN unlocks void for that action
- [ ] Audit log records all sensitive actions
- [ ] Existing plain PINs migrated to hashed on first run

### Priority 5: Product Data & Search
**Risk:** Low
**Changes:**
- **DB:** Add `department` TEXT, `supplier` TEXT, `margin` REAL (computed or stored) columns to products
- **Search:** Fuzzy search (LIKE with wildcards between chars), search by category filter, sort options
- **Admin:** Product list pagination (50 per page), bulk edit (select multiple → change category/price), barcode duplicate warning on save
- **Files:** `db/schema.sql`, `main.js`, `pos/admin.html`, `pos/index.html` (search dropdown)

**Testing:**
- [ ] Search "bnn" finds "Banana"
- [ ] Duplicate barcode shows warning
- [ ] Bulk category change works

### Priority 6: Register Status Bar
**Risk:** Low — UI only
**Changes:**
- **Status bar:** Live clock, printer status dot (poll every 30s), drawer status, LAN sync status with peer count, last transaction time
- **Connection loss:** Offline banner when LAN sync disconnects
- **Files:** `pos/index.html`

**Testing:**
- [ ] Clock updates every second
- [ ] Printer dot goes red when printer disconnected
- [ ] LAN peer count matches connected registers

### Priority 7: Hardware Readiness Layer
**Risk:** Medium — OS-dependent
**Changes:**
- **Printer:** Auto-detect on startup, reconnect on failure, test print button
- **Cash drawer:** Open command with retry, status feedback
- **Scale:** Serial port reading for weight (CAS/Ohaus protocol), auto-populate weight modal
- **Scanner:** Keyboard wedge mode already works; add serial mode option
- **Files:** `main.js` (hardware module), `pos/admin.html` (hardware tab enhancements)

**Testing:**
- [ ] Receipt prints on detected printer
- [ ] Drawer opens reliably
- [ ] Scale weight appears in weight modal (if scale connected)

### Priority 8: Stock / Label / Scanner Foundations
**Risk:** Low
**Changes:**
- **Stock:** Low stock alerts on dashboard, stock adjustment log (who, when, qty, reason), stock take mode (count → adjust)
- **Labels:** Generate barcode label data (product name, barcode, price) — export as CSV for label printer software
- **Files:** `db/schema.sql` (stock_adjustments table), `main.js`, `preload.js`, `pos/admin.html`

**Testing:**
- [ ] Low stock shows on dashboard
- [ ] Stock adjustment logged with staff ID
- [ ] Label export generates valid CSV

### Priority 9: Deals Polish
**Risk:** Low
**Changes:**
- **Auto-apply:** Deals checked on every cart change, badge shown on qualifying items
- **Stacking rules:** Only best deal applies per item (no double-dipping)
- **Admin:** Deal preview (show example cart), copy deal button
- **Files:** `pos/index.html` (deal engine), `pos/admin.html` (deal editor)

**Testing:**
- [ ] Multi-buy deal applies at correct qty
- [ ] Two deals on same product — only best one applies
- [ ] Deal badge shows on cart items

### Priority 10: Reports & Cash-Up Polish
**Risk:** Low
**Changes:**
- **Date range:** Reports support date range picker, not just single day
- **Z Report:** End-of-day summary with cash counted vs expected, variance
- **Export:** CSV export for all report types
- **Charts:** Simple bar/line charts using canvas (no library)
- **Files:** `main.js` (report queries), `pos/admin.html` (reports tabs)

**Testing:**
- [ ] Date range query returns correct totals
- [ ] Z Report variance calculation correct
- [ ] CSV export opens in Excel

### Priority 11: Customer Display Controls
**Risk:** Low
**Changes:**
- **Admin control:** Toggle customer display on/off, customize welcome message, store logo
- **Display:** Show item as it's scanned (slide-in animation), running total prominent
- **Idle:** Rotating messages / specials display
- **Files:** `pos/customer.html`, `main.js` (IPC), `pos/admin.html` (settings)

**Testing:**
- [ ] Customer display opens/closes from admin
- [ ] Items appear as scanned
- [ ] Custom welcome message shows

### Priority 12: Documentation
**Risk:** None
- Create `POS_IMPROVEMENTS_COMPLETED.md` listing all changes with before/after

---

## Database Changes Required

```sql
-- Priority 1: Keyboard pages table
CREATE TABLE IF NOT EXISTS keyboard_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  sort_order INTEGER DEFAULT 0,
  grid_cols INTEGER DEFAULT 10,
  grid_rows INTEGER DEFAULT 7
);

-- Priority 3: Error/audit logging
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  staff_id TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Priority 5: Product extensions
ALTER TABLE products ADD COLUMN department TEXT;
ALTER TABLE products ADD COLUMN supplier TEXT;

-- Priority 8: Stock adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  staff_id TEXT,
  qty_change REAL NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## UI Changes Required

| Area | Change | Priority |
|---|---|---|
| Admin Keyboard Tab | Page name editing, page reorder, copy page, target page dropdown for page_link | 1 |
| Admin Keyboard Tab | Export/Import/Reset buttons, validation warnings | 2 |
| Admin Settings | Backup section, log viewer | 3 |
| Admin new tab | Audit Log viewer with filters | 4 |
| Register index.html | Breadcrumb nav for page links, permission gates | 1, 4 |
| Admin Products | Pagination, bulk edit, duplicate barcode warning | 5 |
| Register status bar | Live clock, hardware status dots, LAN peer count | 6 |
| Admin Hardware | Auto-detect on load, test buttons, scale config | 7 |
| Admin Dashboard | Low stock alerts, stock adjustment log | 8 |
| Admin Deals | Deal preview, copy button, stacking indicator | 9 |
| Admin Reports | Date range picker, CSV export, charts | 10 |
| Customer Display | Admin toggle, custom messages, idle specials | 11 |

---

## Files Likely to Change

| File | Priorities | Nature of Changes |
|---|---|---|
| `db/schema.sql` | 1,3,4,5,8 | New tables, new columns, new seeds |
| `main.js` | ALL | New IPC handlers, migrations, backup logic, permission checks |
| `preload.js` | 1,2,3,4,5,8 | New bridge methods |
| `pos/admin.html` | ALL | New UI sections, editor improvements |
| `pos/index.html` | 1,4,6,9 | Navigation, permissions, status bar, deals |
| `pos/customer.html` | 11 | Display enhancements |
| `pos/js/cart.js` | 9 | Deal auto-application |
| `pos/js/ui.js` | — | May add shared utilities |

---

## Smoke Test Checklist

1. App starts without errors
2. PIN login works (existing PINs)
3. Barcode scan adds product to cart
4. Open price entry works
5. Weight entry works for kg products
6. QTY X multiplier works
7. Void removes last item
8. Hold/Recall sale round-trip
9. Cash payment with change calculation
10. Card payment completes sale
11. Receipt prints (if printer connected)
12. Cash drawer opens on sale
13. Return workflow (lookup + negative items)
14. Discount % on whole sale
15. Discount % on single item
16. Keyboard page navigation (all 6 pages)
17. Back button returns to main
18. Admin panel loads all tabs
19. Product CRUD in admin
20. Staff CRUD in admin
21. Deal CRUD in admin
22. Keyboard editor: add/edit/delete button
23. Keyboard editor: drag-drop move
24. Keyboard editor: drag-select multi-span
25. Keyboard editor: page add/delete/rename
26. Settings save and persist
27. Hardware probe detects devices
28. Customer display shows items
29. LAN sync connects (if configured)
30. App exits cleanly (F11/Escape/quit)
