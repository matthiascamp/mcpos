# POS Improvements Completed

## Priority 1: Keyboard Page-Link Tree & Grid Editor Polish

### Target Page Dropdown for Page Links
- **Admin keyboard editor** now shows a "Target Page" dropdown when creating/editing a `page_link` button
- Dropdown lists all existing pages by name (e.g., "Fruit A-M (2)") instead of requiring manual `parent_id` entry
- `parent_id` is correctly saved/loaded when editing page_link buttons
- Grid cells for page_link buttons now show an arrow indicator with the target page name (e.g., "-> Fruit A-M")

### Page History Navigation on Register
- Navigating via `page_link` or page tabs now pushes current page to a history stack
- `back_home` buttons navigate back through history instead of always going to page 1
- Escape key returns to page 1 from any page (when no modals or sections are open)

### Copy Page
- New "Copy Page" button in admin keyboard editor toolbar
- Duplicates all buttons from current page to a new page with "(copy)" suffix in name

### Files Changed
- `main.js` — Added `db:keyboard:copyPage` IPC handler
- `preload.js` — Added `copyPage` bridge method
- `pos/admin.html` — Target page dropdown, copy page button, page-link indicator in grid cells
- `pos/index.html` — Page history stack, breadcrumb navigation, Escape to home page

---

## Priority 2: Keyboard Export/Import/Reset/Validation

### Export
- "Export" button downloads the full keyboard layout as a JSON file
- Includes all buttons, grid dimensions, and page names
- Filename includes date (e.g., `keyboard-layout-2026-05-05.json`)

### Import
- "Import" button opens file picker for JSON layout files
- Validates the file structure before importing
- Confirmation dialog shows button count before replacing
- Replaces all existing buttons and restores grid settings

### Reset to Default
- "Reset" button restores the factory seed layout from `db/schema.sql`
- Double-confirmation to prevent accidental data loss
- Clears custom grid dimensions and page names

### Validate
- "Validate" button checks for:
  - Overlapping buttons on any page
  - Broken page_link references (pointing to non-existent pages)
- Shows issue details in alert, or success toast if clean

### Files Changed
- `main.js` — Added `export`, `import`, `reset`, `validate` IPC handlers
- `preload.js` — Added corresponding bridge methods
- `pos/admin.html` — Export/Import/Reset/Validate toolbar buttons with handlers

---

## Priority 3: Database Backups

### Auto-Backup on Startup
- Every app launch creates a timestamped backup in `{userData}/backups/`
- Backup files named `startup-YYYY-MM-DDTHH-MM-SS.sqlite`
- Automatic pruning keeps only the last 10 backups

### Manual Backup
- "Create Backup Now" button in admin Settings tab
- Creates immediate backup with `auto-` prefix
- Shows backup list with file name, size, and creation date

### Restore from Backup
- "Restore" button next to each backup entry
- Creates a safety backup (`pre-restore-*`) before overwriting
- Prompts for restart after restore

### Files Changed
- `main.js` — `createBackup()` function, startup auto-backup, `db:backup:create/list/restore` IPC handlers
- `preload.js` — `createBackup`, `listBackups`, `restoreBackup` bridge methods
- `pos/admin.html` — Backup section in Settings tab with list and restore buttons

---

## Priority 4: Audit Log

### Audit Table
- New `audit_log` table: id, staff_id, staff_name, action, detail, created_at
- Indexed by `created_at` for fast date-based queries

### Tracked Actions
| Action | Trigger |
|---|---|
| `void_item` | Void or Error Correct button removes item from cart |
| `no_sale` | No Sale button opens drawer without a transaction |
| `discount_sale` | % Discount applied to whole sale (quick or modal) |
| `discount_item` | % Discount applied to single item (quick or modal) |

### Admin Audit Log Tab
- New "Audit Log" tab in admin sidebar (between Import and Settings)
- Date picker and action type filter
- "Today" quick button
- Table view: Time, Staff, Action (color-coded badge), Detail

### Files Changed
- `db/schema.sql` — `audit_log` table with index
- `main.js` — `db:audit:log` and `db:audit:search` IPC handlers
- `preload.js` — `logAudit`, `searchAudit` bridge methods
- `pos/index.html` — Audit logging calls on void, no-sale, discount actions
- `pos/admin.html` — Audit Log tab with search/filter UI

---

## Priority 5: Product Data Improvements

### Barcode Duplicate Warning
- Product save now checks for barcode collisions with other active products
- Shows an error toast if the barcode is already used by another product
- Still saves the product (warning, not blocking) to avoid interrupting workflow

### Files Changed
- `main.js` — Barcode duplicate check in `db:products:upsert` handler
- `pos/admin.html` — Shows barcode_warning toast on product save

---

## Priority 6: Register Status Bar

### Live Clock
- Digital clock (HH:MM) displayed in the status bar, right side
- Monospace font, updates every 15 seconds
- Provides at-a-glance time without needing to look at a separate clock

### Files Changed
- `pos/index.html` — Clock element in status bar, `updateClock()` interval

---

## Database Schema Changes

```sql
-- New table (Priority 4)
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  staff_id    TEXT REFERENCES staff(id),
  staff_name  TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at);
```

No existing tables were altered. All changes are additive (new table, new IPC handlers).

---

## New IPC Channels

| Channel | Bridge Method | Description |
|---|---|---|
| `db:keyboard:copyPage` | `copyPage(src, dest)` | Duplicate all buttons from one page to another |
| `db:keyboard:export` | `exportKeyboard()` | Export full layout as JSON |
| `db:keyboard:import` | `importKeyboard(data)` | Import layout from JSON (replaces all) |
| `db:keyboard:reset` | `resetKeyboard()` | Reset to factory seed layout |
| `db:keyboard:validate` | `validateKeyboard()` | Check for overlaps and broken links |
| `db:backup:create` | `createBackup()` | Create manual DB backup |
| `db:backup:list` | `listBackups()` | List available backups |
| `db:backup:restore` | `restoreBackup(name)` | Restore from a backup file |
| `db:audit:log` | `logAudit(entry)` | Write audit log entry |
| `db:audit:search` | `searchAudit(opts)` | Search audit log with filters |

---

## Testing Checklist

- [ ] App starts without errors
- [ ] PIN login works
- [ ] Keyboard pages navigate correctly (all 6 pages)
- [ ] page_link buttons show target page in admin grid
- [ ] Target page dropdown appears when type = "Go To Page"
- [ ] Back button returns to previous page (not always page 1)
- [ ] Escape returns to page 1 from any page
- [ ] Copy Page duplicates buttons correctly
- [ ] Export downloads valid JSON
- [ ] Import replaces layout correctly
- [ ] Reset restores factory layout
- [ ] Validate detects overlapping buttons
- [ ] Validate detects broken page links
- [ ] Auto-backup file created on startup
- [ ] Manual backup creates file
- [ ] Backup list shows with restore buttons
- [ ] Void item creates audit log entry
- [ ] No Sale creates audit log entry
- [ ] Discount creates audit log entry
- [ ] Audit Log tab shows entries with filters
- [ ] Barcode duplicate warning shown on product save
- [ ] Live clock visible in status bar
- [ ] Cart, payment, receipt all still work correctly
