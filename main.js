const { app, BrowserWindow, ipcMain, globalShortcut, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require('uuid')
const lanSync = require('./lan-sync')
const linkly = require('./linkly')

let mainWindow
let customerWindow = null
let db
let saveTimer = null
let dailyBackupTimer = null
let hardwareCleanup = null  // set by setupIPC, called on shutdown

const DB_PATH = path.join(app.getPath('userData'), 'crisp-pos.sqlite')
const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql')
const LOG_DIR = path.join(app.getPath('userData'), 'logs')
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups')

// ─── App Logging System ──────────────────────────────────────────────────────
// File-based logging: {userData}/logs/app-YYYY-MM-DD.log
// Levels: info, warn, error, fatal

const appHealth = {
  lastDbSave: null,
  lastBackup: null,
  lastError: null,
  dbPath: DB_PATH,
  backupDir: BACKUP_DIR,
  logDir: LOG_DIR,
  startedAt: new Date().toISOString()
}

function appLog (level, source, message, detail) {
  const ts = new Date().toISOString()
  const entry = { ts, level, source, message, detail: detail || null }
  const line = `[${ts}] [${level.toUpperCase()}] [${source}] ${message}${detail ? ' | ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`

  // Console output
  if (level === 'error' || level === 'fatal') console.error(line)
  else console.log(line)

  // Write to log file
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
    const logFile = path.join(LOG_DIR, `app-${ts.slice(0, 10)}.log`)
    fs.appendFileSync(logFile, line + '\n')
  } catch (_) {
    // Last resort — can't even log
  }

  if (level === 'error' || level === 'fatal') {
    appHealth.lastError = ts
  }

  // Prune old log files — keep last 14 days
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('app-') && f.endsWith('.log')).sort()
    while (files.length > 14) {
      const old = files.shift()
      try { fs.unlinkSync(path.join(LOG_DIR, old)) } catch (_) {}
    }
  } catch (_) {}
}

// Crash safety: catch unhandled errors
process.on('uncaughtException', (err) => {
  appLog('fatal', 'process', 'Uncaught exception', err.stack || err.message)
  // Try to save DB before crashing
  try { if (db) saveDB() } catch (_) {}
})

process.on('unhandledRejection', (reason) => {
  appLog('error', 'process', 'Unhandled promise rejection', reason?.stack || String(reason))
})

async function initDatabase() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()

  const dbExists = fs.existsSync(DB_PATH)
  if (dbExists) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  const statements = schema.split(';').filter(s => s.trim())
  for (const stmt of statements) {
    // Skip all INSERT/seed statements for existing databases (strip SQL comments first)
    const stripped = stmt.replace(/--[^\n]*/g, '').trim()
    if (dbExists && /^INSERT/i.test(stripped)) continue
    try { db.run(stmt) } catch (_) {}
  }

  // Deleted records tracking — prevents sync/seed from resurrecting deleted items
  try { db.run("CREATE TABLE IF NOT EXISTS deleted_records (table_name TEXT NOT NULL, record_id TEXT NOT NULL, deleted_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (table_name, record_id))") } catch (_) {}

  // Migrations for existing DBs
  const migrations = [
    "ALTER TABLE keyboard_buttons ADD COLUMN page INTEGER DEFAULT 1",
    "ALTER TABLE keyboard_buttons ADD COLUMN grid_row INTEGER DEFAULT 0",
    "ALTER TABLE keyboard_buttons ADD COLUMN grid_col INTEGER DEFAULT 0",
    "ALTER TABLE keyboard_buttons ADD COLUMN col_span INTEGER DEFAULT 1",
    "ALTER TABLE keyboard_buttons ADD COLUMN row_span INTEGER DEFAULT 1",
    "INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span) VALUES ('np-display', '', 'num_display', '#00cc00', '#111111', 29, 'grid', 1, 2, 3, 1, 4)",
    // Fix np-display overlap: must be inactive (overlaps btn-meat at row 2, col 3)
    "UPDATE keyboard_buttons SET active = 0 WHERE id = 'np-display'",
    // Fix pg2-melons misplacement: move from row 4 col 3 to row 3 col 2 (visible area), make 1x1
    "UPDATE keyboard_buttons SET grid_row = 3, grid_col = 2, row_span = 1 WHERE id = 'pg2-melons' AND grid_row = 4",
    // Add product_id column to link keyboard buttons to real products
    "ALTER TABLE keyboard_buttons ADD COLUMN product_id TEXT REFERENCES products(id)",
    // Remove void, error correct, lock buttons — replace with End of Day
    "UPDATE keyboard_buttons SET active = 0 WHERE id IN ('fn-void', 'fn-errcorrect', 'fn-lock')",
    "INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span) VALUES ('fn-endofday', 'END OF\\nDAY', 'endofday', '#fff', '#8b5cf6', 50, 'grid', 1, 0, 0, 1, 1)",
    // Remove supervisor, viewor, pctone — rename buttons — add unified discount
    "UPDATE keyboard_buttons SET active = 0 WHERE id IN ('fn-supervisor', 'fn-viewor', 'fn-pctone', 'fn-pctdisc')",
    "UPDATE keyboard_buttons SET label = 'OPEN\\nDRAWER', bg_color = '#e07020', color = '#fff' WHERE id = 'fn-nosale'",
    "UPDATE keyboard_buttons SET label = 'RETURN\\nITEM' WHERE id = 'fn-return'",
    "UPDATE keyboard_buttons SET label = 'FIND\\nSALE' WHERE id = 'fn-recall'",
    "UPDATE keyboard_buttons SET label = 'HOLD\\nSALE' WHERE id = 'fn-hold'",
    "UPDATE keyboard_buttons SET label = 'REPRINT\\nRECEIPT' WHERE id = 'fn-reprint'",
    "UPDATE keyboard_buttons SET label = 'LOG OUT' WHERE id = 'fn-movedrawer'",
    "INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span) VALUES ('fn-discount', 'DISCOUNT', 'discount', '#fff', '#d8a820', 10, 'grid', 1, 1, 1, 1, 1)",
    // Remove duplicate fruit & veg section button (keep only open_price one)
    "UPDATE keyboard_buttons SET active = 0 WHERE id = 'btn-fvsect'",
    // Remove CODE ENTER button
    "UPDATE keyboard_buttons SET active = 0 WHERE id = 'np-enter'",
    // Set product page grid sizes (8 cols x 5 rows for fruit/veg pages)
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('keyboard_page_sizes', '{\"2\":{\"cols\":8,\"rows\":5},\"3\":{\"cols\":8,\"rows\":5},\"4\":{\"cols\":8,\"rows\":5},\"5\":{\"cols\":8,\"rows\":5},\"6\":{\"cols\":8,\"rows\":5}}')",
    // Give product pages dark green backgrounds for buttons (better with images)
    "UPDATE keyboard_buttons SET bg_color = '#1B4332', color = '#fff' WHERE page IN (2,3,4,5) AND type = 'open_price' AND bg_color = '#ffffff'",
    // Fix button types (may have been created with empty type due to INSERT OR IGNORE)
    "UPDATE keyboard_buttons SET type = 'discount' WHERE id = 'fn-discount'",
    "UPDATE keyboard_buttons SET type = 'endofday' WHERE id = 'fn-endofday'",
    // Include page 1 in page_sizes setting
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('keyboard_page_sizes', '{\"1\":{\"cols\":13,\"rows\":7},\"2\":{\"cols\":8,\"rows\":5},\"3\":{\"cols\":8,\"rows\":5},\"4\":{\"cols\":8,\"rows\":5},\"5\":{\"cols\":8,\"rows\":5},\"6\":{\"cols\":8,\"rows\":5}}')",
    // Reset Wikimedia images so relinkKeyboardProducts applies GitHub-hosted ones
    "UPDATE keyboard_buttons SET image = NULL WHERE image LIKE '%wikimedia%'",
    // Clear Wikimedia product images — will be re-set by nav migration
    "UPDATE products SET image_url = NULL WHERE image_url LIKE '%wikimedia%'",
    // Fix wrong product_id links (buttons incorrectly linked to Bippi Chilli product)
    "UPDATE keyboard_buttons SET product_id = NULL WHERE product_id IN (SELECT id FROM products WHERE name LIKE '%BIPPI%CHILLI%')",
    // Clear product_id from buttons that already have their own image (avoids wrong product image showing)
    "UPDATE keyboard_buttons SET product_id = NULL WHERE image IS NOT NULL AND image != '' AND product_id IS NOT NULL",
    // Permanently remove Uber Eats button
    "UPDATE keyboard_buttons SET active = 0 WHERE id = 'fn-ubereats'",
    "INSERT OR IGNORE INTO deleted_records (table_name, record_id) VALUES ('keyboard_buttons', 'fn-ubereats')",
    // Upgrade department button images to Pexels high-quality photography
    "UPDATE keyboard_buttons SET image = NULL WHERE id IN ('btn-meat','btn-coffee','btn-fv','btn-cheese','btn-flowers','btn-deli','btn-nuts','btn-grocery','pg2-cherries')",
    "DELETE FROM keyboard_buttons WHERE id = 'fn-ubereats'",
    // ── Upgrade all fruit/veg button images to Pexels photography ──
    "UPDATE keyboard_buttons SET image = NULL WHERE id LIKE 'pg2-%' OR id LIKE 'pg3-%' OR id LIKE 'pg4-%' OR id LIKE 'pg5-%'",
    // ── Intentional colour scheme for fruit/veg pages ──
    // Fruit pages: warm earthy tones (dark olive) instead of flat #1B4332
    "UPDATE keyboard_buttons SET bg_color = '#2d3a2e' WHERE (id LIKE 'pg2-%' OR id LIKE 'pg3-%') AND bg_color = '#1B4332'",
    // Veg pages: cool forest green
    "UPDATE keyboard_buttons SET bg_color = '#1e3328' WHERE (id LIKE 'pg4-%' OR id LIKE 'pg5-%') AND bg_color = '#1B4332'",
    // Nav buttons on fruit/veg pages: fresh green tones
    "UPDATE keyboard_buttons SET bg_color = '#16a34a', color = '#fff' WHERE id IN ('pg2-back','pg3-back','pg4-back','pg5-back')",
    "UPDATE keyboard_buttons SET bg_color = '#22c55e', color = '#000' WHERE id IN ('pg2-veg-menu','pg3-prev-fruit','pg4-fruit-menu','pg5-fruit-menu')",
    "UPDATE keyboard_buttons SET bg_color = '#4ade80', color = '#000' WHERE id IN ('pg2-next-fruit','pg4-next-veg','pg5-prev-veg')",
    // ── Vibrant colour coding for main register page ──
    // Department buttons — rich, distinct category colors
    "UPDATE keyboard_buttons SET bg_color = '#e63946' WHERE id = 'btn-meat'",       // vivid red
    "UPDATE keyboard_buttons SET bg_color = '#e91e90' WHERE id = 'btn-flowers'",    // hot pink
    "UPDATE keyboard_buttons SET bg_color = '#27ae60', color = '#fff' WHERE id = 'btn-fv'", // emerald green
    "UPDATE keyboard_buttons SET bg_color = '#6f4e37' WHERE id = 'btn-coffee'",     // rich coffee brown
    "UPDATE keyboard_buttons SET bg_color = '#d4a017' WHERE id = 'btn-bread'",      // golden wheat
    "UPDATE keyboard_buttons SET bg_color = '#1a8a4a', color = '#fff' WHERE id = 'btn-fvkg'", // forest green
    "UPDATE keyboard_buttons SET bg_color = '#e8a000' WHERE id = 'btn-deli'",       // rich amber
    "UPDATE keyboard_buttons SET bg_color = '#f5c542' WHERE id = 'btn-cheese'",     // warm gold
    "UPDATE keyboard_buttons SET bg_color = '#2c2c2c', color = '#fff' WHERE id = 'btn-bags'", // charcoal
    // Bottom nav — category-matched colors
    "UPDATE keyboard_buttons SET bg_color = '#3498db', color = '#fff' WHERE id = 'btn-grocery'", // bright blue
    "UPDATE keyboard_buttons SET bg_color = '#c49a6c' WHERE id = 'btn-nuts'",       // warm tan
    "UPDATE keyboard_buttons SET bg_color = '#7f8c8d', color = '#fff' WHERE id = 'btn-gas'", // slate
    "UPDATE keyboard_buttons SET bg_color = '#e67e22', color = '#fff' WHERE id = 'btn-fruit-am'", // warm orange
    "UPDATE keyboard_buttons SET bg_color = '#d35400', color = '#fff' WHERE id = 'btn-fruit-nz'", // burnt orange
    "UPDATE keyboard_buttons SET bg_color = '#27ae60', color = '#fff' WHERE id = 'btn-veg-ag'",   // emerald green
    "UPDATE keyboard_buttons SET bg_color = '#1e8449', color = '#fff' WHERE id = 'btn-veg-hz'",   // dark emerald
    // Function buttons — clearer purpose colors
    "UPDATE keyboard_buttons SET bg_color = '#8b5cf6', color = '#fff' WHERE id = 'fn-endofday'", // vivid purple
    "UPDATE keyboard_buttons SET bg_color = '#3b82f6', color = '#fff' WHERE id = 'fn-hold'",     // blue
    "UPDATE keyboard_buttons SET bg_color = '#059669', color = '#fff' WHERE id = 'fn-itemsearch'", // green
    "UPDATE keyboard_buttons SET bg_color = '#f97316', color = '#fff' WHERE id = 'fn-nosale'",   // orange
    "UPDATE keyboard_buttons SET bg_color = '#d97706', color = '#fff' WHERE id = 'fn-discount'", // amber
    "UPDATE keyboard_buttons SET bg_color = '#dc2626', color = '#fff' WHERE id = 'fn-movedrawer'", // red
    "UPDATE keyboard_buttons SET bg_color = '#ef4444', color = '#fff' WHERE id = 'fn-return'",   // bright red
    "UPDATE keyboard_buttons SET bg_color = '#6366f1', color = '#fff' WHERE id = 'fn-recall'",   // indigo
    "UPDATE keyboard_buttons SET bg_color = '#cc1818', color = '#fff' WHERE id = 'btn-subtotal'", // red (already)
    // Reprint & Price Check — subtle but distinct
    "UPDATE keyboard_buttons SET bg_color = '#64748b', color = '#fff' WHERE id = 'fn-reprint'",    // slate
    "UPDATE keyboard_buttons SET bg_color = '#0ea5e9', color = '#fff' WHERE id = 'fn-pricecheck'", // sky blue
    // Performance indexes for transaction lookups and reports
    "CREATE INDEX IF NOT EXISTS idx_transaction_items_txn ON transaction_items(transaction_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_txn ON payments(transaction_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)",
    "CREATE INDEX IF NOT EXISTS idx_cash_drawer_created ON cash_drawer(created_at)",
  ]
  for (const m of migrations) {
    try { db.run(m) } catch (_) {}
  }

  // ── Repair: restore open_price button labels mangled by previous migration ──
  try {
    const repairDone = dbAll("SELECT value FROM settings WHERE key = 'migration_repair_labels_v1'")
    if (!repairDone.length) {
      // Restore original labels with price lines for open_price buttons
      // Use \\n for literal backslash-n (matching SQL seed format), NOT \n (which JS interprets as newline)
      const fixes = {
        'pg2-cherries':     'CHERRIES KG\\n$14.99/kg',     'pg2-coconut':      'COCONUT EA\\n$4.99 ea',
        'pg2-custard-apple':'CUSTARD APPLE KG\\n$6.99/kg', 'pg2-dragon-fruit': 'DRAGON FRUIT KG\\n$14.99/kg',
        'pg2-figs':         'FIGS KG\\n$19.99/kg',         'pg2-grapefruit':   'GRAPEFRUIT KG\\n$4.99/kg',
        'pg2-guava':        'GUAVA KG\\n$8.99/kg',         'pg2-longan':       'LONGAN KG\\n$12.99/kg',
        'pg2-lychee':       'LYCHEE KG\\n$14.99/kg',
        'pg3-passion-fruit':'PASSION FRUIT EA\\n$1.50 ea', 'pg3-papaya':       'PAPAYA RED KG\\n$5.99/kg',
        'pg3-pawpaw':       'PAW PAW GREEN KG\\n$4.99/kg', 'pg3-persimmons':   'PERSIMMONS KG\\n$9.99/kg',
        'pg3-pineapple-sm': 'SM PINEAPPLE EA\\n$3.99 ea',  'pg3-pineapple-md': 'MED PINEAPPLE EA\\n$4.99 ea',
        'pg3-pineapple-xl': 'XL PINEAPPLE EA\\n$6.99 ea',  'pg3-pomegranate':  'POMEGRANATE EA\\n$3.99 ea',
        'pg3-pommelo':      'POMMELO KG\\n$6.99/kg',       'pg3-quince':       'QUINCE KG\\n$7.99/kg',
        'pg3-tangello':     'TANGELLO KG\\n$4.99/kg',
        'pg4-asian-vege':   'ASIAN VEGE EA\\n$3.99 ea',    'pg4-asparagus':    'ASPARAGUS EA\\n$4.99 ea',
        'pg4-beans':        'BEANS KG\\n$9.99/kg',         'pg4-bottle-gourd': 'BOTTLE GOURD KG\\n$5.99/kg',
        'pg4-brussels':     'BRUSSEL SPROUTS KG\\n$12.99/kg','pg4-carrots':    'CARROTS LOOSE KG\\n$2.49/kg',
        'pg4-carrot-bag':   'CARROT BAG EA\\n$2.99 ea',    'pg4-cauliflower':  'CAULIFLOWER EA\\n$4.99 ea',
        'pg4-celery':       'WHOLE CELERY EA\\n$3.99 ea',   'pg4-celeriac':    'CELERIAC EA\\n$5.99 ea',
        'pg4-chokos':       'CHOKOS KG\\n$4.99/kg',        'pg4-corn':         'CORN EA\\n$1.99 ea',
        'pg4-cucumbers':    'CUCUMBERS EA\\n$2.99 ea',      'pg4-eggplant':    'EGGPLANT KG\\n$5.99/kg',
        'pg4-leb-eggplant': 'LEB EGGPLANT KG\\n$7.99/kg',  'pg4-fennel':      'FENNEL EA\\n$4.99 ea',
        'pg4-ginger':       'GINGER KG\\n$24.99/kg',
        'pg5-herbs':        'HERBS EA\\n$2.99 ea',          'pg5-kale':        'KALE EA\\n$3.99 ea',
        'pg5-leeks':        'LEEKS EA\\n$3.99 ea',         'pg5-lettuce-bags': 'LETTUCE BAGS EA\\n$3.99 ea',
        'pg5-lobok':        'LOBOK KG\\n$4.99/kg',         'pg5-olives':       'OLIVES KG\\n$14.99/kg',
        'pg5-parsnip':      'PARSNIP KG\\n$7.99/kg',       'pg5-peas':         'PEAS KG\\n$9.99/kg',
        'pg5-radish':       'RADISH BUNCH EA\\n$2.99 ea',   'pg5-rhubarb':     'RHUBARB EA\\n$4.99 ea',
        'pg5-shallots':     'SHALLOTS EA\\n$2.99 ea',      'pg5-silverbeet':   'SILVERBEET EA\\n$3.99 ea',
        'pg5-snow-peas':    'SNOW PEAS KG\\n$14.99/kg',    'pg5-sugar-snap':   'SUGAR SNAP PEAS KG\\n$14.99/kg',
        'pg5-swedes':       'SWEDES KG\\n$4.99/kg',        'pg5-turnip':       'TURNIP KG\\n$3.99/kg',
      }
      for (const [id, label] of Object.entries(fixes)) {
        db.run("UPDATE keyboard_buttons SET label = ?, type = 'open_price' WHERE id = ?", [label, id])
      }
      // Also clean up any bogus subcategories created by previous migration
      db.run("DELETE FROM categories WHERE id LIKE 'cat-%' AND id NOT IN ('cat-fruit','cat-veg','cat-meat','cat-dairy','cat-bread','cat-deli','cat-flowers','cat-cheese','cat-coffee','cat-nuts','cat-grocery','cat-gas') AND name NOT IN ('Apples','Apricots','Avocados','Bananas','Grapes','Kiwi Fruit','Lemons','Limes','Mandarins','Mangoes','Melons','Nectarines','Oranges','Peaches','Pears','Plums','Beetroot','Broccoli','Cabbage','Capsicum','Chillies','Garlic','Lettuces','Mushrooms','Onions','Potatoes','Pumpkins','Sweet Potatoes','Tomatoes','Zucchini')")
      // Restore products moved to bogus categories back to their parent
      db.run("UPDATE products SET category_id = 'cat-fruit' WHERE category_id NOT IN (SELECT id FROM categories)")
      db.run("UPDATE products SET category_id = 'cat-veg' WHERE category_id NOT IN (SELECT id FROM categories)")
      // Reset the subcats flag so it re-runs cleanly
      db.run("DELETE FROM settings WHERE key = 'migration_fv_subcats_v1'")
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_repair_labels_v1', '1')")
    }
  } catch (e) { console.error('Label repair error:', e) }

  // ── Create fruit/veg subcategories (one-time) ──
  // Adds categories like "Apples", "Bananas" etc. so section buttons can navigate to them
  // Also converts page_link buttons → section and cleans ONLY those labels
  try {
    const done = dbAll("SELECT value FROM settings WHERE key = 'migration_fv_subcats_v1'")
    if (!done.length) {
      // Subcategory definitions: [buttonId, categoryName, parentCatId, colour]
      const subcats = [
        // Fruit (pages 2-3)
        ['pg2-apples',    'Apples',        'cat-fruit', '#c94c4c'],
        ['pg2-apricots',  'Apricots',      'cat-fruit', '#e8a020'],
        ['pg2-avocados',  'Avocados',      'cat-fruit', '#6b8e23'],
        ['pg2-bananas',   'Bananas',       'cat-fruit', '#f0c929'],
        ['pg2-grapes',    'Grapes',        'cat-fruit', '#7b3f7d'],
        ['pg2-kiwi',      'Kiwi Fruit',    'cat-fruit', '#6d8b3c'],
        ['pg2-lemons',    'Lemons',        'cat-fruit', '#e2c846'],
        ['pg2-limes',     'Limes',         'cat-fruit', '#5ca83b'],
        ['pg2-mandarins', 'Mandarins',     'cat-fruit', '#e87820'],
        ['pg2-mangoes',   'Mangoes',       'cat-fruit', '#e8a828'],
        ['pg2-melons',    'Melons',        'cat-fruit', '#68a860'],
        ['pg3-nectarines','Nectarines',    'cat-fruit', '#d87858'],
        ['pg3-oranges',   'Oranges',       'cat-fruit', '#e87830'],
        ['pg3-peaches',   'Peaches',       'cat-fruit', '#e8a870'],
        ['pg3-pears',     'Pears',         'cat-fruit', '#a8b848'],
        ['pg3-plums',     'Plums',         'cat-fruit', '#8b3a8b'],
        // Vegetables (pages 4-5)
        ['pg4-beetroot',  'Beetroot',      'cat-veg', '#8b2252'],
        ['pg4-broccoli',  'Broccoli',      'cat-veg', '#3a7d3a'],
        ['pg4-cabbage',   'Cabbage',       'cat-veg', '#5a8a5a'],
        ['pg4-capsicum',  'Capsicum',      'cat-veg', '#cc3333'],
        ['pg4-chillies',  'Chillies',      'cat-veg', '#cc2222'],
        ['pg4-garlic',    'Garlic',        'cat-veg', '#c8c4bc'],
        ['pg5-lettuces',  'Lettuces',      'cat-veg', '#66aa66'],
        ['pg5-mushrooms', 'Mushrooms',     'cat-veg', '#8b7355'],
        ['pg5-onions',    'Onions',        'cat-veg', '#b8860b'],
        ['pg5-potatoes',  'Potatoes',      'cat-veg', '#b39264'],
        ['pg5-pumpkins',  'Pumpkins',      'cat-veg', '#e87830'],
        ['pg5-sweet-potato','Sweet Potatoes','cat-veg','#cc7744'],
        ['pg5-tomatoes',  'Tomatoes',      'cat-veg', '#cc3333'],
        ['pg5-zucchini',  'Zucchini',      'cat-veg', '#5a8a3a'],
      ]

      let sortOrd = 100
      for (const [btnId, catName, parentId, colour] of subcats) {
        const catId = 'cat-' + catName.toLowerCase().replace(/\s+/g, '-')

        // Create subcategory
        db.run("INSERT OR IGNORE INTO categories (id, name, sort_order, colour, active) VALUES (?, ?, ?, ?, 1)",
          [catId, catName, sortOrd++, colour])

        // Move matching products from parent to subcategory
        db.run("UPDATE products SET category_id = ? WHERE category_id = ? AND LOWER(name) LIKE '%' || LOWER(?) || '%'",
          [catId, parentId, catName.replace(/\s+/g, '%')])

        // Convert button: page_link → section, set category_filter, clean label
        db.run("UPDATE keyboard_buttons SET type = 'section', category_filter = ?, label = ? WHERE id = ?",
          [catName, catName, btnId])
      }

      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_fv_subcats_v1', '1')")
    }
  } catch (e) { console.error('Subcategory migration error:', e) }

  // Layout v3: Shift Page 1 buttons to make room for in-grid cart at cols 0-2
  // Uses position-based detection (not a flag) so it can never double-shift
  try {
    const chk = db.prepare("SELECT grid_col FROM keyboard_buttons WHERE id = 'btn-meat' AND page = 1")
    chk.bind([])
    const meatPos = chk.step() ? chk.getAsObject() : null
    chk.free()
    if (meatPos && meatPos.grid_col < 3) {
      // Departments at cols 0-2 need shifting to 3-5
      db.run("UPDATE keyboard_buttons SET grid_col = grid_col + 3 WHERE page = 1 AND grid_row >= 2 AND grid_row <= 5 AND grid_col BETWEEN 0 AND 2 AND id NOT LIKE 'np-%'")
      // Numpad at cols 4-7 needs shifting to 6-9
      db.run("UPDATE keyboard_buttons SET grid_col = grid_col + 2 WHERE page = 1 AND grid_row >= 2 AND grid_row <= 5 AND grid_col BETWEEN 4 AND 7")
      db.run("UPDATE keyboard_buttons SET active = 0 WHERE id = 'np-display'")
      db.run("INSERT OR IGNORE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter) VALUES ('btn-fvsect', 'FRUIT & VEG', 'section', '#fff', '#409850', 29, 'grid', 1, 3, 5, 1, 1, 'Fruit')")
      db.run("UPDATE keyboard_buttons SET grid_row = 5, grid_col = 4, type = 'section' WHERE id = 'btn-gas' AND grid_row = 6")
      db.run("UPDATE keyboard_buttons SET label = 'BAG' WHERE id = 'btn-bags'")
      db.run("UPDATE keyboard_buttons SET label = 'BREAD &\\nCROISSAN' WHERE id = 'btn-bread'")
      db.run("UPDATE keyboard_buttons SET label = 'FRUIT & VEG\\n/KG' WHERE id = 'btn-fvkg'")
      db.run("UPDATE keyboard_buttons SET label = 'CODE\\nENTER' WHERE id = 'np-enter'")
      db.run("UPDATE keyboard_buttons SET bg_color = '#2d6a4f' WHERE id = 'btn-fvkg'")
      db.run("UPDATE keyboard_buttons SET bg_color = '#222222' WHERE id = 'btn-bags'")
      db.run("UPDATE keyboard_buttons SET bg_color = '#c8a828' WHERE id = 'btn-deli'")
      db.run("UPDATE keyboard_buttons SET bg_color = '#6699cc' WHERE id = 'btn-grocery'")
      db.run("UPDATE keyboard_buttons SET bg_color = '#c8b880' WHERE id = 'btn-nuts'")
      console.log('Layout v3: Shifted buttons for in-grid cart')
    }
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('layout_v3_shifted', '1')")
  } catch (e) { console.error('Layout v3 migration error:', e.message) }

  // Nav button type fix + product images migration (idempotent — uses absolute values)
  try {
    const navFixed = db.prepare("SELECT value FROM settings WHERE key = 'nav_buttons_fixed'")
    navFixed.bind([])
    const navRow = navFixed.step() ? navFixed.getAsObject() : null
    navFixed.free()
    if (!navRow || navRow.value !== '3') {
      // Fix bottom nav buttons: ensure page_link with correct parent_id for keyboard pages
      db.run("UPDATE keyboard_buttons SET type = 'page_link', parent_id = '6', category_filter = NULL, alpha_range = NULL WHERE id = 'btn-grocery'")
      db.run("UPDATE keyboard_buttons SET type = 'page_link', parent_id = '2', category_filter = NULL, alpha_range = NULL WHERE id = 'btn-fruit-am'")
      db.run("UPDATE keyboard_buttons SET type = 'page_link', parent_id = '3', category_filter = NULL, alpha_range = NULL WHERE id = 'btn-fruit-nz'")
      db.run("UPDATE keyboard_buttons SET type = 'page_link', parent_id = '4', category_filter = NULL, alpha_range = NULL WHERE id = 'btn-veg-ag'")
      db.run("UPDATE keyboard_buttons SET type = 'page_link', parent_id = '5', category_filter = NULL, alpha_range = NULL WHERE id = 'btn-veg-hz'")
      // Add image URLs to fruit & veg products
      const fvBase = 'https://raw.githubusercontent.com/matthiascamp/crisponcreek/main/crisp_on_creek_fruit_veg_images/'
      const fruitImages = {
        'Bananas': fvBase + 'Bananas_Cavendish.jpg',
        'Royal Gala Apples': fvBase + 'Apple_Royal_Gala_Large.jpg',
        'Granny Smith Apples': fvBase + 'Apple_Granny_Smith_Large.jpg',
        'Navel Oranges': fvBase + 'Navel_Orange.jpg',
        'Strawberries Punnet': fvBase + 'Strawberries_Punnet.jpg',
        'Avocado Hass': fvBase + 'Avocado_Large_Hass.jpg',
        'Mangoes': fvBase + 'Mandarines_Afrourer.jpg',
        'Watermelon': fvBase + '(S)_Watermelon.jpg',
        'Tomatoes': fvBase + 'Tomatoes.jpg',
        'Potatoes Washed': fvBase + 'Potatoes_Brushed.jpg',
        'Brown Onions': fvBase + 'Brown_Onion.jpg',
        'Carrots': fvBase + 'Carrots.jpg',
        'Broccoli': fvBase + 'Broccoli.jpg',
        'Iceberg Lettuce': fvBase + 'Lettuce_Iceberg.jpg',
        'Red Capsicum': fvBase + 'Capsicum_Red.jpg',
        'Cup Mushrooms': fvBase + 'Mushroom_Cups.jpg',
      }
      for (const [name, url] of Object.entries(fruitImages)) {
        db.run("UPDATE products SET image_url = ? WHERE name = ? AND (image_url IS NULL OR image_url = '' OR image_url LIKE '%wikimedia%')", [url, name])
      }
      console.log('Nav buttons fixed + product images added')
    }
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('nav_buttons_fixed', '3')")
  } catch (e) { console.error('Nav fix migration error:', e.message) }

  // Create keyboard_pages table and populate from existing data
  try {
    db.run("CREATE TABLE IF NOT EXISTS keyboard_pages (page INTEGER PRIMARY KEY, name TEXT NOT NULL DEFAULT 'Untitled', cols INTEGER DEFAULT 13, rows INTEGER DEFAULT 7)")
    const hasPages = db.prepare("SELECT COUNT(*) as c FROM keyboard_pages")
    hasPages.bind([])
    const pgCount = hasPages.step() ? hasPages.getAsObject().c : 0
    hasPages.free()
    if (pgCount === 0) {
      const existingPages = db.exec("SELECT DISTINCT page FROM keyboard_buttons WHERE active = 1 ORDER BY page")
      const defaultNames = { 1: 'Main Register', 2: 'Fruit A-M', 3: 'Fruit N-Z', 4: 'Vegetables A-G', 5: 'Vegetables H-Z', 6: 'Grocery' }
      if (existingPages.length && existingPages[0].values.length) {
        for (const [pg] of existingPages[0].values) {
          db.run("INSERT OR IGNORE INTO keyboard_pages (page, name, cols, rows) VALUES (?, ?, 13, 7)", [pg, defaultNames[pg] || `Page ${pg}`])
        }
      }
      console.log('Created keyboard_pages table')
    }
  } catch (e) { console.error('keyboard_pages migration error:', e.message) }

  // Expand fruit/veg pages to full 13-col grid (was 8-col, now uses cols 0-9 + nav at 10-12)
  try {
    const pgCheck = db.prepare("SELECT value FROM settings WHERE key = 'pages_expanded_v1'")
    pgCheck.bind([])
    const pgRow = pgCheck.step() ? pgCheck.getAsObject() : null
    pgCheck.free()
    if (!pgRow) {
      // Page 2: Fruit A-M — reflow 20 products into 10-col rows
      const pg2Map = [
        ['pg2-apples',0,0],['pg2-apricots',0,1],['pg2-avocados',0,2],['pg2-bananas',0,3],['pg2-cherries',0,4],
        ['pg2-coconut',0,5],['pg2-custard-apple',0,6],['pg2-dragon-fruit',0,7],['pg2-figs',0,8],['pg2-grapes',0,9],
        ['pg2-grapefruit',1,0],['pg2-guava',1,1],['pg2-kiwi',1,2],['pg2-lemons',1,3],['pg2-limes',1,4],
        ['pg2-longan',1,5],['pg2-lychee',1,6],['pg2-mandarins',1,7],['pg2-mangoes',1,8],['pg2-melons',1,9],
        ['pg2-back',0,10],['pg2-veg-menu',1,10],['pg2-next-fruit',2,10]
      ]
      for (const [id, r, c] of pg2Map) {
        db.run("UPDATE keyboard_buttons SET grid_row = ?, grid_col = ?, col_span = CASE WHEN id IN ('pg2-back','pg2-veg-menu','pg2-next-fruit') THEN 3 ELSE 1 END, row_span = 1 WHERE id = ?", [r, c, id])
      }
      db.run("UPDATE keyboard_buttons SET label = 'VEG\\nMENU' WHERE id = 'pg2-veg-menu'")
      db.run("UPDATE keyboard_buttons SET label = 'FRUIT\\nN-Z >' WHERE id = 'pg2-next-fruit'")

      // Page 3: Fruit N-Z — reflow 16 products
      const pg3Map = [
        ['pg3-nectarines',0,0],['pg3-oranges',0,1],['pg3-passion-fruit',0,2],['pg3-papaya',0,3],['pg3-pawpaw',0,4],
        ['pg3-peaches',0,5],['pg3-pears',0,6],['pg3-persimmons',0,7],['pg3-pineapple-sm',0,8],['pg3-pineapple-md',0,9],
        ['pg3-pineapple-xl',1,0],['pg3-plums',1,1],['pg3-pomegranate',1,2],['pg3-pommelo',1,3],['pg3-quince',1,4],['pg3-tangello',1,5],
        ['pg3-back',0,10],['pg3-prev-fruit',1,10]
      ]
      for (const [id, r, c] of pg3Map) {
        db.run("UPDATE keyboard_buttons SET grid_row = ?, grid_col = ?, col_span = CASE WHEN id IN ('pg3-back','pg3-prev-fruit') THEN 3 ELSE 1 END, row_span = 1 WHERE id = ?", [r, c, id])
      }
      db.run("UPDATE keyboard_buttons SET label = '< FRUIT\\nA-M' WHERE id = 'pg3-prev-fruit'")

      // Page 4: Veg A-G — reflow 23 products
      const pg4Map = [
        ['pg4-asian-vege',0,0],['pg4-asparagus',0,1],['pg4-beans',0,2],['pg4-beetroot',0,3],['pg4-bottle-gourd',0,4],
        ['pg4-broccoli',0,5],['pg4-brussels',0,6],['pg4-cabbage',0,7],['pg4-capsicum',0,8],['pg4-carrots',0,9],
        ['pg4-carrot-bag',1,0],['pg4-cauliflower',1,1],['pg4-celery',1,2],['pg4-celeriac',1,3],['pg4-chillies',1,4],
        ['pg4-chokos',1,5],['pg4-corn',1,6],['pg4-cucumbers',1,7],['pg4-eggplant',1,8],['pg4-leb-eggplant',1,9],
        ['pg4-fennel',2,0],['pg4-garlic',2,1],['pg4-ginger',2,2],
        ['pg4-back',0,10],['pg4-fruit-menu',1,10],['pg4-next-veg',2,10]
      ]
      for (const [id, r, c] of pg4Map) {
        db.run("UPDATE keyboard_buttons SET grid_row = ?, grid_col = ?, col_span = CASE WHEN id IN ('pg4-back','pg4-fruit-menu','pg4-next-veg') THEN 3 ELSE 1 END, row_span = 1 WHERE id = ?", [r, c, id])
      }
      db.run("UPDATE keyboard_buttons SET label = 'VEG\\nH-Z >' WHERE id = 'pg4-next-veg'")

      // Page 5: Veg H-Z — reflow 24 products
      const pg5Map = [
        ['pg5-herbs',0,0],['pg5-kale',0,1],['pg5-leeks',0,2],['pg5-lettuces',0,3],['pg5-lettuce-bags',0,4],
        ['pg5-lobok',0,5],['pg5-mushrooms',0,6],['pg5-olives',0,7],['pg5-onions',0,8],['pg5-parsnip',0,9],
        ['pg5-peas',1,0],['pg5-potatoes',1,1],['pg5-pumpkins',1,2],['pg5-radish',1,3],['pg5-rhubarb',1,4],
        ['pg5-shallots',1,5],['pg5-silverbeet',1,6],['pg5-snow-peas',1,7],['pg5-sugar-snap',1,8],['pg5-swedes',1,9],
        ['pg5-sweet-potato',2,0],['pg5-tomatoes',2,1],['pg5-turnip',2,2],['pg5-zucchini',2,3],
        ['pg5-back',0,10],['pg5-fruit-menu',1,10],['pg5-prev-veg',2,10]
      ]
      for (const [id, r, c] of pg5Map) {
        db.run("UPDATE keyboard_buttons SET grid_row = ?, grid_col = ?, col_span = CASE WHEN id IN ('pg5-back','pg5-fruit-menu','pg5-prev-veg') THEN 3 ELSE 1 END, row_span = 1 WHERE id = ?", [r, c, id])
      }
      db.run("UPDATE keyboard_buttons SET label = '< VEG\\nA-G' WHERE id = 'pg5-prev-veg'")

      // Update page sizes to use full 13-col grid
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('keyboard_page_sizes', '{\"1\":{\"cols\":13,\"rows\":7},\"2\":{\"cols\":13,\"rows\":7},\"3\":{\"cols\":13,\"rows\":7},\"4\":{\"cols\":13,\"rows\":7},\"5\":{\"cols\":13,\"rows\":7},\"6\":{\"cols\":13,\"rows\":7}}')")
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('pages_expanded_v1', '1')")
      console.log('Expanded fruit/veg pages to full 13-col grid')
    }
  } catch (e) { console.error('Page expansion migration error:', e.message) }

  // V4: Restore correct page 1-5 layout from backup + category page_links + sub-pages
  try {
    const v4Check = db.prepare("SELECT value FROM settings WHERE key = 'pages_expanded_v4'")
    v4Check.bind([])
    const v4Row = v4Check.step() ? v4Check.getAsObject() : null
    v4Check.free()
    if (!v4Row) {
      db.run("DELETE FROM keyboard_buttons WHERE page IN (1, 2, 3, 4, 5)")
      db.run("DELETE FROM keyboard_buttons WHERE page >= 7")
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
      const statements = schema.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        const stripped = stmt.replace(/^\s*(--[^\n]*\n\s*)*/g, '').trim()
        if (stripped.toUpperCase().startsWith('INSERT') && (stmt.includes('keyboard_pages') || stmt.includes('keyboard_buttons'))) {
          try { db.run(stmt) } catch (_) {}
        }
      }
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('pages_expanded_v4', '1')")
      console.log('Applied keyboard layout migration (v4)')
    }
  } catch (e) { console.error('Keyboard layout v4 migration error:', e.message) }

  // V5: Fix duplicate schema seed — old 10-col block was inserted before correct 13-col block
  try {
    const v5Check = db.prepare("SELECT value FROM settings WHERE key = 'layout_v5_fix'")
    v5Check.bind([])
    const v5Row = v5Check.step() ? v5Check.getAsObject() : null
    v5Check.free()
    if (!v5Row) {
      db.run("DELETE FROM keyboard_buttons WHERE page IN (1, 2, 3, 4, 5)")
      db.run("DELETE FROM keyboard_buttons WHERE page >= 7")
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
      const statements = schema.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        const stripped = stmt.replace(/^\s*(--[^\n]*\n\s*)*/g, '').trim()
        if (stripped.toUpperCase().startsWith('INSERT') && (stmt.includes('keyboard_pages') || stmt.includes('keyboard_buttons'))) {
          try { db.run(stmt) } catch (_) {}
        }
      }
      db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('layout_v5_fix', '1')")
      console.log('Applied keyboard layout fix (v5 — removed old seed conflict)')
    }
  } catch (e) { console.error('Keyboard layout v5 fix error:', e.message) }

  // Link keyboard buttons to products by matching names (best image match)
  relinkKeyboardProducts()

  // Enforce deleted_records — remove anything that was intentionally deleted but got re-inserted
  try {
    const deleted = db.exec("SELECT table_name, record_id FROM deleted_records")
    if (deleted.length && deleted[0].values.length) {
      for (const [table, recordId] of deleted[0].values) {
        db.run(`DELETE FROM ${table} WHERE id = ?1`, [recordId])
      }
      console.log(`Enforced ${deleted[0].values.length} deletions from deleted_records`)
    }
  } catch (_) {}

  saveDB()
  appLog('info', 'database', 'Database initialized', `Path: ${DB_PATH}`)

  // Auto-backup on startup
  createBackup('startup')

  // Daily backup timer — every 24 hours
  dailyBackupTimer = setInterval(() => {
    createBackup('daily')
  }, 24 * 60 * 60 * 1000)
}

function saveDB() {
  if (!db) return
  try {
    const data = db.export()
    const buf = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buf)
    appHealth.lastDbSave = new Date().toISOString()
  } catch (e) {
    appLog('error', 'database', 'Failed to save database to disk', e.message)
  }
}

function createBackup(prefix = 'auto') {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupFile = path.join(BACKUP_DIR, `${prefix}-${ts}.sqlite`)
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupFile)
      // Prune old backups — keep last 14
      const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite')).sort()
      while (files.length > 14) {
        const old = files.shift()
        try { fs.unlinkSync(path.join(BACKUP_DIR, old)) } catch (_) {}
      }
      appHealth.lastBackup = new Date().toISOString()
      appLog('info', 'backup', `Backup created: ${path.basename(backupFile)}`)
      return { file: backupFile, name: path.basename(backupFile) }
    }
    appLog('warn', 'backup', 'No database file to backup')
    return { error: 'No database to backup' }
  } catch (e) {
    appLog('error', 'backup', 'Backup failed', e.message)
    return { error: 'Backup failed: ' + e.message }
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveDB, 1000)
}

// sql.js helpers — wraps the slightly different API to match what we need

function dbAll(sql, params = []) {
  let stmt
  try {
    stmt = db.prepare(sql)
    stmt.bind(params)
    const rows = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    return rows
  } catch (e) {
    appLog('error', 'database', `dbAll error: ${e.message}`, sql.slice(0, 200))
    return []
  } finally {
    if (stmt) try { stmt.free() } catch (_) {}
  }
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params)
  return rows[0] || null
}

function dbRun(sql, params = []) {
  try {
    db.run(sql, params)
    scheduleSave()
  } catch (e) {
    appLog('error', 'database', `dbRun error: ${e.message}`, sql.slice(0, 200))
  }
}

// Direct image URL mapping for keyboard buttons (from GitHub repo)
const KB_IMAGE_BASE = 'https://raw.githubusercontent.com/matthiascamp/crisponcreek/main/crisp_on_creek_fruit_veg_images/'
const KB_IMAGE_BASE_DELI = 'https://raw.githubusercontent.com/matthiascamp/crisponcreek/main/crisp_on_creek_deli_images/'
const KB_IMAGE_BASE_EXT = 'https://raw.githubusercontent.com/matthiascamp/crisponcreek/main/crisp_on_creek_external_images/'
const KB_IMAGE_BASE_IMG = 'https://raw.githubusercontent.com/matthiascamp/crisponcreek/main/crisp_on_creek_images/'
const PX = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`
const KB_IMAGE_MAP = {
  // Main page department buttons (Pexels high-quality photography)
  'btn-meat':    { base: 'direct', file: PX(65175) },
  'btn-coffee':  { base: 'direct', file: PX(302899) },
  'btn-fv':      { base: 'direct', file: PX(264537) },
  'btn-cheese':  { base: 'direct', file: PX(4109938) },
  'btn-flowers': { base: 'direct', file: PX(5996678) },
  'btn-bread':   { base: 'ext', file: 'F_R_CIABATTA_LOAF.jpg' },
  'btn-bags':    { base: 'img', file: 'Home_Force_Garbage_Bags_Handle_Tie.jpg' },
  'btn-deli':    { base: 'direct', file: PX(8775044) },
  'btn-nuts':    { base: 'direct', file: PX(529632) },
  'btn-grocery': { base: 'direct', file: PX(1366594) },
  'btn-gas':     { base: 'img', file: 'Coca_Cola_1.25L.jpg' },
  // Page 2: Fruit A-M (Pexels)
  'pg2-apples':        { base: 'direct', file: PX(2487443) },
  'pg2-apricots':      { base: 'direct', file: PX(31427390) },
  'pg2-avocados':      { base: 'direct', file: PX(557659) },
  'pg2-bananas':       { base: 'direct', file: PX(2238316) },
  'pg2-berries':       { base: 'fv', file: 'Strawberries.jpg' },
  'pg2-cherries':      { base: 'direct', file: PX(1178610) },
  'pg2-coconut':       { base: 'direct', file: PX(1652001) },
  'pg2-custard-apple': { base: 'direct', file: PX(15506342) },
  'pg2-dragon-fruit':  { base: 'direct', file: PX(5217958) },
  'pg2-figs':          { base: 'direct', file: PX(5419213) },
  'pg2-grapes':        { base: 'direct', file: PX(1098529) },
  'pg2-grapefruit':    { base: 'direct', file: PX(209549) },
  'pg2-guava':         { base: 'direct', file: PX(5945789) },
  'pg2-kiwi':          { base: 'direct', file: PX(7675956) },
  'pg2-lemons':        { base: 'direct', file: PX(1414122) },
  'pg2-limes':         { base: 'direct', file: PX(8615395) },
  'pg2-longan':        { base: 'direct', file: PX(6870819) },
  'pg2-lychee':        { base: 'direct', file: PX(17201891) },
  'pg2-mandarins':     { base: 'direct', file: PX(2135677) },
  'pg2-mangoes':       { base: 'direct', file: PX(28939331) },
  'pg2-melons':        { base: 'direct', file: PX(4397729) },
  // Page 3: Fruit N-Z (Pexels)
  'pg3-nectarines':    { base: 'direct', file: PX(33589129) },
  'pg3-oranges':       { base: 'direct', file: PX(2247142) },
  'pg3-passion-fruit': { base: 'direct', file: PX(5945951) },
  'pg3-papaya':        { base: 'direct', file: PX(4611443) },
  'pg3-pawpaw':        { base: 'direct', file: PX(14100444) },
  'pg3-peaches':       { base: 'direct', file: PX(4397924) },
  'pg3-pears':         { base: 'direct', file: PX(1656665) },
  'pg3-persimmons':    { base: 'direct', file: PX(5945961) },
  'pg3-pineapple-sm':  { base: 'direct', file: PX(947879) },
  'pg3-pineapple-md':  { base: 'direct', file: PX(947879) },
  'pg3-pineapple-xl':  { base: 'direct', file: PX(947879) },
  'pg3-plums':         { base: 'direct', file: PX(17964695) },
  'pg3-pomegranate':   { base: 'direct', file: PX(7657065) },
  'pg3-pommelo':       { base: 'direct', file: PX(7214312) },
  'pg3-quince':        { base: 'direct', file: PX(9944541) },
  'pg3-raspberries':   { base: 'fv', file: 'Raspberries_Punnet.jpg' },
  'pg3-blueberries':   { base: 'fv', file: 'Blueberries_Punnet.jpg' },
  'pg3-rockmelon':     { base: 'fv', file: 'Rockmelon.jpg' },
  'pg3-strawberries':  { base: 'fv', file: 'Strawberries.jpg' },
  'pg3-watermelon':    { base: 'fv', file: '(S)Seedless_Watermelon_Whole.jpg' },
  'pg3-tangello':      { base: 'direct', file: PX(14705001) },
  // Page 4: Vegetables A-G (Pexels)
  'pg4-asian-vege':    { base: 'direct', file: PX(2518893) },
  'pg4-asparagus':     { base: 'direct', file: PX(351679) },
  'pg4-beans':         { base: 'direct', file: PX(10487661) },
  'pg4-beetroot':      { base: 'direct', file: PX(5502852) },
  'pg4-broccolini':    { base: 'fv', file: 'Broccolini_Bunch.jpg' },
  'pg4-broccoli':      { base: 'direct', file: PX(1118177) },
  'pg4-brussels':      { base: 'direct', file: PX(5662188) },
  'pg4-cabbage':       { base: 'direct', file: PX(134877) },
  'pg4-capsicum':      { base: 'direct', file: PX(128536) },
  'pg4-carrots':       { base: 'direct', file: PX(1306559) },
  'pg4-carrot-bag':    { base: 'direct', file: PX(1306559) },
  'pg4-cauliflower':   { base: 'direct', file: PX(23235232) },
  'pg4-celery':        { base: 'direct', file: PX(5620885) },
  'pg4-celeriac':      { base: 'direct', file: PX(10112735) },
  'pg4-chillies':      { base: 'direct', file: PX(221140) },
  'pg4-chokos':        { base: 'direct', file: PX(7543109) },
  'pg4-corn':          { base: 'direct', file: PX(1459331) },
  'pg4-cucumbers':     { base: 'direct', file: PX(2329440) },
  'pg4-eggplant':      { base: 'direct', file: PX(6576755) },
  'pg4-leb-eggplant':  { base: 'direct', file: PX(6576755) },
  'pg4-fennel':        { base: 'direct', file: PX(7511809) },
  'pg4-garlic':        { base: 'direct', file: PX(1460862) },
  'pg4-ginger':        { base: 'direct', file: PX(20234970) },
  'pg4-bottle-gourd':  { base: 'direct', file: PX(36873528) },
  // Page 5: Vegetables H-Z (Pexels)
  'pg5-herbs':         { base: 'direct', file: PX(1391503) },
  'pg5-kale':          { base: 'direct', file: PX(5949097) },
  'pg5-leeks':         { base: 'direct', file: PX(8054732) },
  'pg5-lettuces':      { base: 'direct', file: PX(26951809) },
  'pg5-lettuce-bags':  { base: 'direct', file: PX(26951809) },
  'pg5-mushrooms':     { base: 'direct', file: PX(5950443) },
  'pg5-olives':        { base: 'direct', file: PX(4109908) },
  'pg5-onions':        { base: 'direct', file: PX(144206) },
  'pg5-parsnip':       { base: 'direct', file: PX(36517116) },
  'pg5-peas':          { base: 'direct', file: PX(255469) },
  'pg5-potatoes':      { base: 'direct', file: PX(2286776) },
  'pg5-pumpkins':      { base: 'direct', file: PX(4187620) },
  'pg5-radish':        { base: 'direct', file: PX(775207) },
  'pg5-rhubarb':       { base: 'direct', file: PX(31930001) },
  'pg5-shallots':      { base: 'direct', file: PX(15220072) },
  'pg5-silverbeet':    { base: 'direct', file: PX(9005958) },
  'pg5-snow-peas':     { base: 'direct', file: PX(4963969) },
  'pg5-sugar-snap':    { base: 'direct', file: PX(8067748) },
  'pg5-sprouts':       { base: 'fv', file: 'Alfalfa_Sprout_Salad.jpg' },
  'pg5-swedes':        { base: 'fv', file: 'Swedes.jpg' },
  'pg5-sweet-potato':  { base: 'direct', file: PX(5505462) },
  'pg5-tomatoes':      { base: 'direct', file: PX(1327838) },
  'pg5-turnip':        { base: 'direct', file: PX(11663131) },
  'pg5-zucchini':      { base: 'direct', file: PX(3375263) },
}

// Apply direct image mappings to keyboard buttons
function relinkKeyboardProducts() {
  const bases = { fv: KB_IMAGE_BASE, deli: KB_IMAGE_BASE_DELI, ext: KB_IMAGE_BASE_EXT, img: KB_IMAGE_BASE_IMG }
  try {
    let linked = 0
    for (const [btnId, entry] of Object.entries(KB_IMAGE_MAP)) {
      if (!entry) continue
      const imgUrl = entry.base === 'direct' ? entry.file : bases[entry.base] + entry.file
      db.run("UPDATE keyboard_buttons SET image = ? WHERE id = ? AND (image IS NULL OR image = '')", [imgUrl, btnId])
      linked++
    }
    if (linked > 0) {
      scheduleSave()
      console.log(`Applied ${linked} keyboard button images`)
    }
  } catch (e) { console.error('relinkKeyboardProducts error:', e.message) }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: !process.argv.includes('--dev'),
    kiosk: !process.argv.includes('--dev'),
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'pos', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  mainWindow.loadFile(path.join(__dirname, 'pos', 'index.html'))

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }


  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11') {
      mainWindow.setKiosk(!mainWindow.isKiosk())
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
    if (input.key === 'Escape' && mainWindow.isKiosk()) {
      mainWindow.setKiosk(false)
      mainWindow.setFullScreen(false)
    }
  })

  // Close customer display when main window closes
  mainWindow.on('closed', () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.close()
    }
    mainWindow = null
  })
}

function createCustomerWindow () {
  const { screen } = require('electron')
  const displays = screen.getAllDisplays()
  const externalDisplay = displays.find(d => d.id !== screen.getPrimaryDisplay().id)

  const opts = {
    width: 1024,
    height: 768,
    autoHideMenuBar: true,
    title: 'Customer Display',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  }

  if (externalDisplay) {
    opts.x = externalDisplay.bounds.x + 50
    opts.y = externalDisplay.bounds.y + 50
    opts.fullscreen = true
  }

  customerWindow = new BrowserWindow(opts)
  customerWindow.loadFile(path.join(__dirname, 'pos', 'customer.html'))
  customerWindow.on('closed', () => { customerWindow = null })

  // Send store info
  customerWindow.webContents.on('did-finish-load', () => {
    const name = dbGet("SELECT value FROM settings WHERE key = 'store_name'")?.value
    const address = dbGet("SELECT value FROM settings WHERE key = 'store_address'")?.value
    if (customerWindow) {
      customerWindow.webContents.send('customer:update', { items: [], storeName: name || '', storeAddress: address || '' })
    }
  })
}

// Single instance lock — focus existing window if already running
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) { app.quit() }
else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()
  setupIPC()

  // Auto-open customer display if a second monitor is available
  const { screen } = require('electron')
  if (screen.getAllDisplays().length > 1) {
    createCustomerWindow()
  }

  // LAN sync — always auto-start if a mode is configured
  try {
    const lanMode = dbGet("SELECT value FROM settings WHERE key = 'lan_mode'")?.value
    const lanPort = parseInt(dbGet("SELECT value FROM settings WHERE key = 'lan_port'")?.value || '5555')
    if (lanMode === 'server') {
      lanSync.startServer(lanPort, { dbAll, dbGet, dbRun, saveDB, uuid })
      appLog('info', 'lan-sync', 'Auto-started LAN server on port ' + lanPort)
    } else if (lanMode === 'client') {
      const serverIp = dbGet("SELECT value FROM settings WHERE key = 'lan_server_ip'")?.value
      const secret = dbGet("SELECT value FROM settings WHERE key = 'lan_secret'")?.value
      if (serverIp) {
        lanSync.startClient(serverIp, lanPort, secret, { dbAll, dbGet, dbRun, saveDB, uuid })
        appLog('info', 'lan-sync', `Auto-connected to server at ${serverIp}:${lanPort}`)
      }
    }
  } catch (e) { appLog('error', 'lan-sync', 'LAN sync startup error', e.message) }

  lanSync.onDataChanged(() => {
    const windows = [mainWindow, customerWindow]
    for (const win of windows) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('lan:data-changed')
      }
    }
  })

  // Supabase cloud pull — only on server or standalone (not client registers)
  // Server pulls from Supabase, then LAN clients pull from server
  try {
    const currentLanMode = dbGet("SELECT value FROM settings WHERE key = 'lan_mode'")?.value
    if (currentLanMode !== 'client') {
      const supaUrl = dbGet("SELECT value FROM settings WHERE key = 'supabase_url'")?.value
      const supaKey = dbGet("SELECT value FROM settings WHERE key = 'supabase_anon_key'")?.value
      if (supaUrl && supaKey) {
        appLog('info', 'supabase', `Cloud sync enabled (mode: ${currentLanMode || 'standalone'})`)
      }
    }
  } catch (e) { appLog('error', 'supabase', 'Supabase config check failed', e.message) }
})

app.on('window-all-closed', () => {
  if (dailyBackupTimer) clearInterval(dailyBackupTimer)
  appLog('info', 'app', 'App shutting down')
  // Close scale connections if open
  try { if (hardwareCleanup) hardwareCleanup() } catch (_) {}
  saveDB()
  app.quit()
})

// ─── IPC Handlers ───────���────────────────────────��────────────────────────────

function setupIPC() {

  ipcMain.handle('window:exitFullscreen', () => {
    if (mainWindow) {
      mainWindow.setKiosk(false)
      mainWindow.setFullScreen(false)
    }
  })

  ipcMain.handle('window:quit', () => {
    app.quit()
  })

  // ── App Update (git pull from GitHub) ──────────────────────────────────

  ipcMain.handle('app:update', async () => {
    const { execSync } = require('child_process')
    const https = require('https')
    const appDir = __dirname

    // Try git first
    let hasGit = false
    try { execSync('git --version', { timeout: 3000, encoding: 'utf-8' }); hasGit = true } catch (_) {}

    if (hasGit) {
      try {
        const before = execSync('git rev-parse HEAD', { cwd: appDir, encoding: 'utf-8', timeout: 5000 }).trim()
        const pullOutput = execSync('git pull origin main', { cwd: appDir, encoding: 'utf-8', timeout: 30000 })
        const after = execSync('git rev-parse HEAD', { cwd: appDir, encoding: 'utf-8', timeout: 5000 }).trim()
        if (before === after) return { upToDate: true, log: pullOutput.trim() }
        const diffLog = execSync(`git log --oneline ${before}..${after}`, { cwd: appDir, encoding: 'utf-8', timeout: 5000 }).trim()
        appLog('info', 'update', `Updated from ${before.slice(0,7)} to ${after.slice(0,7)}`)
        setTimeout(() => { app.relaunch(); app.exit(0) }, 1500)
        return { updated: true, log: `${pullOutput.trim()}\n\nNew commits:\n${diffLog}`, from: before.slice(0,7), to: after.slice(0,7) }
      } catch (e) {
        const msg = (e.stderr || e.message || '').trim()
        if (!msg.includes('not a git repository')) return { error: msg, log: msg }
      }
    }

    // Fallback: download zip from GitHub
    try {
      const zipUrl = 'https://github.com/matthiascamp/mcpos/archive/refs/heads/main.zip'
      const tmpZip = path.join(os.tmpdir(), `mcpos-update-${Date.now()}.zip`)
      const tmpDir = path.join(os.tmpdir(), `mcpos-update-${Date.now()}`)

      await new Promise((resolve, reject) => {
        const follow = (url) => {
          https.get(url, { headers: { 'User-Agent': 'CrispPOS' } }, res => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return follow(res.headers.location)
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`))
            const ws = fs.createWriteStream(tmpZip)
            res.pipe(ws)
            ws.on('finish', () => ws.close(resolve))
            ws.on('error', reject)
          }).on('error', reject)
        }
        follow(zipUrl)
      })

      if (os.platform() === 'win32') {
        execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}' -Force"`, { timeout: 30000 })
      } else {
        fs.mkdirSync(tmpDir, { recursive: true })
        execSync(`unzip -o "${tmpZip}" -d "${tmpDir}"`, { timeout: 30000 })
      }

      const extracted = path.join(tmpDir, 'mcpos-main')
      if (!fs.existsSync(extracted)) return { error: 'Download succeeded but extraction failed — folder not found' }

      const skipDirs = new Set(['node_modules', '.git', 'mcpos'])
      const skipFiles = new Set(['package-lock.json'])
      const copyRecursive = (src, dest) => {
        const entries = fs.readdirSync(src, { withFileTypes: true })
        for (const entry of entries) {
          if (skipDirs.has(entry.name) || skipFiles.has(entry.name)) continue
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          if (entry.isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true })
            copyRecursive(srcPath, destPath)
          } else {
            fs.copyFileSync(srcPath, destPath)
          }
        }
      }
      copyRecursive(extracted, appDir)

      try { fs.unlinkSync(tmpZip) } catch (_) {}
      try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch (_) {}

      appLog('info', 'update', 'Updated from GitHub zip download')
      setTimeout(() => { app.relaunch(); app.exit(0) }, 1500)
      return { updated: true, log: 'Downloaded latest version from GitHub and applied.\nApp will restart now.' }
    } catch (e) {
      return { error: `Download update failed: ${e.message}`, log: e.message }
    }
  })

  // ── Backups ─────────────────────────────────────────────────────────────

  ipcMain.handle('db:backup:create', () => {
    return createBackup()
  })

  ipcMain.handle('db:backup:list', () => {
    if (!fs.existsSync(BACKUP_DIR)) return []
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sqlite'))
      .sort()
      .reverse()
    return files.map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f))
      return { name: f, size: stat.size, created: stat.mtime.toISOString() }
    })
  })

  ipcMain.handle('db:backup:restore', (_e, filename) => {
    const backupPath = path.join(BACKUP_DIR, filename)
    if (!fs.existsSync(backupPath)) return { error: 'Backup file not found' }
    createBackup('pre-restore')
    appLog('info', 'backup', `Restoring backup: ${filename}`)
    const buf = fs.readFileSync(backupPath)
    fs.writeFileSync(DB_PATH, buf)
    return { success: true, message: 'Backup restored. Restart the app to apply.' }
  })

  ipcMain.handle('db:backup:openFolder', () => {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
    shell.openPath(BACKUP_DIR)
    return true
  })

  // ── App Logs & Health ──────────────────────────────────────────────────

  ipcMain.handle('app:logs:get', (_e, opts = {}) => {
    try {
      if (!fs.existsSync(LOG_DIR)) return []
      const date = opts.date || new Date().toISOString().slice(0, 10)
      const logFile = path.join(LOG_DIR, `app-${date}.log`)
      if (!fs.existsSync(logFile)) return []
      const content = fs.readFileSync(logFile, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())
      // Parse log lines back into objects
      return lines.map(line => {
        const match = line.match(/^\[(.+?)\] \[(.+?)\] \[(.+?)\] (.+?)(?:\s*\|\s*(.*))?$/)
        if (match) return { ts: match[1], level: match[2].toLowerCase(), source: match[3], message: match[4], detail: match[5] || null }
        return { ts: '', level: 'info', source: 'unknown', message: line, detail: null }
      }).reverse() // newest first
    } catch (e) {
      return [{ ts: new Date().toISOString(), level: 'error', source: 'logs', message: 'Failed to read log file', detail: e.message }]
    }
  })

  ipcMain.handle('app:logs:dates', () => {
    try {
      if (!fs.existsSync(LOG_DIR)) return []
      return fs.readdirSync(LOG_DIR)
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .map(f => f.replace('app-', '').replace('.log', ''))
        .sort()
        .reverse()
    } catch (_) { return [] }
  })

  ipcMain.handle('app:logs:clear', (_e, date) => {
    try {
      const logFile = path.join(LOG_DIR, `app-${date}.log`)
      if (fs.existsSync(logFile)) fs.unlinkSync(logFile)
      appLog('info', 'logs', `Log file cleared: ${date}`)
      return true
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('app:logs:export', (_e, date) => {
    try {
      const logFile = path.join(LOG_DIR, `app-${date}.log`)
      if (!fs.existsSync(logFile)) return { error: 'Log file not found' }
      return { content: fs.readFileSync(logFile, 'utf-8'), filename: `app-${date}.log` }
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('app:health', () => {
    return { ...appHealth }
  })

  ipcMain.handle('app:version', () => {
    try {
      const { execSync } = require('child_process')
      const hash = execSync('git rev-parse --short HEAD', { cwd: __dirname, encoding: 'utf-8', timeout: 3000 }).trim()
      const count = execSync('git rev-list --count HEAD', { cwd: __dirname, encoding: 'utf-8', timeout: 3000 }).trim()
      return `v${count}.${hash}`
    } catch (_) { return 'dev' }
  })

  // ── Audit Log ──────────────────────────────────────────────────────────

  ipcMain.handle('db:audit:log', (_e, entry) => {
    const id = uuid()
    dbRun(`INSERT INTO audit_log (id, staff_id, staff_name, action, detail, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`,
      [id, entry.staff_id || null, entry.staff_name || null, entry.action, entry.detail || null])
    return { id }
  })

  ipcMain.handle('db:audit:search', (_e, opts = {}) => {
    let sql = "SELECT * FROM audit_log WHERE 1=1"
    const params = []
    let idx = 1
    if (opts.date) {
      sql += ` AND date(created_at) = ?${idx}`
      params.push(opts.date); idx++
    }
    if (opts.action) {
      sql += ` AND action = ?${idx}`
      params.push(opts.action); idx++
    }
    if (opts.staff_id) {
      sql += ` AND staff_id = ?${idx}`
      params.push(opts.staff_id); idx++
    }
    sql += " ORDER BY created_at DESC LIMIT 200"
    return dbAll(sql, params)
  })

  // ── Customer Display ───────────────────────────────────────────────────
  ipcMain.handle('customer:update', (_e, data) => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('customer:update', data)
    }
  })

  ipcMain.handle('customer:saleComplete', (_e, data) => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.webContents.send('customer:saleComplete', data)
    }
  })

  ipcMain.handle('customer:open', () => {
    if (!customerWindow || customerWindow.isDestroyed()) {
      createCustomerWindow()
    } else {
      customerWindow.focus()
    }
  })

  // ── Products ────────���───────────────────────────��─────────────────────────

  ipcMain.handle('db:products:search', (_e, query) => {
    const q = `%${query}%`
    const limit = query.length < 2 ? 200 : 50
    return dbAll(`
      SELECT p.*, c.name as category_name, c.colour as category_color,
        COALESCE(s.special_price, p.price) as active_price,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_special
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN specials s ON s.product_id = p.id
        AND s.active = 1
        AND (s.start_date IS NULL OR s.start_date <= date('now'))
        AND (s.end_date IS NULL OR s.end_date >= date('now'))
      WHERE p.active = 1
        AND (p.name LIKE ?1 OR p.barcode LIKE ?1 OR p.plu LIKE ?1)
      ORDER BY p.name
      LIMIT ${limit}
    `, [q])
  })

  ipcMain.handle('db:products:getByBarcode', (_e, barcode) => {
    return dbGet(`
      SELECT p.*, c.name as category_name, c.colour as category_color,
        COALESCE(s.special_price, p.price) as active_price,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_special
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN specials s ON s.product_id = p.id
        AND s.active = 1
        AND (s.start_date IS NULL OR s.start_date <= date('now'))
        AND (s.end_date IS NULL OR s.end_date >= date('now'))
      WHERE p.active = 1
        AND (p.barcode = ?1 OR p.plu = ?1 OR p.id = ?1)
    `, [barcode])
  })

  ipcMain.handle('db:products:getByCategory', (_e, categoryId) => {
    return dbAll(`
      SELECT p.*, c.name as category_name, c.colour as category_color,
        COALESCE(s.special_price, p.price) as active_price,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_special
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN specials s ON s.product_id = p.id
        AND s.active = 1
        AND (s.start_date IS NULL OR s.start_date <= date('now'))
        AND (s.end_date IS NULL OR s.end_date >= date('now'))
      WHERE p.active = 1 AND p.category_id = ?1
      ORDER BY p.name
    `, [categoryId])
  })

  ipcMain.handle('db:categories:getAll', () => {
    return dbAll(`SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name`)
  })

  // ── Product Management ────────────────────────────────────────────────────

  ipcMain.handle('db:products:upsert', (_e, product) => {
    const id = product.id || uuid()

    // Check for barcode duplicates (exclude self)
    let barcode_warning = null
    if (product.barcode) {
      const dup = dbGet("SELECT id, name FROM products WHERE barcode = ?1 AND id != ?2 AND active = 1", [product.barcode, id])
      if (dup) barcode_warning = `Barcode "${product.barcode}" already used by "${dup.name}"`
    }

    dbRun(`
      INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, image_url, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, datetime('now'))
    `, [id, product.barcode || null, product.plu || null, product.name, product.category_id || null,
        product.price, product.cost_price || 0, product.unit || 'each',
        product.tax_rate ?? 0.10, product.track_stock ? 1 : 0,
        product.stock_qty || 0, product.active !== false ? 1 : 0, product.image_url || null])

    queueSync('products', id, product.id ? 'update' : 'insert')
    return { id, barcode_warning }
  })

  ipcMain.handle('db:categories:upsert', (_e, cat) => {
    const id = cat.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO categories (id, name, sort_order, colour, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
    `, [id, cat.name, cat.sort_order || 0, cat.colour || '#10b981', cat.active !== false ? 1 : 0])

    queueSync('categories', id, cat.id ? 'update' : 'insert')
    return { id }
  })

  // Bulk upsert from cloud sync — skips sync queue to avoid circular push
  // Uses INSERT + ON CONFLICT to preserve local active/stock state
  ipcMain.handle('db:products:bulkUpsert', (_e, products) => {
    let count = 0
    for (const p of products) {
      if (!p.id || !p.name) continue
      dbRun(`INSERT INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, image_url, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          barcode = excluded.barcode, plu = excluded.plu, name = excluded.name,
          category_id = excluded.category_id, price = excluded.price,
          cost_price = excluded.cost_price, unit = excluded.unit,
          tax_rate = excluded.tax_rate, image_url = excluded.image_url,
          updated_at = excluded.updated_at`,
        [p.id, p.barcode || null, p.plu || null, p.name, p.category_id || null,
         p.price, p.cost_price || 0, p.unit || 'each', p.tax_rate ?? 0.10,
         p.track_stock ? 1 : 0, p.stock_qty || 0, p.active !== false ? 1 : 0, p.image_url || null])
      count++
    }
    scheduleSave()
    // Re-link keyboard buttons to products after bulk import (images may have arrived)
    relinkKeyboardProducts()
    return count
  })

  ipcMain.handle('db:categories:bulkUpsert', (_e, categories) => {
    let count = 0
    for (const c of categories) {
      if (!c.id || !c.name) continue
      dbRun(`INSERT OR REPLACE INTO categories (id, name, sort_order, colour, active, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`,
        [c.id, c.name, c.sort_order || 0, c.colour || '#10b981', c.active !== false ? 1 : 0])
      count++
    }
    scheduleSave()
    return count
  })

  ipcMain.handle('db:products:delete', (_e, id) => {
    dbRun("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?1", [id])
    queueSync('products', id, 'update')
    return true
  })

  ipcMain.handle('db:products:getById', (_e, id) => {
    return dbGet(`
      SELECT p.*, c.name as category_name,
        COALESCE(s.special_price, p.price) as active_price,
        CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END as is_special
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN specials s ON s.product_id = p.id
        AND s.active = 1
        AND (s.start_date IS NULL OR s.start_date <= date('now'))
        AND (s.end_date IS NULL OR s.end_date >= date('now'))
      WHERE p.id = ?1
    `, [id])
  })

  // ── Specials ──────────────────────────────────────────────────────────────

  ipcMain.handle('db:specials:getAll', () => {
    return dbAll(`
      SELECT s.*, p.name as product_name, p.price as product_price, p.barcode
      FROM specials s
      JOIN products p ON p.id = s.product_id
      ORDER BY s.active DESC, p.name
    `)
  })

  ipcMain.handle('db:specials:upsert', (_e, spec) => {
    const id = spec.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO specials (id, product_id, special_price, start_date, end_date, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
    `, [id, spec.product_id, spec.special_price, spec.start_date || null,
        spec.end_date || null, spec.active !== false ? 1 : 0])
    queueSync('specials', id, spec.id ? 'update' : 'insert')
    return { id }
  })

  ipcMain.handle('db:specials:delete', (_e, id) => {
    dbRun("INSERT OR IGNORE INTO deleted_records (table_name, record_id) VALUES ('specials', ?1)", [id])
    dbRun("DELETE FROM specials WHERE id = ?1", [id])
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:specials:bulkUpsert', (_e, specials) => {
    const deletedRows = dbAll("SELECT record_id FROM deleted_records WHERE table_name = 'specials'")
    const deletedIds = new Set(deletedRows.map(r => r.record_id))
    let count = 0
    for (const s of specials) {
      if (!s.id || !s.product_id) continue
      if (deletedIds.has(s.id)) continue
      dbRun(`INSERT OR REPLACE INTO specials (id, product_id, special_price, start_date, end_date, active, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))`,
        [s.id, s.product_id, s.special_price, s.start_date || null, s.end_date || null, s.active !== false ? 1 : 0])
      count++
    }
    scheduleSave()
    return count
  })

  // ── Deals ─────────────────────────────────────────────────────────────────

  ipcMain.handle('db:deals:getAll', () => {
    return dbAll("SELECT * FROM deals ORDER BY active DESC, name")
  })

  ipcMain.handle('db:deals:upsert', (_e, deal) => {
    const id = deal.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO deals (id, name, type, config, start_date, end_date, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
    `, [id, deal.name, deal.type, JSON.stringify(deal.config || {}),
        deal.start_date || null, deal.end_date || null, deal.active !== false ? 1 : 0])
    lanSync.bumpVersion()
    return { id }
  })

  ipcMain.handle('db:deals:delete', (_e, id) => {
    dbRun("INSERT OR IGNORE INTO deleted_records (table_name, record_id) VALUES ('deals', ?1)", [id])
    dbRun("DELETE FROM deal_products WHERE deal_id = ?1", [id])
    dbRun("DELETE FROM deals WHERE id = ?1", [id])
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:deals:getProducts', (_e, dealId) => {
    return dbAll(`
      SELECT dp.*, p.name as product_name, p.price, p.barcode
      FROM deal_products dp
      JOIN products p ON p.id = dp.product_id
      WHERE dp.deal_id = ?1
    `, [dealId])
  })

  ipcMain.handle('db:deals:setProducts', (_e, dealId, productIds) => {
    dbRun("DELETE FROM deal_products WHERE deal_id = ?1", [dealId])
    for (const pid of productIds) {
      dbRun("INSERT INTO deal_products (deal_id, product_id, role) VALUES (?1, ?2, 'trigger')", [dealId, pid])
    }
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:deals:bulkUpsert', (_e, deals) => {
    const deletedRows = dbAll("SELECT record_id FROM deleted_records WHERE table_name = 'deals'")
    const deletedIds = new Set(deletedRows.map(r => r.record_id))
    let count = 0
    for (const d of deals) {
      if (!d.id || !d.name) continue
      if (deletedIds.has(d.id)) continue
      const config = typeof d.config === 'string' ? d.config : JSON.stringify(d.config || {})
      dbRun(`INSERT OR REPLACE INTO deals (id, name, type, config, start_date, end_date, active, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`,
        [d.id, d.name, d.type, config, d.start_date || null, d.end_date || null, d.active !== false ? 1 : 0])
      count++
    }
    scheduleSave()
    return count
  })

  ipcMain.handle('db:dealProducts:bulkUpsert', (_e, dealProducts) => {
    let count = 0
    for (const dp of dealProducts) {
      if (!dp.deal_id || !dp.product_id) continue
      dbRun(`INSERT OR REPLACE INTO deal_products (deal_id, product_id, role)
        VALUES (?1, ?2, ?3)`,
        [dp.deal_id, dp.product_id, dp.role || 'trigger'])
      count++
    }
    scheduleSave()
    return count
  })

  // ── Transactions ────────��──────────��──────────────────────────────────────

  ipcMain.handle('db:transaction:save', (_e, txn) => {
    const txnId = txn.id || uuid()
    const regRow = dbGet("SELECT value FROM settings WHERE key = 'register_id'")
    const registerId = regRow?.value || 'LANE01'

    dbRun(`
      INSERT INTO transactions (id, register_id, staff_id, customer_name, subtotal, tax, discount, total, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
    `, [txnId, registerId, txn.staff_id || null, txn.customer_name || null,
        txn.subtotal, txn.tax, txn.discount || 0, txn.total, txn.status || 'completed'])

    for (const item of txn.items) {
      const itemId = uuid()
      dbRun(`
        INSERT INTO transaction_items (id, transaction_id, product_id, name, qty, unit_price, discount, line_total, tax, deal_id)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      `, [itemId, txnId, item.product_id || null, item.name, item.qty,
          item.unit_price, item.discount || 0, item.line_total, item.tax || 0, item.deal_id || null])
    }

    for (const pay of txn.payments) {
      const payId = uuid()
      dbRun(`
        INSERT INTO payments (id, transaction_id, method, amount, reference, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
      `, [payId, txnId, pay.method, pay.amount, pay.reference || null])
    }

    if (txn.status !== 'voided') {
      for (const item of txn.items) {
        if (item.product_id) {
          dbRun(`UPDATE products SET stock_qty = stock_qty - ?1 WHERE id = ?2 AND track_stock = 1`,
                [item.qty, item.product_id])
        }
      }
    }

    queueSync('transactions', txnId, 'insert')
    saveDB()
    return { id: txnId }
  })

  ipcMain.handle('db:transaction:get', (_e, txnId) => {
    const txn = dbGet("SELECT * FROM transactions WHERE id = ?1", [txnId])
    if (!txn) return null
    txn.items = dbAll("SELECT * FROM transaction_items WHERE transaction_id = ?1", [txnId])
    txn.payments = dbAll("SELECT * FROM payments WHERE transaction_id = ?1", [txnId])
    return txn
  })

  ipcMain.handle('db:transaction:void', (_e, txnId) => {
    const items = dbAll("SELECT product_id, qty FROM transaction_items WHERE transaction_id = ?1", [txnId])
    for (const item of items) {
      if (item.product_id) {
        dbRun("UPDATE products SET stock_qty = stock_qty + ?1 WHERE id = ?2 AND track_stock = 1", [item.qty, item.product_id])
      }
    }
    dbRun("UPDATE transactions SET status = 'voided' WHERE id = ?1", [txnId])
    queueSync('transactions', txnId, 'update')
    return true
  })

  ipcMain.handle('db:transaction:refund', (_e, txnId) => {
    const items = dbAll("SELECT product_id, qty FROM transaction_items WHERE transaction_id = ?1", [txnId])
    for (const item of items) {
      if (item.product_id) {
        dbRun("UPDATE products SET stock_qty = stock_qty + ?1 WHERE id = ?2 AND track_stock = 1", [item.qty, item.product_id])
      }
    }
    dbRun("UPDATE transactions SET status = 'refunded' WHERE id = ?1", [txnId])
    queueSync('transactions', txnId, 'update')
    return true
  })

  ipcMain.handle('db:transaction:getParked', () => {
    return dbAll(`
      SELECT t.*, COUNT(ti.id) as item_count
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.status = 'parked'
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `)
  })

  ipcMain.handle('db:transaction:getItems', (_e, txnId) => {
    return dbAll("SELECT * FROM transaction_items WHERE transaction_id = ?1", [txnId])
  })

  ipcMain.handle('db:transaction:getPayments', (_e, txnId) => {
    return dbAll("SELECT * FROM payments WHERE transaction_id = ?1", [txnId])
  })

  ipcMain.handle('db:transaction:delete', (_e, txnId) => {
    dbRun("DELETE FROM payments WHERE transaction_id = ?1", [txnId])
    dbRun("DELETE FROM transaction_items WHERE transaction_id = ?1", [txnId])
    dbRun("DELETE FROM transactions WHERE id = ?1", [txnId])
    return true
  })

  ipcMain.handle('db:transaction:search', (_e, opts) => {
    let where = ["1=1"]
    let params = []
    let n = 1
    if (opts.dateFrom) { where.push(`date(t.created_at) >= ?${n}`); params.push(opts.dateFrom); n++ }
    if (opts.dateTo) { where.push(`date(t.created_at) <= ?${n}`); params.push(opts.dateTo); n++ }
    if (opts.status) { where.push(`t.status = ?${n}`); params.push(opts.status); n++ }
    if (opts.staffId) { where.push(`t.staff_id = ?${n}`); params.push(opts.staffId); n++ }
    return dbAll(`
      SELECT t.*, s.name as staff_name, COUNT(ti.id) as item_count
      FROM transactions t
      LEFT JOIN staff s ON s.id = t.staff_id
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE ${where.join(' AND ')}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 200
    `, params)
  })

  ipcMain.handle('db:deals:getActive', () => {
    return dbAll(`
      SELECT d.*, GROUP_CONCAT(dp.product_id) as product_ids
      FROM deals d
      LEFT JOIN deal_products dp ON dp.deal_id = d.id
      WHERE d.active = 1
        AND (d.start_date IS NULL OR d.start_date <= date('now'))
        AND (d.end_date IS NULL OR d.end_date >= date('now'))
      GROUP BY d.id
    `)
  })

  // ── Insights handlers ──────────────────────────────────────────────

  ipcMain.handle('db:insights:salesHeatmap', (_e, opts = {}) => {
    const days = opts.days || 30
    return dbAll(`
      SELECT CAST(strftime('%w', created_at) AS INTEGER) as day,
             CAST(strftime('%H', created_at) AS INTEGER) as hour,
             SUM(total) as total,
             COUNT(*) as count
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= datetime('now', ?1)
      GROUP BY day, hour
      ORDER BY day, hour
    `, [`-${days} days`])
  })

  ipcMain.handle('db:insights:demandForecast', () => {
    const rows = dbAll(`
      SELECT CAST(strftime('%w', created_at) AS INTEGER) as day,
             DATE(created_at) as sale_date,
             SUM(total) as day_total,
             COUNT(*) as day_txns
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= datetime('now', '-28 days')
      GROUP BY day, sale_date
      ORDER BY day
    `)
    // Aggregate per day-of-week
    const byDay = {}
    for (const r of rows) {
      if (!byDay[r.day]) byDay[r.day] = { totals: [], txns: [] }
      byDay[r.day].totals.push(r.day_total)
      byDay[r.day].txns.push(r.day_txns)
    }
    const result = []
    for (let d = 0; d <= 6; d++) {
      const entry = byDay[d]
      if (!entry) {
        result.push({ day: d, avgSales: 0, avgTxns: 0, topProducts: [] })
        continue
      }
      const weeks = entry.totals.length || 1
      const avgSales = entry.totals.reduce((a, b) => a + b, 0) / weeks
      const avgTxns = entry.txns.reduce((a, b) => a + b, 0) / weeks
      const topProducts = dbAll(`
        SELECT ti.name, SUM(ti.qty) as total_qty
        FROM transaction_items ti
        JOIN transactions t ON t.id = ti.transaction_id
        WHERE t.status = 'completed'
          AND CAST(strftime('%w', t.created_at) AS INTEGER) = ?1
          AND t.created_at >= datetime('now', '-28 days')
        GROUP BY ti.product_id
        ORDER BY total_qty DESC
        LIMIT 3
      `, [d])
      result.push({ day: d, avgSales, avgTxns, topProducts })
    }
    return result
  })

  ipcMain.handle('db:insights:boughtTogether', () => {
    return dbAll(`
      SELECT a.product_id as product1, b.product_id as product2,
             COUNT(*) as count,
             a.name as product1_name, b.name as product2_name
      FROM transaction_items a
      JOIN transaction_items b ON a.transaction_id = b.transaction_id
        AND a.product_id < b.product_id
      JOIN transactions t ON t.id = a.transaction_id
      WHERE t.status = 'completed'
      GROUP BY a.product_id, b.product_id
      ORDER BY count DESC
      LIMIT 20
    `)
  })

  ipcMain.handle('db:insights:xeroExport', (_e, opts = {}) => {
    const { dateFrom, dateTo } = opts
    const rows = dbAll(`
      SELECT t.id, t.total, t.tax, t.created_at, t.register_id,
             GROUP_CONCAT(ti.name, ', ') as items
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.status = 'completed'
        AND DATE(t.created_at) >= ?1
        AND DATE(t.created_at) <= ?2
      GROUP BY t.id
      ORDER BY t.created_at
    `, [dateFrom, dateTo])
    const lines = ['Date,Description,Reference,Account,Amount,Tax']
    for (const r of rows) {
      const date = r.created_at ? r.created_at.split('T')[0] : ''
      const desc = (r.items || 'Sale').replace(/"/g, '""')
      const ref = r.id.substring(0, 8)
      lines.push(`${date},"${desc}",${ref},Sales,${(r.total || 0).toFixed(2)},${(r.tax || 0).toFixed(2)}`)
    }
    return lines.join('\n')
  })

  ipcMain.handle('db:insights:salesTrend', (_e, opts = {}) => {
    const days = opts.days || 30
    return dbAll(`
      SELECT DATE(created_at) as date,
             SUM(total) as total,
             COUNT(*) as count
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= datetime('now', ?1)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [`-${days} days`])
  })

  // ── End Insights handlers ─────────────────────────────────────────

  ipcMain.handle('db:cash_drawer:log', (_e, entry) => {
    const id = uuid()
    const regRow = dbGet("SELECT value FROM settings WHERE key = 'register_id'")
    dbRun(`
      INSERT INTO cash_drawer (id, register_id, staff_id, action, amount, note, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
    `, [id, regRow?.value || 'LANE01', entry.staff_id || null, entry.action, entry.amount || null, entry.note || null])
    queueSync('cash_drawer', id, 'insert')
    return { id }
  })

  ipcMain.handle('db:cashDrawer:bulkUpsert', (_e, entries) => {
    let count = 0
    for (const e of entries) {
      if (!e.id) continue
      dbRun(`INSERT OR REPLACE INTO cash_drawer (id, register_id, staff_id, action, amount, note, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        [e.id, e.register_id || 'LANE01', e.staff_id || null, e.action, e.amount || null, e.note || null, e.created_at || new Date().toISOString()])
      count++
    }
    scheduleSave()
    return count
  })

  ipcMain.handle('db:cash_drawer:getLog', (_e, date) => {
    return dbAll(`
      SELECT cd.*, s.name as staff_name
      FROM cash_drawer cd
      LEFT JOIN staff s ON s.id = cd.staff_id
      WHERE date(cd.created_at) = ?1
      ORDER BY cd.created_at DESC
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  ipcMain.handle('db:cash_drawer:summary', (_e, date) => {
    const d = date || new Date().toISOString().slice(0, 10)
    const floatRow = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_drawer WHERE action = 'float' AND date(created_at) = ?1`, [d])
    const pickupRow = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_drawer WHERE action = 'pickup' AND date(created_at) = ?1`, [d])
    const dropRow = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM cash_drawer WHERE action = 'drop' AND date(created_at) = ?1`, [d])
    const cashSalesRow = dbGet(`
      SELECT COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      JOIN transactions t ON t.id = p.transaction_id
      WHERE p.method = 'cash' AND t.status = 'completed' AND date(t.created_at) = ?1
    `, [d])
    return {
      float: floatRow?.total || 0,
      pickups: pickupRow?.total || 0,
      drops: dropRow?.total || 0,
      cash_sales: cashSalesRow?.total || 0,
      expected: (floatRow?.total || 0) + (cashSalesRow?.total || 0) + (dropRow?.total || 0) - (pickupRow?.total || 0)
    }
  })

  ipcMain.handle('db:stock:lowStock', () => {
    return dbAll(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = 1 AND p.track_stock = 1 AND p.stock_qty <= 5
      ORDER BY p.stock_qty ASC
      LIMIT 50
    `)
  })

  ipcMain.handle('db:stock:adjust', (_e, productId, qty, reason) => {
    dbRun("UPDATE products SET stock_qty = stock_qty + ?1, updated_at = datetime('now') WHERE id = ?2", [qty, productId])
    queueSync('products', productId, 'update')
    return true
  })

  ipcMain.handle('db:reports:salesByHour', (_e, date) => {
    return dbAll(`
      SELECT strftime('%H', created_at) as hour, COUNT(*) as txn_count, COALESCE(SUM(total), 0) as total
      FROM transactions WHERE status = 'completed' AND date(created_at) = ?1
      GROUP BY hour ORDER BY hour
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  ipcMain.handle('db:reports:salesByMethod', (_e, date) => {
    return dbAll(`
      SELECT p.method, COUNT(DISTINCT p.transaction_id) as txn_count, COALESCE(SUM(p.amount), 0) as total
      FROM payments p
      JOIN transactions t ON t.id = p.transaction_id
      WHERE t.status = 'completed' AND date(t.created_at) = ?1
      GROUP BY p.method
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  ipcMain.handle('db:reports:salesByCategory', (_e, date) => {
    return dbAll(`
      SELECT COALESCE(c.name, 'Other') as category, SUM(ti.line_total) as total, SUM(ti.qty) as qty
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      LEFT JOIN products p ON p.id = ti.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE t.status = 'completed' AND date(t.created_at) = ?1
      GROUP BY c.name ORDER BY total DESC
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  // ── Staff ─��───────────────────────────────────────────────────────────────

  ipcMain.handle('db:staff:login', (_e, pin) => {
    return dbGet("SELECT id, name, role FROM staff WHERE pin = ?1 AND active = 1", [pin])
  })

  ipcMain.handle('db:staff:getAll', () => {
    return dbAll("SELECT id, name, role, active FROM staff ORDER BY name")
  })

  ipcMain.handle('db:staff:getWithPin', (_e, id) => {
    return dbGet("SELECT id, name, pin, role, active FROM staff WHERE id = ?1", [id])
  })

  ipcMain.handle('db:staff:upsert', (_e, s) => {
    const id = s.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO staff (id, name, pin, role, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
    `, [id, s.name, s.pin, s.role || 'cashier', s.active !== false ? 1 : 0])
    queueSync('staff', id, s.id ? 'update' : 'insert')
    return { id }
  })

  ipcMain.handle('db:staff:bulkUpsert', (_e, staffArr) => {
    let count = 0
    for (const s of staffArr) {
      if (!s.id || !s.name) continue
      dbRun(`INSERT OR REPLACE INTO staff (id, name, pin, role, active, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))`,
        [s.id, s.name, s.pin || s.pin_hash || '', s.role || 'cashier', s.active !== false ? 1 : 0])
      count++
    }
    scheduleSave()
    return count
  })

  // ── Settings ────────────────��───────────────────────────────────────��─────

  ipcMain.handle('db:settings:get', (_e, key) => {
    const row = dbGet("SELECT value FROM settings WHERE key = ?1", [key])
    return row?.value ?? null
  })

  ipcMain.handle('db:settings:getAll', () => {
    const rows = dbAll("SELECT key, value FROM settings")
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  })

  ipcMain.handle('db:settings:set', (_e, key, value) => {
    dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)", [key, value])
    const skipSync = ['supabase_last_pull', 'keyboard_page_sizes', 'keyboard_page_names', 'layout_v3_shifted', 'nav_buttons_fixed']
    if (!skipSync.includes(key)) {
      dbRun(`INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES (?1, ?2, ?3, ?4)`,
            ['settings', key, 'update', JSON.stringify({ key, value })])
      lanSync.bumpVersion()
    }
    return true
  })

  ipcMain.handle('db:settings:bulkUpsert', (_e, settings) => {
    let count = 0
    for (const s of settings) {
      if (!s.key) continue
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)", [s.key, s.value ?? null])
      count++
    }
    scheduleSave()
    return count
  })

  // ── Sync Queue ──────────────────────────────────────��─────────────────────

  ipcMain.handle('db:sync:getPending', () => {
    return dbAll("SELECT * FROM sync_queue WHERE synced = 0 ORDER BY id")
  })

  ipcMain.handle('db:sync:markSynced', (_e, ids) => {
    for (const id of ids) {
      dbRun("UPDATE sync_queue SET synced = 1 WHERE id = ?1", [id])
    }
    return true
  })

  ipcMain.handle('db:sync:getDeleted', (_e, tableName) => {
    if (tableName) {
      return dbAll("SELECT record_id FROM deleted_records WHERE table_name = ?1", [tableName])
    }
    return dbAll("SELECT table_name, record_id FROM deleted_records")
  })

  // ── Reporting ──��──────────────��────────────────────────────────��──────────

  ipcMain.handle('db:reports:dailySummary', (_e, date) => {
    return dbGet(`
      SELECT
        COUNT(*) as txn_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(discount), 0) as total_discounts
      FROM transactions
      WHERE status = 'completed'
        AND date(created_at) = ?1
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  ipcMain.handle('db:reports:voidRefundCount', (_e, date) => {
    return dbGet(`
      SELECT
        COALESCE(SUM(CASE WHEN status='voided' THEN 1 ELSE 0 END), 0) as void_count,
        COALESCE(SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END), 0) as refund_count,
        COALESCE(SUM(CASE WHEN status='refunded' THEN total ELSE 0 END), 0) as refund_total
      FROM transactions
      WHERE date(created_at) = ?1
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  ipcMain.handle('db:reports:zReport', (_e, date) => {
    const d = date || new Date().toISOString().slice(0, 10)
    const summary = dbGet(`
      SELECT COUNT(*) as txn_count, COALESCE(SUM(total),0) as total_sales,
        COALESCE(SUM(tax),0) as total_tax, COALESCE(SUM(discount),0) as total_discounts
      FROM transactions WHERE status='completed' AND date(created_at)=?1
    `, [d])
    const voids = dbGet(`SELECT COUNT(*) as cnt FROM transactions WHERE status='voided' AND date(created_at)=?1`, [d])
    const refunds = dbGet(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(ABS(total)),0) as total
      FROM transactions WHERE status='refunded' AND date(created_at)=?1
    `, [d])
    const methods = dbAll(`
      SELECT p.method, COUNT(DISTINCT p.transaction_id) as txn_count, COALESCE(SUM(p.amount),0) as total
      FROM payments p JOIN transactions t ON t.id=p.transaction_id
      WHERE t.status='completed' AND date(t.created_at)=?1 GROUP BY p.method
    `, [d])
    const categories = dbAll(`
      SELECT COALESCE(c.name,'Other') as category, SUM(ti.line_total) as total, SUM(ti.qty) as qty
      FROM transaction_items ti JOIN transactions t ON t.id=ti.transaction_id
      LEFT JOIN products p ON p.id=ti.product_id LEFT JOIN categories c ON c.id=p.category_id
      WHERE t.status='completed' AND date(t.created_at)=?1 GROUP BY c.name ORDER BY total DESC
    `, [d])
    const hourly = dbAll(`
      SELECT strftime('%H',created_at) as hour, COUNT(*) as cnt, COALESCE(SUM(total),0) as total
      FROM transactions WHERE status='completed' AND date(created_at)=?1 GROUP BY hour ORDER BY hour
    `, [d])
    const drawer = dbGet(`
      SELECT COALESCE(SUM(CASE WHEN action='float' THEN amount ELSE 0 END),0) as float_total,
        COALESCE(SUM(CASE WHEN action='pickup' THEN amount ELSE 0 END),0) as pickups,
        COALESCE(SUM(CASE WHEN action='drop' THEN amount ELSE 0 END),0) as drops
      FROM cash_drawer WHERE date(created_at)=?1
    `, [d])
    const cashSales = methods.find(m => m.method === 'cash')?.total || 0
    return {
      date: d, summary, voids: voids?.cnt || 0,
      refunds: { count: refunds?.cnt || 0, total: refunds?.total || 0 },
      methods, categories, hourly, drawer: {
        ...drawer, cash_sales: cashSales,
        expected: (drawer?.float_total || 0) + cashSales + (drawer?.drops || 0) - (drawer?.pickups || 0)
      }
    }
  })

  ipcMain.handle('db:reports:topProducts', (_e, date) => {
    return dbAll(`
      SELECT
        ti.product_id, ti.name,
        SUM(ti.qty) as total_qty,
        SUM(ti.line_total) as total_revenue
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.status = 'completed'
        AND date(t.created_at) = ?1
      GROUP BY ti.product_id, ti.name
      ORDER BY total_qty DESC
      LIMIT 20
    `, [date || new Date().toISOString().slice(0, 10)])
  })

  // ── Keyboard Layout ─────────────────────────────────────────────────────

  ipcMain.handle('db:keyboard:getAll', () => {
    return dbAll("SELECT kb.*, p.image_url AS product_image_url FROM keyboard_buttons kb LEFT JOIN products p ON kb.product_id = p.id WHERE kb.active = 1 ORDER BY kb.page, kb.sort_order")
  })

  ipcMain.handle('db:keyboard:getByPage', (_e, page) => {
    return dbAll("SELECT kb.*, p.image_url AS product_image_url FROM keyboard_buttons kb LEFT JOIN products p ON kb.product_id = p.id WHERE kb.active = 1 AND kb.page = ?1 ORDER BY kb.grid_row, kb.grid_col", [page])
  })

  ipcMain.handle('db:keyboard:getPages', () => {
    return dbAll("SELECT kp.page, kp.name, kp.cols, kp.rows FROM keyboard_pages kp ORDER BY kp.page")
  })

  ipcMain.handle('db:keyboard:createPage', (_e, opts) => {
    const existing = dbAll("SELECT page FROM keyboard_pages ORDER BY page DESC LIMIT 1")
    const nextPage = (existing.length ? existing[0].page : 0) + 1
    dbRun("INSERT INTO keyboard_pages (page, name, cols, rows) VALUES (?1, ?2, ?3, ?4)",
      [nextPage, opts?.name || 'Untitled', opts?.cols || 13, opts?.rows || 7])
    scheduleSave()
    lanSync.bumpVersion()
    return { page: nextPage, name: opts?.name || 'Untitled', cols: opts?.cols || 13, rows: opts?.rows || 7 }
  })

  ipcMain.handle('db:keyboard:renamePage', (_e, page, name) => {
    dbRun("UPDATE keyboard_pages SET name = ?2 WHERE page = ?1", [page, name])
    scheduleSave()
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:keyboard:updatePageSize', (_e, page, cols, rows) => {
    dbRun("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?1, COALESCE((SELECT name FROM keyboard_pages WHERE page = ?1), 'Untitled'), ?2, ?3)", [page, cols, rows])
    scheduleSave()
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:keyboard:upsert', (_e, btn) => {
    const id = btn.id || uuid()
    // Don't resurrect intentionally deleted buttons (e.g. from realtime sync)
    if (btn.id) {
      const deleted = dbGet("SELECT 1 FROM deleted_records WHERE table_name = 'keyboard_buttons' AND record_id = ?1", [btn.id])
      if (deleted) return { id, skipped: true }
    }
    dbRun(`
      INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, datetime('now'))
    `, [id, btn.label, btn.type, btn.price || 0, btn.image || null, btn.color || '#fff',
        btn.bg_color || '#1B4332', btn.parent_id || null, btn.category_filter || null,
        btn.alpha_range || null, btn.sort_order || 0, btn.position || 'grid',
        btn.page || 1, btn.grid_row || 0, btn.grid_col || 0,
        btn.col_span || 1, btn.row_span || 1, btn.product_id || null,
        btn.active !== false ? 1 : 0])
    queueSync('keyboard_buttons', id, btn.id ? 'update' : 'insert')
    return { id }
  })

  ipcMain.handle('db:keyboard:delete', (_e, id) => {
    queueSync('keyboard_buttons', id, 'delete')
    dbRun("INSERT OR IGNORE INTO deleted_records (table_name, record_id) VALUES ('keyboard_buttons', ?1)", [id])
    dbRun("DELETE FROM keyboard_buttons WHERE id = ?1", [id])
    dbRun("DELETE FROM keyboard_buttons WHERE parent_id = ?1", [id])
    return true
  })

  ipcMain.handle('db:keyboard:deletePage', (_e, page) => {
    dbRun("DELETE FROM keyboard_buttons WHERE page = ?1", [page])
    dbRun("DELETE FROM keyboard_pages WHERE page = ?1", [page])
    dbRun("UPDATE keyboard_buttons SET active = 0 WHERE type = 'page_link' AND parent_id = ?1", [String(page)])
    scheduleSave()
    lanSync.bumpVersion()
    return true
  })

  ipcMain.handle('db:keyboard:getAllIncludingInactive', () => {
    return dbAll("SELECT kb.*, p.image_url AS product_image_url FROM keyboard_buttons kb LEFT JOIN products p ON kb.product_id = p.id ORDER BY kb.page, kb.sort_order")
  })

  ipcMain.handle('db:keyboard:bulkUpsert', (_e, buttons) => {
    const deletedRows = dbAll("SELECT record_id FROM deleted_records WHERE table_name = 'keyboard_buttons'")
    const deletedIds = new Set(deletedRows.map(r => r.record_id))
    let count = 0
    for (const b of buttons) {
      if (!b.id || !b.label) continue
      if (deletedIds.has(b.id)) continue
      db.run(`INSERT INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active, updated_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          label=excluded.label, type=excluded.type, price=excluded.price, image=excluded.image,
          color=excluded.color, bg_color=excluded.bg_color, parent_id=excluded.parent_id,
          category_filter=excluded.category_filter, alpha_range=excluded.alpha_range,
          sort_order=excluded.sort_order, position=excluded.position, page=excluded.page,
          grid_row=excluded.grid_row, grid_col=excluded.grid_col, col_span=excluded.col_span,
          row_span=excluded.row_span, product_id=excluded.product_id, active=excluded.active,
          updated_at=excluded.updated_at`,
        [b.id, b.label, b.type, b.price || 0, b.image || null, b.color || '#fff',
         b.bg_color || '#1B4332', b.parent_id || null, b.category_filter || null,
         b.alpha_range || null, b.sort_order || 0, b.position || 'grid',
         b.page || 1, b.grid_row || 0, b.grid_col || 0, b.col_span || 1, b.row_span || 1,
         b.product_id || null, b.active !== false ? 1 : 0])
      count++
    }
    scheduleSave()
    return count
  })

  ipcMain.handle('db:keyboard:copyPage', (_e, srcPage, destPage) => {
    const srcInfo = dbGet("SELECT * FROM keyboard_pages WHERE page = ?1", [srcPage])
    let newPage = destPage
    if (!newPage) {
      const last = dbAll("SELECT page FROM keyboard_pages ORDER BY page DESC LIMIT 1")
      newPage = (last.length ? last[0].page : 0) + 1
      dbRun("INSERT INTO keyboard_pages (page, name, cols, rows) VALUES (?1, ?2, ?3, ?4)",
        [newPage, (srcInfo?.name || 'Page') + ' (copy)', srcInfo?.cols || 13, srcInfo?.rows || 7])
    }
    const buttons = dbAll("SELECT * FROM keyboard_buttons WHERE page = ?1 AND active = 1", [srcPage])
    for (const btn of buttons) {
      const newId = uuid()
      dbRun(`INSERT INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, updated_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,1,datetime('now'))`,
        [newId, btn.label, btn.type, btn.price, btn.image, btn.color, btn.bg_color,
         btn.parent_id, btn.category_filter, btn.alpha_range, btn.sort_order, btn.position || 'grid',
         newPage, btn.grid_row, btn.grid_col, btn.col_span, btn.row_span])
    }
    scheduleSave()
    return { count: buttons.length, newPage }
  })

  const KEYBOARD_GRID_DEFAULT = { columns: 13, rows: 7 }

  function getPageGridSize (page) {
    const row = dbGet("SELECT cols, rows FROM keyboard_pages WHERE page = ?1", [page])
    return { cols: row?.cols || KEYBOARD_GRID_DEFAULT.columns, rows: row?.rows || KEYBOARD_GRID_DEFAULT.rows }
  }

  ipcMain.handle('db:keyboard:export', () => {
    const buttons = dbAll("SELECT * FROM keyboard_buttons ORDER BY page, sort_order")
    const pages = dbAll("SELECT * FROM keyboard_pages ORDER BY page")
    return {
      version: 3,
      exported_at: new Date().toISOString(),
      pages,
      buttons
    }
  })

  ipcMain.handle('db:keyboard:import', (_e, data) => {
    if (!data || !data.buttons || !Array.isArray(data.buttons)) {
      return { error: 'Invalid keyboard layout data' }
    }
    dbRun("DELETE FROM keyboard_buttons")
    dbRun("DELETE FROM keyboard_pages")
    if (data.pages && Array.isArray(data.pages)) {
      for (const pg of data.pages) {
        dbRun("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?1, ?2, ?3, ?4)",
          [pg.page, pg.name || 'Untitled', pg.cols || 13, pg.rows || 7])
      }
    } else {
      dbRun("INSERT INTO keyboard_pages (page, name, cols, rows) VALUES (1, 'Main Register', 13, 7)")
    }
    let count = 0
    let skipped = 0
    for (const btn of data.buttons) {
      const row = btn.grid_row || 0, col = btn.grid_col || 0
      const rs = btn.row_span || 1, cs = btn.col_span || 1
      const pg = getPageGridSize(btn.page || 1)
      if (col + cs > pg.cols || row + rs > pg.rows) {
        skipped++; continue
      }
      const id = btn.id || uuid()
      dbRun(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, updated_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,datetime('now'))`,
        [id, btn.label, btn.type, btn.price || 0, btn.image || null, btn.color || '#fff',
         btn.bg_color || '#1B4332', btn.parent_id || null, btn.category_filter || null,
         btn.alpha_range || null, btn.sort_order || 0, btn.position || 'grid',
         btn.page || 1, row, col, cs, rs, btn.active !== undefined ? btn.active : 1])
      count++
    }
    scheduleSave()
    return { count, skipped }
  })

  ipcMain.handle('db:keyboard:reset', () => {
    dbRun("DELETE FROM keyboard_buttons")
    dbRun("DELETE FROM keyboard_pages")
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    const statements = schema.split(';').filter(s => s.trim())
    let count = 0
    for (const stmt of statements) {
      const stripped = stmt.replace(/^\s*(--[^\n]*\n\s*)*/g, '').trim().toUpperCase()
      if ((stmt.includes('keyboard_buttons') || stmt.includes('keyboard_pages')) && stripped.startsWith('INSERT')) {
        try { db.run(stmt); count++ } catch (_) {}
      }
    }
    scheduleSave()
    return { count }
  })

  ipcMain.handle('db:keyboard:validate', () => {
    const buttons = dbAll("SELECT * FROM keyboard_buttons WHERE active = 1 ORDER BY page, sort_order")
    const issues = []
    const pages = [...new Set(buttons.map(b => b.page || 1))]

    for (const page of pages) {
      const pageButtons = buttons.filter(b => (b.page || 1) === page)
      const occupied = new Map()
      for (const btn of pageButtons) {
        const r = btn.grid_row || 0, c = btn.grid_col || 0
        const rs = btn.row_span || 1, cs = btn.col_span || 1

        // Check grid bounds (per-page size)
        const pgSize = getPageGridSize(page)
        if (c + cs > pgSize.cols || r + rs > pgSize.rows) {
          issues.push({ type: 'out_of_bounds', page, button: btn.label, row: r, col: c, span: `${cs}x${rs}` })
        }

        for (let dr = 0; dr < rs; dr++) {
          for (let dc = 0; dc < cs; dc++) {
            const key = `${r + dr}-${c + dc}`
            if (occupied.has(key)) {
              issues.push({ type: 'overlap', page, row: r + dr, col: c + dc, buttons: [occupied.get(key), btn.label] })
            }
            occupied.set(key, btn.label)
          }
        }
      }
      // Check for page_link buttons pointing to non-existent pages
      for (const btn of pageButtons) {
        if (btn.type === 'page_link' && btn.parent_id) {
          const targetPage = parseInt(btn.parent_id)
          if (!pages.includes(targetPage)) {
            issues.push({ type: 'broken_link', page, button: btn.label, target_page: targetPage })
          }
        }
      }
    }
    return { issues, button_count: buttons.length, page_count: pages.length }
  })

  // ── Bulk Import ────────────���──────────────────────────────────────────────

  ipcMain.handle('db:import:products', (_e, products) => {
    const catMap = {}
    let catOrder = 0
    let imported = 0

    for (const p of products) {
      if (p.category && !catMap[p.category]) {
        const catId = uuid()
        catMap[p.category] = catId
        dbRun(`INSERT OR IGNORE INTO categories (id, name, sort_order, updated_at) VALUES (?1, ?2, ?3, datetime('now'))`,
              [catId, p.category, catOrder++])
      }
      const id = uuid()
      const barcode = p.barcode || null
      const plu = p.plu || (barcode && /^\d{3,6}$/.test(barcode) ? barcode : null)
      dbRun(`INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, unit, active, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, datetime('now'))`,
            [id, barcode, plu, p.name, catMap[p.category] || null, p.price, p.unit || 'each'])
      imported++
    }

    saveDB()
    return { imported, categories: Object.keys(catMap).length }
  })

  // ── Hardware — Auto-detecting, cross-platform POS peripherals ───────────────

  const { execSync: hwExec } = require('child_process')
  const net = require('net')
  const os = require('os')
  const isWin = os.platform() === 'win32'
  const isMac = os.platform() === 'darwin'
  const RAWPRINT_SCRIPT = path.join(__dirname, 'rawprint.ps1')
  const OPOS_BRIDGE = path.join(__dirname, 'opos-bridge.ps1')

  // ── OPOS COM bridge (via PowerShell) ────────────────────────────────────────

  let oposAvailable = null  // null = not checked, object = check result
  let oposPrinterName = ''  // logical device name from SetupPOS
  let oposDrawerName = ''
  let oposScaleName = ''

  function oposCall (action, opts = {}) {
    if (!isWin) return { ok: false, error: 'OPOS only available on Windows' }
    const args = ['-ExecutionPolicy', 'Bypass', '-NoProfile', '-NonInteractive', '-File', OPOS_BRIDGE, '-Action', action]
    if (opts.deviceName) { args.push('-DeviceName', opts.deviceName) }
    if (opts.deviceType) { args.push('-DeviceType', opts.deviceType) }
    if (opts.data) { args.push('-Data', opts.data) }
    try {
      const result = hwExec(`powershell ${args.map(a => `"${a}"`).join(' ')}`, { timeout: opts.timeout || 10000, encoding: 'utf-8' }).trim()
      return JSON.parse(result)
    } catch (e) {
      const stderr = e.stderr || e.message || ''
      return { ok: false, error: `OPOS bridge error: ${stderr.substring(0, 200)}` }
    }
  }

  function checkOpos () {
    if (oposAvailable !== null) return oposAvailable
    appLog('info', 'hardware', 'Checking OPOS availability...')
    const result = oposCall('check')
    if (result.ok && result.data) {
      oposAvailable = result.data
      appLog('info', 'hardware', `OPOS: printer=${result.data.printer} drawer=${result.data.drawer} scale=${result.data.scale}`)
      if (result.data.progIds) {
        for (const p of result.data.progIds) appLog('info', 'hardware', `  OPOS ${p.type}: ${p.progId}`)
      }
    } else {
      oposAvailable = { printer: false, drawer: false, scale: false }
      appLog('info', 'hardware', `OPOS not available: ${result.error || 'check failed'}`)
    }
    // Load saved OPOS device names
    oposPrinterName = dbGet("SELECT value FROM settings WHERE key='opos_printer_name'")?.value || ''
    oposDrawerName = dbGet("SELECT value FROM settings WHERE key='opos_drawer_name'")?.value || ''
    oposScaleName = dbGet("SELECT value FROM settings WHERE key='opos_scale_name'")?.value || ''
    return oposAvailable
  }

  function listOposDevices () {
    return oposCall('list-devices', { timeout: 5000 })
  }

  function oposPrint (text) {
    return oposCall('print', { deviceName: oposPrinterName, data: text, timeout: 15000 })
  }

  function oposPrintRaw (base64Data) {
    return oposCall('print-raw', { deviceName: oposPrinterName, data: base64Data, timeout: 15000 })
  }

  function oposCut () {
    return oposCall('cut', { deviceName: oposPrinterName, timeout: 5000 })
  }

  function oposOpenDrawer () {
    return oposCall('open-drawer', { deviceName: oposDrawerName, timeout: 5000 })
  }

  function oposReadScale () {
    return oposCall('read-scale', { deviceName: oposScaleName, timeout: 8000 })
  }

  // Optional native HID support (for USB scale weight reading)
  let HID = null
  try { HID = require('node-hid') } catch (e) { appLog('warn', 'hardware', 'node-hid not available', e.message) }

  // Serial port support (for RS-232 scales)
  let SerialPortLib = null
  try { SerialPortLib = require('serialport') } catch (e) { appLog('warn', 'hardware', 'serialport not available', e.message) }

  // ── Vendor ID database (comprehensive, correctly labelled) ─────────────────

  const PRINTER_VENDORS = {
    0x04B8: 'Epson', 0x0519: 'Star Micronics', 0x1504: 'Bixolon',
    0x2730: 'Citizen', 0x1D90: 'Citizen', 0x0DD4: 'Custom Engineering',
    0x0416: 'Winbond/Star', 0x04E8: 'Samsung/Bixolon', 0x20D1: 'Sewoo',
    0x0A5F: 'Zebra', 0x0483: 'STMicro (thermal)', 0x1FC9: 'NXP (thermal)',
    0x0FE6: 'ICS Advent (USB adapter)',
    0x067B: 'Prolific (USB-parallel)', 0x1CBE: 'Luminary/TI (thermal)',
    0x0B00: 'Sewoo/Lukhan', 0x0493: 'Suyin (embedded printer)',
  }
  const SCALE_VENDORS = {
    0x0EB8: 'Mettler Toledo', 0x0B67: 'Fairbanks', 0x0922: 'Dymo',
    0x1446: 'Stamps.com/Dymo', 0x0403: 'FTDI (serial bridge)',
    0x2474: 'CAS (USB)', 0x0B6A: 'Ishida', 0x2A2B: 'Avery Berkel',
  }
  const SCANNER_VENDORS = {
    0x05E0: 'Symbol/Zebra', 0x0A5F: 'Zebra', 0x0C2E: 'Honeywell',
    0x05F9: 'Datalogic (legacy)', 0x080C: 'Datalogic',
    0x065A: 'Opticon', 0x1EAB: 'Newland', 0x2DD6: 'Generic scanner',
    0x04B4: 'Cypress (scanner HID)',
  }
  const SCALE_USAGE_PAGE = 0x8D
  const RECEIPT_KEYWORDS = ['epson', 'tm-t', 'tm-u', 'tm-m', 'star ', 'tsp', 'bixolon', 'srp-', 'citizen', 'ct-s', 'ct-e', 'custom', 'sewoo', 'slk-', 'thermal', 'receipt', 'pos printer', '80mm', '58mm', '80normal', '58normal', 'generic / text only', 'generic/text']
  const EPSON_MODELS = {
    0x0E03: 'TM-T20', 0x0E15: 'TM-T20II', 0x0E20: 'TM-T20III', 0x0E22: 'TM-T20IIIL',
    0x0E11: 'TM-T82', 0x0E14: 'TM-T82II', 0x0E32: 'TM-T82III', 0x0E38: 'TM-T82IIIL',
    0x0202: 'TM-T88IV/V', 0x0E28: 'TM-T88VI', 0x0E2A: 'TM-T88VII',
    0x0E1E: 'TM-m30', 0x0E36: 'TM-m30II', 0x0E40: 'TM-m30III',
    0x0E26: 'TM-m10', 0x0E25: 'TM-m50',
    0x0E09: 'TM-U220', 0x0E04: 'TM-U295',
  }
  const SERIAL_ADAPTER_VIDS = { 0x0403: 'FTDI', 0x067B: 'Prolific', 0x1A86: 'CH340', 0x10C4: 'Silicon Labs CP210x' }

  // ── ESC/POS command bytes ──────────────────────────────────────────────────

  const ESC = 0x1B, GS = 0x1D, DLE = 0x10
  const ESCPOS = {
    INIT: Buffer.from([ESC, 0x40]),
    ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
    ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
    ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
    BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
    BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
    DOUBLE_SIZE: Buffer.from([GS, 0x21, 0x11]),
    NORMAL_SIZE: Buffer.from([GS, 0x21, 0x00]),
    PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]),
    FEED_3: Buffer.from([ESC, 0x64, 0x03]),
    DRAWER_KICK: Buffer.from([ESC, 0x70, 0x00, 0x37, 0x79]),
    BARCODE_HEIGHT: Buffer.from([GS, 0x68, 0x3C]),
    BARCODE_WIDTH: Buffer.from([GS, 0x77, 0x02]),
    BARCODE_HRI_BELOW: Buffer.from([GS, 0x48, 0x02]),
  }

  // ── Hardware state (populated by probe, persisted via settings) ────────────

  let hwPrinter = null  // { name, port, interface, ip, networkPort, vid, pid }
  let hwScale = null     // { path, vid, pid, vendor, product }
  let hwScanner = null
  let hwPrinterReady = false
  let hwPrinterCheckTime = 0

  function loadSavedHardwareConfig () {
    const iface = dbGet("SELECT value FROM settings WHERE key='hw_printer_interface'")?.value
    const name = dbGet("SELECT value FROM settings WHERE key='hw_printer_name'")?.value
    const port = dbGet("SELECT value FROM settings WHERE key='hw_printer_port'")?.value
    if (iface === 'network') {
      const ip = dbGet("SELECT value FROM settings WHERE key='hw_printer_ip'")?.value
      const nport = dbGet("SELECT value FROM settings WHERE key='hw_printer_network_port'")?.value || '9100'
      if (ip) hwPrinter = { name: name || 'Network Printer', interface: 'network', ip, networkPort: parseInt(nport), configured: true }
    } else if (name && iface) {
      hwPrinter = { name, port: port || '', interface: iface, configured: true }
    }
    const scaleType = dbGet("SELECT value FROM settings WHERE key='hw_scale_type'")?.value
    const scalePort = dbGet("SELECT value FROM settings WHERE key='hw_scale_port'")?.value
    const scalePath = dbGet("SELECT value FROM settings WHERE key='hw_scale_path'")?.value
    const scaleBaud = parseInt(dbGet("SELECT value FROM settings WHERE key='hw_scale_baud'")?.value || '9600')
    const scaleProtocol = dbGet("SELECT value FROM settings WHERE key='hw_scale_protocol'")?.value || 'mt8217'
    if (scaleType === 'serial' && scalePort) {
      hwScale = { type: 'serial', port: scalePort, baud: scaleBaud, protocol: scaleProtocol, configured: true, vendor: 'Serial Scale' }
    } else if (scalePath) {
      hwScale = { type: 'hid', path: scalePath, configured: true }
    }
  }

  // ── USB device enumeration (multi-source, cross-platform) ──────────────────

  function enumerateDevices () {
    const devices = []
    const seen = new Set()
    function addDevice (d) {
      const key = `${d.vendorId}:${d.productId}:${d.product || ''}`
      if (seen.has(key)) return
      seen.add(key)
      devices.push(d)
    }

    // Source 1: node-hid (cross-platform, gets HID usage info for scales)
    if (HID) {
      try {
        for (const d of HID.devices()) {
          addDevice({
            vendorId: d.vendorId, productId: d.productId,
            manufacturer: d.manufacturer || '', product: d.product || '',
            path: d.path || '', usagePage: d.usagePage || 0,
            usage: d.usage || 0, release: d.release || 0,
            interface: d.interface ?? -1, source: 'hid',
          })
        }
      } catch (e) { appLog('warn', 'hardware', 'HID enumeration failed', e.message) }
    }

    // Source 2: Serial ports (COM ports for RS-232 scales etc.)
    if (SerialPortLib) {
      try {
        // SerialPort.list() is async but we need sync here — cache from last probe
        // Actual serial enumeration happens in probeHardware() async path
      } catch (e) { appLog('warn', 'hardware', 'Serial port enumeration failed', e.message) }
    }

    // Source 3: Platform-specific (catches non-HID USB devices)
    if (isWin) {
      try {
        const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-PnpDevice -Class 'USB','Printer','HIDClass','Ports','PrintQueue','Image','Media' -Status OK -ErrorAction SilentlyContinue | Select-Object FriendlyName,InstanceId,Class | ConvertTo-Json -Compress"`, { timeout: 8000, encoding: 'utf-8' }).trim()
        if (raw) {
          const parsed = JSON.parse(raw)
          for (const d of (Array.isArray(parsed) ? parsed : [parsed])) {
            const vid = (d.InstanceId?.match(/VID_([0-9A-F]{4})/i) || [])[1]
            const pid = (d.InstanceId?.match(/PID_([0-9A-F]{4})/i) || [])[1]
            addDevice({
              vendorId: vid ? parseInt(vid, 16) : 0, productId: pid ? parseInt(pid, 16) : 0,
              manufacturer: '', product: d.FriendlyName || '', path: d.InstanceId || '',
              usagePage: 0, usage: 0, deviceClass: d.Class || '', source: 'pnp',
            })
          }
        }
      } catch (e) {
        appLog('warn', 'hardware', 'PnP enumeration failed, trying CIM fallback', e.message)
        try {
          const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_PnPEntity -Filter \\"PNPClass='USB' OR PNPClass='Printer' OR PNPClass='Ports'\\" -ErrorAction SilentlyContinue | Select-Object Name,DeviceID | ConvertTo-Json -Compress"`, { timeout: 8000, encoding: 'utf-8' }).trim()
          if (raw) {
            const parsed = JSON.parse(raw)
            for (const d of (Array.isArray(parsed) ? parsed : [parsed])) {
              const vid = (d.DeviceID?.match(/VID_([0-9A-F]{4})/i) || [])[1]
              const pid = (d.DeviceID?.match(/PID_([0-9A-F]{4})/i) || [])[1]
              if (vid) addDevice({ vendorId: parseInt(vid, 16), productId: pid ? parseInt(pid, 16) : 0, manufacturer: '', product: d.Name || '', path: d.DeviceID || '', usagePage: 0, usage: 0, source: 'cim' })
            }
          }
        } catch (e2) { appLog('warn', 'hardware', 'CIM fallback also failed', e2.message) }
      }
    } else if (isMac) {
      try {
        const raw = hwExec('system_profiler SPUSBDataType -json 2>/dev/null', { timeout: 10000, encoding: 'utf-8' })
        const data = JSON.parse(raw)
        const walk = (items) => {
          if (!items) return
          for (const item of items) {
            const vid = parseInt((item.vendor_id || '').replace('0x', ''), 16) || 0
            const pid = parseInt((item.product_id || '').replace('0x', ''), 16) || 0
            if (vid) addDevice({ vendorId: vid, productId: pid, manufacturer: item.manufacturer || '', product: item._name || '', path: '', usagePage: 0, usage: 0, source: 'profiler' })
            if (item._items) walk(item._items)
          }
        }
        if (data.SPUSBDataType) walk(data.SPUSBDataType)
      } catch (e) { appLog('warn', 'hardware', 'macOS USB enumeration failed', e.message) }
    } else {
      try {
        const raw = hwExec('lsusb 2>/dev/null', { timeout: 5000, encoding: 'utf-8' })
        for (const line of raw.split('\n')) {
          const m = line.match(/ID\s+([0-9a-f]{4}):([0-9a-f]{4})\s+(.*)/i)
          if (m) addDevice({ vendorId: parseInt(m[1], 16), productId: parseInt(m[2], 16), manufacturer: '', product: m[3].trim(), path: '', usagePage: 0, usage: 0, source: 'lsusb' })
        }
      } catch (e) { appLog('warn', 'hardware', 'Linux USB enumeration failed', e.message) }
    }

    return devices
  }

  // ── Classify devices ───────────────────────────────────────────────────────

  function classifyDevice (d) {
    if (d.vendorId && PRINTER_VENDORS[d.vendorId]) {
      const model = (d.vendorId === 0x04B8 && EPSON_MODELS[d.productId]) ? ` ${EPSON_MODELS[d.productId]}` : ''
      return { type: 'printer', vendor: PRINTER_VENDORS[d.vendorId] + model }
    }
    if (d.vendorId && SCALE_VENDORS[d.vendorId]) return { type: 'scale', vendor: SCALE_VENDORS[d.vendorId] }
    if (d.vendorId && SCANNER_VENDORS[d.vendorId]) return { type: 'scanner', vendor: SCANNER_VENDORS[d.vendorId] }
    if (d.usagePage === SCALE_USAGE_PAGE) return { type: 'scale', vendor: d.manufacturer || 'HID Scale' }
    if (d.source === 'serial') return { type: 'serial', vendor: d.manufacturer || 'Serial Port' }
    const name = (d.product || '').toLowerCase()
    if (name.includes('scanner') || name.includes('barcode') || name.includes('reader')) return { type: 'scanner', vendor: d.manufacturer || '' }
    if (RECEIPT_KEYWORDS.some(k => name.includes(k))) return { type: 'printer', vendor: d.manufacturer || '' }
    if (name.includes('scale') || name.includes('weigh')) return { type: 'scale', vendor: d.manufacturer || '' }
    return { type: 'unknown', vendor: d.manufacturer || '' }
  }

  // ── Printer auto-detection ─────────────────────────────────────────────────

  function getWindowsQueues () {
    if (!isWin) return []
    try {
      const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-Printer | Select-Object Name,PortName,DriverName,PrinterStatus | ConvertTo-Json -Compress"`, { timeout: 10000, encoding: 'utf-8' }).trim()
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch (e) {
      appLog('warn', 'hardware', 'Printer queue scan failed', e.message)
      return []
    }
  }

  function clearPrinterQueue (queueName) {
    try {
      // Clear stuck print jobs and resume the queue
      hwExec(`powershell -NoProfile -NonInteractive -Command "Get-PrintJob -PrinterName '${queueName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Remove-PrintJob -ErrorAction SilentlyContinue; Set-Printer -Name '${queueName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue"`, { timeout: 5000, encoding: 'utf-8' })
    } catch (_) {}
  }

  function getQueueStatus (queueName) {
    try {
      const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-Printer -Name '${queueName.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Select-Object PrinterStatus,JobCount | ConvertTo-Json -Compress"`, { timeout: 3000, encoding: 'utf-8' }).trim()
      if (raw) return JSON.parse(raw)
    } catch (_) {}
    return null
  }

  // ── Resume a printer queue via WMI (clears Error state, no admin needed) ───
  function resumePrinterQueue (queueName) {
    try {
      hwExec(`powershell -NoProfile -NonInteractive -Command "$p = Get-WmiObject Win32_Printer -Filter \\"Name='${queueName.replace(/'/g, "''").replace(/\\/g, '\\\\')}'\\" -ErrorAction SilentlyContinue; if ($p) { $p.CancelAllJobs() | Out-Null; $p.Resume() | Out-Null }"`, { timeout: 3000, encoding: 'utf-8' })
      appLog('info', 'printer', `WMI Resume sent for "${queueName}"`)
    } catch (e) {
      appLog('warn', 'printer', `WMI Resume failed for "${queueName}": ${e.message}`)
    }
  }

  // Clean up only printer queues that WE created (not system/driver-installed ones)
  function cleanupDuplicateQueues () {
    try {
      // Only remove queues explicitly created by this app — never touch driver-installed queues
      hwExec(`powershell -NoProfile -NonInteractive -Command "Remove-Printer -Name 'Crisp Receipt Printer' -ErrorAction SilentlyContinue"`, { timeout: 3000, encoding: 'utf-8' })
    } catch (_) {}
  }

  function testQueueRaw (queueName) {
    // Clear stuck jobs and resume queue first
    clearPrinterQueue(queueName)

    // Check status — if errored, try sending data then check if job gets stuck
    const tmpFile = path.join(os.tmpdir(), `crisp-test-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, ESCPOS.INIT)
    try {
      const result = hwExec(`powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${RAWPRINT_SCRIPT}" -PrinterName "${queueName.replace(/"/g, '`"')}" -FilePath "${tmpFile}"`, { timeout: 8000, encoding: 'utf-8' }).trim()
      if (!result.startsWith('OK')) return false

      // Wait briefly then check if jobs are stuck (means printer is offline/errored)
      try {
        const post = getQueueStatus(queueName)
        if (post && post.JobCount > 0) {
          appLog('warn', 'hardware', `Queue "${queueName}" has ${post.JobCount} stuck jobs (status ${post.PrinterStatus}) — printer offline or errored`)
          clearPrinterQueue(queueName)
          return false
        }
      } catch (_) {}
      return true
    } catch (_) {
      return false
    } finally {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
    }
  }

  function detectPrinter (devices) {
    let usbPrinter = null
    for (const d of devices) {
      if (!d.vendorId) continue
      const cls = classifyDevice(d)
      if (cls.type === 'printer') {
        usbPrinter = { ...d, vendor: cls.vendor }
        appLog('info', 'hardware', `USB printer detected: ${cls.vendor} (VID:${d.vendorId.toString(16)} PID:${d.productId.toString(16)})`)
        break
      }
    }

    if (!isWin) {
      // Saved config on non-Windows — trust it (no queue check needed for CUPS)
      if (hwPrinter?.configured && hwPrinter.name) return hwPrinter
      try {
        const raw = hwExec('lpstat -p 2>/dev/null', { timeout: 5000, encoding: 'utf-8' })
        for (const line of raw.split('\n')) {
          const name = line.match(/printer (\S+)/)?.[1]
          if (name) {
            const lower = name.toLowerCase()
            if (RECEIPT_KEYWORDS.some(k => lower.includes(k)) || usbPrinter) {
              return { name, interface: 'cups', vid: usbPrinter?.vendorId, pid: usbPrinter?.productId, vendor: usbPrinter?.vendor || '' }
            }
          }
        }
      } catch (_) {}
      return usbPrinter ? { name: usbPrinter.product || usbPrinter.vendor, interface: 'unknown', vid: usbPrinter.vendorId, pid: usbPrinter.productId, vendor: usbPrinter.vendor, error: 'USB printer found but no CUPS queue' } : null
    }

    // Windows: get all queues once (used by both saved-config verify and fresh scan)
    const queues = getWindowsQueues()

    // Verify saved config — check the queue still exists
    if (hwPrinter?.configured && hwPrinter.name && hwPrinter.interface === 'windows') {
      const match = queues.find(q => q.Name === hwPrinter.name)
      if (match) {
        appLog('info', 'hardware', `Saved printer verified: ${hwPrinter.name} (queue exists)`)
        resumePrinterQueue(hwPrinter.name)
        return hwPrinter
      }
      // Saved queue gone — check if it was renamed (e.g. "Printer (Copy 1)")
      const baseName = hwPrinter.name.replace(/\s*\(Copy \d+\)$/i, '').toLowerCase()
      const renamed = queues.find(q => q.Name.replace(/\s*\(Copy \d+\)$/i, '').toLowerCase() === baseName)
      if (renamed) {
        appLog('info', 'hardware', `Saved printer renamed: "${hwPrinter.name}" → "${renamed.Name}"`)
        hwPrinter.name = renamed.Name
        hwPrinter.port = renamed.PortName || hwPrinter.port
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_name', ?1)", [renamed.Name])
        scheduleSave()
        resumePrinterQueue(renamed.Name)
        return hwPrinter
      }
      appLog('warn', 'hardware', `Saved printer "${hwPrinter.name}" no longer exists — rescanning`)
      hwPrinter = null  // clear stale config
    } else if (hwPrinter?.configured && hwPrinter.interface === 'network') {
      return hwPrinter
    }

    // Scan Windows queues — score by keyword match, USB port, prefer base name over numbered copies
    const scored = queues.map(q => {
      const name = (q.Name || '').toLowerCase()
      const driver = (q.DriverName || '').toLowerCase()
      const port = q.PortName || ''
      let score = 0
      if (RECEIPT_KEYWORDS.some(k => name.includes(k) || driver.includes(k))) score += 100
      if (port.startsWith('USB')) score += 50
      if (/xps|pdf|fax|onenote|send to/i.test(name)) score -= 200
      if (/\(\d+\)/.test(q.Name)) score -= 50  // strongly penalise duplicates
      return { ...q, score }
    }).sort((a, b) => b.score - a.score)

    // Log all queues for debugging
    appLog('info', 'hardware', `Windows queues: ${scored.map(q => `"${q.Name}" port=${q.PortName} driver=${q.DriverName} score=${q.score}`).join(' | ') || 'none found'}`)

    // Pick the best-scoring receipt queue — NO test sends (they block startup and create stuck jobs)
    const best = scored.find(q => q.score > 0)
    if (best) {
      // Resume the queue via WMI to clear any error state
      resumePrinterQueue(best.Name)
      appLog('info', 'hardware', `Auto-detected printer: ${best.Name} (${best.PortName}, score ${best.score})`)
      return { name: best.Name, port: best.PortName, driver: best.DriverName, interface: 'windows', vid: usbPrinter?.vendorId, pid: usbPrinter?.productId, vendor: usbPrinter?.vendor || '' }
    }

    // Return best available for user selection
    if (usbPrinter) return { name: usbPrinter.product || usbPrinter.vendor, interface: 'windows', vid: usbPrinter.vendorId, pid: usbPrinter.productId, vendor: usbPrinter.vendor, needsSetup: true, availableQueues: scored.map(q => ({ name: q.Name, port: q.PortName, driver: q.DriverName })), error: 'USB printer found but no queue matched. Select your printer below.' }
    if (queues.length) return { name: '', interface: 'windows', needsSetup: true, availableQueues: scored.map(q => ({ name: q.Name, port: q.PortName, driver: q.DriverName })), error: 'No receipt printer auto-detected. Select your printer below.' }
    return null
  }

  // ── Send raw bytes to printer (multi-backend) ─────────────────────────────

  function sendToPrinter (data) {
    if (!hwPrinter) return Promise.resolve({ ok: false, detail: 'No printer detected. Run Probe All Devices in Hardware tab.' })
    if (hwPrinter.interface === 'network') return sendViaTCP(data, hwPrinter.ip, hwPrinter.networkPort || 9100)
    if (hwPrinter.interface === 'windows') return Promise.resolve(sendViaSpooler(data, hwPrinter.name))
    if (hwPrinter.interface === 'cups') return Promise.resolve(sendViaCUPS(data, hwPrinter.name))
    return Promise.resolve({ ok: false, detail: `No working print backend for interface: ${hwPrinter.interface}` })
  }

  function sendViaSpooler (data, printerName) {
    const tmpFile = path.join(os.tmpdir(), `crisp-receipt-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, data)
    // Resume queue via WMI (clears Error state without admin)
    resumePrinterQueue(printerName)
    appLog('info', 'printer', `Sending ${data.length} bytes to "${printerName}" via rawprint.ps1`)
    try {
      // Use external rawprint.ps1 to avoid quote-escaping issues with inline C# P/Invoke
      const result = hwExec(`powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${RAWPRINT_SCRIPT}" -PrinterName "${printerName.replace(/"/g, '`"')}" -FilePath "${tmpFile}"`, { timeout: 15000, encoding: 'utf-8' }).trim()
      appLog('info', 'printer', `P/Invoke result: ${result}`)
      if (result.includes('OK')) return { ok: true, detail: result }
      return { ok: false, detail: result || 'P/Invoke returned no output' }
    } catch (e) {
      appLog('error', 'printer', `P/Invoke error: ${e.stderr || e.message}`)
      return { ok: false, detail: e.stderr || e.message }
    } finally {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
    }
  }

  function sendViaTCP (data, ip, port) {
    return new Promise(resolve => {
      let done = false
      const finish = (result) => { if (!done) { done = true; resolve(result) } }
      const client = net.createConnection({ host: ip, port }, () => {
        client.write(data, () => { client.end(); finish({ ok: true, detail: `Sent ${data.length} bytes to ${ip}:${port}` }) })
      })
      client.on('error', err => { client.destroy(); finish({ ok: false, detail: `TCP error: ${err.message}` }) })
      client.setTimeout(5000, () => { client.destroy(); finish({ ok: false, detail: 'TCP timeout (5s)' }) })
    })
  }

  function sendViaCUPS (data, printerName) {
    const tmpFile = path.join(os.tmpdir(), `crisp-receipt-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, data)
    try {
      hwExec(`lp -o raw -d "${printerName}" "${tmpFile}"`, { timeout: 10000 })
      return { ok: true, detail: `Sent via CUPS to ${printerName}` }
    } catch (e) {
      return { ok: false, detail: e.message }
    } finally {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
    }
  }

  // ── Scale detection & reading (USB HID + RS-232 serial) ────────────────────

  let hwScalePort = null  // persistent SerialPort instance for serial scales
  let cachedSerialPorts = []  // cached from last async enumeration

  async function enumerateSerialPorts () {
    if (!SerialPortLib) return []
    try {
      const ports = await SerialPortLib.SerialPort.list()
      cachedSerialPorts = ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || '',
        vendorId: p.vendorId ? parseInt(p.vendorId, 16) : 0,
        productId: p.productId ? parseInt(p.productId, 16) : 0,
        serialNumber: p.serialNumber || '',
        pnpId: p.pnpId || '',
      }))
      appLog('info', 'hardware', `Serial ports found: ${cachedSerialPorts.map(p => p.path).join(', ') || 'none'}`)
      return cachedSerialPorts
    } catch (e) {
      appLog('warn', 'hardware', 'Serial port enumeration failed', e.message)
      return []
    }
  }

  async function detectScale (devices, serialPorts) {
    // Fast path: if scale port is already open and being polled, it's working — skip everything
    if (hwScale && hwScalePort?.isOpen) {
      appLog('info', 'hardware', `Scale already connected on ${hwScale.port} — skipping detection`)
      return hwScale
    }
    // Fast path: saved config exists, just verify it works
    if (hwScale?.configured) {
      if (hwScale.type === 'serial' && hwScale.port && SerialPortLib) {
        try {
          const verify = await testSerialScale(hwScale.port, hwScale.baud || 9600, hwScale.protocol || 'mt8217', 2000)
          if (verify.ok) {
            appLog('info', 'hardware', `Saved scale verified: ${hwScale.port} (${hwScale.protocol} @ ${hwScale.baud})`)
            return hwScale
          }
          appLog('warn', 'hardware', `Saved scale config FAILED on ${hwScale.port}: ${verify.error} — scanning...`)
        } catch (e) {
          appLog('warn', 'hardware', `Saved scale config error on ${hwScale.port}: ${e.message} — scanning...`)
        }
        hwScale = null
      } else if (hwScale.type === 'hid' && hwScale.path && HID) {
        return hwScale
      }
    }

    // Priority 1: USB HID scale (direct weight reading via HID protocol)
    if (HID) {
      const hidDevs = HID.devices()
      for (const d of hidDevs) {
        if (d.vendorId && SCALE_VENDORS[d.vendorId] && d.vendorId !== 0x0403) {
          appLog('info', 'hardware', `USB HID scale detected: ${SCALE_VENDORS[d.vendorId]}`)
          return { type: 'hid', path: d.path, vid: d.vendorId, pid: d.productId, vendor: SCALE_VENDORS[d.vendorId], product: d.product || '' }
        }
      }
      for (const d of hidDevs) {
        if (d.usagePage === SCALE_USAGE_PAGE) {
          appLog('info', 'hardware', `USB HID scale detected via usage page: ${d.manufacturer || 'Unknown'}`)
          return { type: 'hid', path: d.path, vid: d.vendorId, pid: d.productId, vendor: d.manufacturer || 'HID Scale', product: d.product || '' }
        }
      }
    }

    // Priority 2: Serial ports — brute-force test all ports with all protocol/baud combos
    if (serialPorts && serialPorts.length > 0 && SerialPortLib) {
      const scaleAdapterVids = new Set([0x0403, 0x10C4])
      // Skip ports that are known non-scale devices (payment terminals, etc.)
      const skipVids = new Set([0x11CA]) // VeriFone payment terminals
      // Skip ports already held open by us (e.g. scale polling)
      const ourOpenPort = hwScalePort?.isOpen ? hwScalePort.path : null
      const candidates = serialPorts.filter(sp => !sp.vendorId || !skipVids.has(sp.vendorId)).filter(sp => sp.path !== ourOpenPort)
      // Try known adapter VIDs first, then all other ports
      const sorted = [...candidates].sort((a, b) => {
        const aKnown = a.vendorId && scaleAdapterVids.has(a.vendorId) ? 0 : 1
        const bKnown = b.vendorId && scaleAdapterVids.has(b.vendorId) ? 0 : 1
        return aKnown - bKnown
      })
      const portErrors = []
      for (const sp of sorted) {
        // Quick open test: try opening at default baud to check access before brute-forcing
        let canOpen = true
        try {
          const quickTest = await testSerialScale(sp.path, 9600, 'sics', 1500)
          if (quickTest.ok) {
            appLog('info', 'hardware', `Scale auto-detected on ${sp.path} — sics @ 9600 baud`)
            return { type: 'serial', port: sp.path, protocol: 'sics', baud: 9600, vendor: sp.manufacturer || 'Serial Scale', product: sp.path, detected: true }
          }
          if (quickTest.error && /access denied|permission|locked|busy|open timeout/i.test(quickTest.error)) {
            appLog('warn', 'hardware', `${sp.path}: ${quickTest.error} — skipping`)
            portErrors.push({ port: sp.path, error: quickTest.error })
            canOpen = false
          }
        } catch (e) {
          if (/access denied|permission|locked|busy/i.test(e.message)) {
            portErrors.push({ port: sp.path, error: e.message })
            canOpen = false
          }
        }
        if (!canOpen) continue
        // Port opens but sics@9600 didn't respond — try remaining combos
        let found = false
        for (const [protocol, baud] of [['mt8217', 9600], ['sics', 19200], ['mt8217', 19200], ['sics', 4800], ['mt8217', 4800]]) {
          try {
            const result = await testSerialScale(sp.path, baud, protocol, 1500)
            if (result.ok) {
              appLog('info', 'hardware', `Scale auto-detected on ${sp.path} — ${protocol} @ ${baud} baud`)
              return { type: 'serial', port: sp.path, protocol, baud, vendor: sp.manufacturer || 'Serial Scale', product: sp.path, detected: true }
            }
            if (result.error && /access denied|permission|locked|busy/i.test(result.error)) {
              portErrors.push({ port: sp.path, error: result.error })
              found = true; break
            }
          } catch (_) {}
        }
        if (!found) portErrors.push({ port: sp.path, error: 'Port opens but no scale responded — check: is the scale powered on? Is the RS-232 cable connected at both ends? Try a different baud rate in Hardware settings.' })
      }
      // No scale found — return error info so probe can display it
      if (portErrors.length > 0) {
        return { type: 'none', portErrors, error: portErrors.map(e => `${e.port}: ${e.error}`).join('; ') }
      }
    }

    // Priority 3: USB enumeration VID match only (no communication confirmed)
    for (const d of devices) {
      if (d.vendorId && SCALE_VENDORS[d.vendorId] && d.vendorId !== 0x0403) {
        return { type: 'hid', vid: d.vendorId, pid: d.productId, vendor: SCALE_VENDORS[d.vendorId], product: d.product || '', noHID: !HID }
      }
    }
    return null
  }

  const SCALE_UNITS = { 0x01: 'mg', 0x02: 'g', 0x03: 'kg', 0x04: 'ct', 0x0B: 'oz', 0x0C: 'lb' }
  const SCALE_STATUSES = { 0x01: 'fault', 0x02: 'zero', 0x03: 'in_motion', 0x04: 'stable', 0x05: 'under_zero', 0x06: 'over_limit', 0x07: 'calibration', 0x08: 'needs_zero' }

  // ── Serial scale communication (SICS + MT 8217 protocols) ──────────────────

  // Protocol-specific serial settings
  const PROTOCOL_SERIAL_OPTS = {
    sics:   { dataBits: 8, stopBits: 1, parity: 'none', rtscts: false },   // MT-SICS (lab balances)
    mt8217: { dataBits: 7, stopBits: 1, parity: 'even', rtscts: false },   // MT 8217 (Viva, Ariva, bPlus retail scales) — 7-E-1 per protocol spec
  }

  async function openScaleSerialPort (portPath, baud, protocol) {
    if (hwScalePort) {
      await new Promise(resolve => {
        try { hwScalePort.close(resolve) } catch (_) { resolve() }
      })
      hwScalePort = null
    }
    if (!SerialPortLib) throw new Error('serialport package not available')
    const serialOpts = PROTOCOL_SERIAL_OPTS[protocol] || PROTOCOL_SERIAL_OPTS.sics
    return new Promise((resolve, reject) => {
      const port = new SerialPortLib.SerialPort({
        path: portPath,
        baudRate: baud || 9600,
        ...serialOpts,
        autoOpen: false,
      })
      port.open(err => {
        if (err) {
          appLog('error', 'hardware', `Failed to open scale port ${portPath}`, err.message)
          return reject(err)
        }
        // Enable DTR (Data Terminal Ready) — matches Profit Track's DTR/DSR handshake setting
        port.set({ dtr: true, rts: true }, () => {})
        hwScalePort = port
        appLog('info', 'hardware', `Scale serial port opened: ${portPath} @ ${baud} baud (${protocol || 'sics'}, ${serialOpts.dataBits}-${serialOpts.parity[0].toUpperCase()}-${serialOpts.stopBits})`)
        resolve(port)
      })
      port.on('error', err => {
        appLog('error', 'hardware', `Scale serial port error: ${err.message}`)
      })
      port.on('close', () => {
        appLog('info', 'hardware', 'Scale serial port closed')
        hwScalePort = null
        scaleStreamActive = false
      })
    })
  }

  function sendSerialCommand (port, command, timeoutMs) {
    return new Promise((resolve, reject) => {
      let settled = false
      const onData = chunk => {
        buf += chunk.toString('ascii')
        // SICS responses end with \r\n
        if (buf.includes('\r\n') && !settled) {
          settled = true
          clearTimeout(timer)
          port.removeListener('data', onData)
          resolve(buf.trim())
        }
      }
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          port.removeListener('data', onData)
          reject(new Error(`Scale timeout (${timeoutMs}ms) — no response to "${command.trim()}"`))
        }
      }, timeoutMs || 3000)

      let buf = ''
      port.on('data', onData)
      port.write(command, 'ascii', () => {
        port.drain(() => {}) // ensure bytes are flushed; errors handled by port 'error' event
      })
    })
  }

  function parseSICSResponse (response) {
    // Mettler Toledo SICS responses:
    //   S S      1.234 kg    (stable weight)
    //   S D      1.230 kg    (dynamic/unstable weight)
    //   S +      0.000 kg    (overload)
    //   S -                  (underload)
    //   S I                  (command not executable — e.g. scale in motion for too long)
    //   SI responses have same format but with SI prefix
    const m = response.match(/^S[I]?\s+([SDLI+\-])\s+(-?[\d.]+)\s*(mg|g|kg|ct|oz|lb|t)?/i)
    if (!m) return null
    const statusChar = m[1].toUpperCase()
    const weight = parseFloat(m[2])
    appLog('info', 'hardware', `SICS parsed: status=${statusChar} weight=${weight} unit=${m[3] || 'kg'} raw="${response.trim()}"`)

    const unit = (m[3] || 'kg').toLowerCase()
    const stable = statusChar === 'S'
    const inMotion = statusChar === 'D'
    const status = stable ? 'stable' : inMotion ? 'in_motion' : statusChar === '+' ? 'over_limit' : statusChar === '-' ? 'under_zero' : statusChar === 'I' ? 'not_ready' : 'unknown'
    return { weight, unit, status, stable, inMotion, zero: weight === 0 && stable }
  }

  // ── MT 8217 protocol (Viva, Ariva, bPlus retail scales) ─────────────────

  function send8217Command (port, command, timeoutMs) {
    // 8217 protocol: send single ASCII char, response may be:
    //   (a) STX-framed: STX (0x02) + data + CR (0x0D)
    //   (b) Unframed: raw bytes terminated by CR, LF, or ETX (0x03)
    //   (c) Raw data with no framing (collect until silence)
    // We try all approaches — accept whichever completes first
    return new Promise((resolve, reject) => {
      let settled = false
      const framedBuf = []
      const rawBuf = []
      let inFrame = false
      let silenceTimer = null

      const finish = (data) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (silenceTimer) clearTimeout(silenceTimer)
        port.removeListener('data', onData)
        resolve(Buffer.from(data))
      }

      const onData = chunk => {
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')
        appLog('debug', 'scale', `Serial chunk: [${hex}] (${chunk.length} bytes)`)

        for (const byte of chunk) {
          rawBuf.push(byte)

          // Track STX-framed protocol
          if (byte === 0x02) { inFrame = true; framedBuf.length = 0; continue }
          if (inFrame) {
            if (byte === 0x0D) { finish(framedBuf); return }  // CR ends framed response
            framedBuf.push(byte)
            continue
          }

          // Unframed: CR, LF, or ETX terminates
          if (rawBuf.length >= 2 && (byte === 0x0D || byte === 0x0A || byte === 0x03)) {
            // Return everything before the terminator
            finish(rawBuf.slice(0, rawBuf.length - 1))
            return
          }
        }

        // No framing detected — use silence detection (50ms of no data = response complete)
        if (rawBuf.length > 0) {
          if (silenceTimer) clearTimeout(silenceTimer)
          silenceTimer = setTimeout(() => {
            if (!settled && rawBuf.length > 0) {
              appLog('debug', 'scale', `Silence timeout — accepting ${rawBuf.length} unframed bytes`)
              finish(rawBuf)
            }
          }, 50)
        }
      }

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          if (silenceTimer) clearTimeout(silenceTimer)
          port.removeListener('data', onData)
          // If we got some data but no framing, return what we have
          if (rawBuf.length > 0) {
            appLog('debug', 'scale', `Timeout but got ${rawBuf.length} bytes — returning raw data`)
            resolve(Buffer.from(rawBuf))
          } else {
            reject(new Error(`Scale timeout (${timeoutMs}ms) — no response to "${command}"`))
          }
        }
      }, timeoutMs || 3000)

      port.on('data', onData)
      port.write(command, 'ascii', () => { port.drain(() => {}) })
    })
  }

  function parse8217Response (data) {
    if (!data || data.length < 1) return null

    const rawArr = Array.from(data)
    const hex = rawArr.map(b => b.toString(16).padStart(2, '0')).join(' ')
    const ascii = data.toString('ascii').replace(/[^\x20-\x7e]/g, '?')
    appLog('debug', 'scale', `8217 parse: hex=[${hex}] ascii=[${ascii}] len=${data.length}`)

    // ── Method 1: Standard MT 8217 binary frame ──────────────────────────────
    // Frame between STX and CR: STA + STB + W5 W4 W3 W2 W1 + BCC + ETX
    //   STA (byte 0): bits 0-2 = decimal point position, bit 5 = always 1
    //   STB (byte 1): bit 0 = net, bit 1 = negative, bit 2 = out-of-range,
    //                 bit 3 = in motion, bit 4 = kg (vs lb), bit 5 = always 1,
    //                 bit 6 = power-up
    //   W5-W1 (bytes 2-6): 5 ASCII digit weight bytes
    //   BCC (byte 7): checksum
    //   ETX (byte 8): 0x03
    if (data.length >= 7) {
      const digitBytes = data.slice(2, 7)
      const allAsciiDigits = Array.from(digitBytes).every(b => b >= 0x30 && b <= 0x39)

      if (allAsciiDigits) {
        const sta = data[0]
        const stb = data[1]

        // Decimal point position from STA bits 0-2
        // 0=*100, 1=*10, 2=*1, 3=/10, 4=/100, 5=/1000, 6=/10000, 7=/100000
        const decPos = sta & 0x07
        const weightInt = parseInt(digitBytes.toString('ascii'), 10)
        let weight = weightInt * Math.pow(10, 2 - decPos)

        // Status flags from STB
        const netMode    = !!(stb & 0x01)  // bit 0: Gross=0, Net=1
        const negative   = !!(stb & 0x02)  // bit 1: Positive=0, Negative=1
        const outOfRange = !!(stb & 0x04)  // bit 2: Over capacity or under zero
        const inMotion   = !!(stb & 0x08)  // bit 3: Scale in motion / unstable
        const isKg       = !!(stb & 0x10)  // bit 4: lb=0, kg=1
        const inPowerUp  = !!(stb & 0x40)  // bit 6: Still powering up

        if (negative) weight = -weight
        // Round to avoid floating point noise (e.g. 5.0000000001)
        weight = Math.round(weight * 100000) / 100000

        const unit = isKg ? 'kg' : 'lb'
        const status = inPowerUp ? 'power_up' : outOfRange ? 'over_limit' : inMotion ? 'in_motion' : 'stable'

        return {
          weight, unit, status,
          stable: !inMotion && !outOfRange && !inPowerUp,
          inMotion, zero: weight === 0 && !inMotion,
          net: netMode, raw: rawArr
        }
      }
    }

    // ── Method 2: ECR format — ASCII weight with decimal point ───────────────
    // Some 8217 configs return formatted strings like " 05.000LB" or "  0.500KG"
    const asciiStr = data.toString('ascii')
    const ecrMatch = asciiStr.match(/(-?\d+\.?\d*)\s*(kg|lb|g|oz)?/i)
    if (ecrMatch) {
      const weight = parseFloat(ecrMatch[1])
      if (!isNaN(weight)) {
        const unit = (ecrMatch[2] || 'kg').toLowerCase()
        return {
          weight, unit, status: 'stable',
          stable: true, inMotion: false,
          zero: weight === 0, net: false, raw: rawArr
        }
      }
    }

    // ── Method 3: Status-only response ("?" + status char) — scale not ready ─
    if (asciiStr.includes('?')) {
      appLog('debug', 'scale', '8217 status-only response (scale not ready or in motion)')
      return {
        weight: 0, unit: 'kg', status: 'not_ready',
        stable: false, inMotion: true, zero: false, net: false, raw: rawArr
      }
    }

    // ── Method 4: Raw digit fallback ─────────────────────────────────────────
    const digitMatch = asciiStr.match(/(-?\d+(?:\.\d+)?)/)
    if (digitMatch) {
      let weight = parseFloat(digitMatch[1])
      // Raw digits without decimal from a kg scale — assume 3 decimal places
      if (Number.isInteger(weight) && weight > 100) weight = weight / 1000
      return {
        weight, unit: 'kg', status: 'stable',
        stable: true, inMotion: false,
        zero: weight === 0, net: false, raw: rawArr
      }
    }

    return null
  }

  async function readScale8217 () {
    try {
      const data = await send8217Command(hwScalePort, 'W', 3000)
      const parsed = parse8217Response(data)
      if (parsed) return parsed
      return { error: `Unexpected 8217 response: ${Array.from(data).map(b => b.toString(16)).join(' ')}` }
    } catch (e) {
      return { error: e.message }
    }
  }

  // ── Unified serial scale read ─────────────────────────────────────────────

  async function readScaleSerial () {
    if (scaleStreamActive && lastStreamReading) return lastStreamReading
    if (!hwScalePort || !hwScalePort.isOpen) {
      if (!hwScale?.port) return { error: 'No serial scale configured. Set COM port in Hardware tab.' }
      try {
        await openScaleSerialPort(hwScale.port, hwScale.baud || 9600, hwScale.protocol || 'sics')
      } catch (e) {
        return { error: `Cannot open ${hwScale.port}: ${e.message}` }
      }
    }

    const protocol = hwScale?.protocol || 'sics'

    if (protocol === 'mt8217') return readScale8217()

    if (protocol === 'sics') {
      try {
        // Try stable weight first
        const resp = await sendSerialCommand(hwScalePort, 'S\r\n', 3000)
        const parsed = parseSICSResponse(resp)
        if (parsed) return parsed
        // If S fails (e.g. in motion), try immediate weight
        const respI = await sendSerialCommand(hwScalePort, 'SI\r\n', 2000)
        const parsedI = parseSICSResponse(respI)
        if (parsedI) return parsedI
        return { error: `Unexpected scale response: ${resp}` }
      } catch (e) {
        return { error: e.message }
      }
    }

    return { error: `Unknown scale protocol: ${protocol}` }
  }

  let cachedHidScale = null
  let hidScaleCloseTimer = null

  function getHidScale () {
    if (cachedHidScale) {
      // Reset auto-close timer
      if (hidScaleCloseTimer) clearTimeout(hidScaleCloseTimer)
      hidScaleCloseTimer = setTimeout(closeHidScale, 10000)
      return cachedHidScale
    }
    if (!hwScale?.path) return null
    try {
      cachedHidScale = new HID.HID(hwScale.path)
      hidScaleCloseTimer = setTimeout(closeHidScale, 10000)
      return cachedHidScale
    } catch (e) {
      cachedHidScale = null
      throw e
    }
  }

  function closeHidScale () {
    if (hidScaleCloseTimer) { clearTimeout(hidScaleCloseTimer); hidScaleCloseTimer = null }
    if (cachedHidScale) { try { cachedHidScale.close() } catch (_) {} cachedHidScale = null }
  }

  function readScaleHID () {
    if (!HID) return { error: 'node-hid not available — USB HID scale reading disabled' }
    if (!hwScale?.path) return { error: 'No HID scale path. Run probe first.' }
    try {
      const device = getHidScale()
      const data = device.readTimeout(2000)
      if (!data || data.length < 6) return { error: 'No data from scale (timeout)' }
      const status = data[1]
      const unitCode = data[2]
      const exponent = data[3] > 127 ? data[3] - 256 : data[3]
      const rawWeight = (data[5] << 8) | data[4]
      const weight = rawWeight * Math.pow(10, exponent)
      return { weight, unit: SCALE_UNITS[unitCode] || '?', status: SCALE_STATUSES[status] || 'unknown', stable: status === 0x04, zero: status === 0x02, inMotion: status === 0x03, raw: Array.from(data) }
    } catch (e) {
      closeHidScale() // force reconnect on next read
      return { error: `Scale read failed: ${e.message}` }
    }
  }

  async function readScale () {
    if (!hwScale) return { error: 'No scale detected. Run probe or configure in Hardware tab.' }
    if (hwScale.type === 'serial') return readScaleSerial()
    return readScaleHID()
  }

  async function zeroScale () {
    if (!hwScale) return { error: 'No scale configured' }
    if (hwScale.type !== 'serial') return { error: 'Zero/tare only supported on serial scales' }
    if (!hwScalePort || !hwScalePort.isOpen) {
      try { await openScaleSerialPort(hwScale.port, hwScale.baud || 9600, hwScale.protocol) } catch (e) { return { error: `Cannot open ${hwScale.port}: ${e.message}` } }
    }
    const protocol = hwScale?.protocol || 'sics'
    try {
      if (protocol === 'mt8217') {
        const data = await send8217Command(hwScalePort, 'Z', 3000)
        // 8217 Z response: status byte indicating success
        return { ok: true, status: 'Scale zeroed' }
      }
      const resp = await sendSerialCommand(hwScalePort, 'Z\r\n', 3000)
      if (resp.startsWith('Z A')) return { ok: true, status: 'Scale zeroed' }
      if (resp.startsWith('Z I')) return { error: 'Scale busy — cannot zero right now' }
      if (resp.startsWith('Z +')) return { error: 'Scale overloaded — remove weight first' }
      return { error: `Unexpected response: ${resp}` }
    } catch (e) { return { error: e.message } }
  }

  async function testSerialScale (portPath, baud, protocol, timeoutMs) {
    const cmdTimeout = timeoutMs || 3000
    let testPort = null
    const closePort = () => new Promise(resolve => {
      if (!testPort || !testPort.isOpen) return resolve()
      const timer = setTimeout(() => { try { testPort.destroy() } catch (_) {} resolve() }, 2000)
      testPort.close(() => { clearTimeout(timer); resolve() })
    })
    try {
      const serialOpts = PROTOCOL_SERIAL_OPTS[protocol] || PROTOCOL_SERIAL_OPTS.sics
      testPort = new SerialPortLib.SerialPort({ path: portPath, baudRate: baud || 9600, ...serialOpts, autoOpen: false })
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Open timeout on ${portPath}`)), 3000)
        testPort.open(err => { clearTimeout(timer); err ? reject(err) : resolve() })
      })
      if (protocol === 'mt8217') {
        const data = await send8217Command(testPort, 'W', cmdTimeout)
        const parsed = parse8217Response(data)
        await closePort()
        if (parsed) return { ok: true, reading: parsed, protocol: 'mt8217', raw: Array.from(data).map(b => b.toString(16)).join(' ') }
        return { ok: false, error: `Got 8217 response but couldn't parse: ${Array.from(data).map(b => b.toString(16)).join(' ')}` }
      }
      if (protocol === 'sics' || !protocol) {
        const resp = await sendSerialCommand(testPort, 'S\r\n', cmdTimeout)
        const parsed = parseSICSResponse(resp)
        await closePort()
        if (parsed) return { ok: true, reading: parsed, protocol: 'sics', raw: resp }
        return { ok: false, error: `Got response but couldn't parse: ${resp}`, raw: resp }
      }
      await closePort()
      return { ok: false, error: `Unknown protocol: ${protocol}` }
    } catch (e) {
      await closePort()
      return { ok: false, error: e.message }
    }
  }

  // ── Scanner detection (HID keyboard — just identify, no communication) ─────

  function detectScanner (devices) {
    for (const d of devices) {
      if (!d.vendorId) continue
      const cls = classifyDevice(d)
      if (cls.type === 'scanner') return { vid: d.vendorId, pid: d.productId, vendor: cls.vendor, product: d.product || '' }
    }
    return null
  }

  // ── Build receipt buffer (ESC/POS) ─────────────────────────────────────────

  function buildReceiptBuffer (receiptData) {
    const parts = []
    const text = s => parts.push(Buffer.from(s + '\n', 'latin1'))
    const cmd = buf => parts.push(buf)

    cmd(ESCPOS.INIT)
    // Set codepage to PC437 (standard for thermal printers)
    cmd(Buffer.from([ESC, 0x74, 0x00]))
    cmd(ESCPOS.ALIGN_CENTER)

    cmd(ESCPOS.BOLD_ON); cmd(ESCPOS.DOUBLE_SIZE)
    text(receiptData.storeName || 'Crisp on Creek')
    cmd(ESCPOS.NORMAL_SIZE); cmd(ESCPOS.BOLD_OFF)

    if (receiptData.storeAddress) text(receiptData.storeAddress)
    if (receiptData.storePhone) text(`Ph: ${receiptData.storePhone}`)
    if (receiptData.storeAbn) text(`ABN: ${receiptData.storeAbn}`)
    if (receiptData.header) { text(''); text(receiptData.header) }

    text(''); cmd(ESCPOS.ALIGN_LEFT)
    text(`Date:     ${receiptData.date}`)
    text(`Register: ${receiptData.registerId || 'LANE01'}`)
    text(`Txn:      ${receiptData.txnId?.slice(0, 8) || ''}`)
    text(`Staff:    ${receiptData.staffName || ''}`)
    text('-'.repeat(42))

    for (const item of receiptData.items) {
      const name = item.name.substring(0, 28)
      const price = item.line_total.toFixed(2).padStart(10)
      text(`${name}${' '.repeat(Math.max(0, 42 - name.length - price.length))}${price}`)
      if (item.qty !== 1) text(`  ${item.qty} x $${item.unit_price.toFixed(2)}`)
      if (item.discount > 0) text(`  Discount: -$${item.discount.toFixed(2)}`)
    }

    text('-'.repeat(42)); cmd(ESCPOS.ALIGN_RIGHT)
    if (receiptData.discount > 0) text(`Discount: -$${receiptData.discount.toFixed(2)}`)
    cmd(ESCPOS.BOLD_ON); cmd(ESCPOS.DOUBLE_SIZE)
    text(`TOTAL: $${receiptData.total.toFixed(2)}`)
    cmd(ESCPOS.NORMAL_SIZE); cmd(ESCPOS.BOLD_OFF)
    text(`Total includes GST of $${receiptData.tax.toFixed(2)}`)
    text('')

    for (const pay of receiptData.payments) text(`${pay.method.toUpperCase()}: $${pay.amount.toFixed(2)}`)
    if (receiptData.change > 0) text(`Change: $${receiptData.change.toFixed(2)}`)

    text(''); cmd(ESCPOS.ALIGN_CENTER)
    text(receiptData.footer || 'Thank you for shopping local!')

    // Transaction barcode at bottom (scannable for returns/lookups)
    if (receiptData.barcode) {
      text('')
      cmd(ESCPOS.BARCODE_HEIGHT); cmd(ESCPOS.BARCODE_WIDTH); cmd(ESCPOS.BARCODE_HRI_BELOW)
      const barcodeStr = receiptData.barcode.replace(/-/g, '').substring(0, 20)
      const barcodeData = Buffer.from(barcodeStr, 'ascii')
      cmd(Buffer.from([GS, 0x6B, 0x49, barcodeData.length])); cmd(barcodeData)
    }

    cmd(ESCPOS.FEED_3); cmd(ESCPOS.PARTIAL_CUT)

    return Buffer.concat(parts)
  }

  // ── Full probe (enumerate + detect + test) ─────────────────────────────────

  async function probeHardware () {
    const devices = enumerateDevices()
    const serialPorts = await enumerateSerialPorts()

    // Add serial ports to device list for UI display
    for (const sp of serialPorts) {
      devices.push({
        vendorId: sp.vendorId || 0, productId: sp.productId || 0,
        manufacturer: sp.manufacturer, product: sp.path + (sp.manufacturer ? ` (${sp.manufacturer})` : ''),
        path: sp.path, usagePage: 0, usage: 0, source: 'serial',
      })
    }

    const printer = detectPrinter(devices)
    const scale = await detectScale(devices, serialPorts)
    const scanner = detectScanner(devices)

    if (!printer?.needsSetup) {
      hwPrinter = printer
      // Auto-save detected printer config so it persists across restarts
      if (printer && printer.name && !printer.configured) {
        printer.configured = true
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_name', ?1)", [printer.name])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_interface', ?1)", [printer.interface || 'windows'])
        if (printer.port) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_port', ?1)", [printer.port])
        scheduleSave()
        appLog('info', 'hardware', `Auto-saved printer config: ${printer.name} (${printer.interface})`)
      }
    }
    // Close cached HID scale if path changed
    const scaleOk = scale && scale.type !== 'none'
    if (scaleOk && scale.path !== hwScale?.path) closeHidScale()
    if (scaleOk) {
      hwScale = scale
      // Mark as configured so subsequent probes use fast verify path
      // (avoids re-scanning COM ports which would conflict with the open polling port)
      hwScale.configured = true
      // Auto-save detected serial scale config so it persists across restarts
      // (avoids slow brute-force COM port scan on every startup)
      if (scale.detected && scale.type === 'serial' && scale.port) {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_scale_type', 'serial')", [])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_scale_port', ?1)", [scale.port])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_scale_baud', ?1)", [String(scale.baud || 9600)])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_scale_protocol', ?1)", [scale.protocol || 'mt8217'])
        scheduleSave()
        appLog('info', 'hardware', `Auto-saved scale config: ${scale.port} ${scale.protocol}@${scale.baud}`)
      }
    }
    hwScanner = scanner

    const classified = devices.filter(d => d.vendorId > 0).map(d => {
      const cls = classifyDevice(d)
      return { vendorId: d.vendorId, productId: d.productId, product: d.product || '', manufacturer: d.manufacturer || '', deviceClass: d.deviceClass || '', usagePage: d.usagePage || 0, type: cls.type, vendor: cls.vendor }
    })

    // Check OPOS availability
    const opos = checkOpos()
    const oposDevices = opos.printer || opos.drawer || opos.scale ? listOposDevices() : { ok: false }

    const result = {
      usbDevices: classified,
      printer: {
        found: !!printer && !printer.needsSetup, name: printer?.name || '', port: printer?.port || '',
        interface: printer?.interface || '', driver: printer?.driver || '', vid: printer?.vid,
        pid: printer?.pid, vendor: printer?.vendor || '', configured: !!printer?.configured,
        needsSetup: !!printer?.needsSetup, error: printer?.error || '',
        tested: !!printer?.tested, status: printer?.tested ? 'OK (raw send confirmed)' : '',
        availableQueues: printer?.availableQueues || [],
      },
      scale: { found: !!scale && scale.type !== 'none', name: scale?.product || '', vendor: scale?.vendor || '', path: scale?.path || '', port: scale?.port || '', type: scale?.type || '', protocol: scale?.protocol || '', baud: scale?.baud || 0, hasHID: !!HID, hasSerial: !!SerialPortLib, noHID: !!scale?.noHID, error: scale?.error || '', portErrors: scale?.portErrors || [] },
      serialPorts: serialPorts.map(p => ({ path: p.path, manufacturer: p.manufacturer, vendorId: p.vendorId, productId: p.productId })),
      scanner: { found: !!scanner, name: scanner?.product || '', vendor: scanner?.vendor || '' },
      drawer: { found: !!(printer && !printer.needsSetup) || opos.drawer, via: opos.drawer ? 'OPOS CashDrawer' : (printer ? 'printer DK port' : '') },
      hidAvailable: !!HID,
      opos: {
        available: opos.printer || opos.drawer || opos.scale,
        printer: opos.printer, drawer: opos.drawer, scale: opos.scale,
        devices: oposDevices.ok ? oposDevices.data?.devices : [],
        printerName: oposPrinterName, drawerName: oposDrawerName, scaleName: oposScaleName,
      },
    }

    if (printer && printer.interface === 'network') {
      const tcp = await sendViaTCP(Buffer.from([DLE, 0x04, 0x01]), printer.ip, printer.networkPort || 9100)
      result.printer.status = tcp.ok ? 'Responding' : tcp.detail
      result.printer.tested = tcp.ok
      result.printer.found = tcp.ok
    } else if (printer && printer.interface === 'windows' && printer.name && isWin) {
      // Verify Windows printer by checking queue status
      try {
        const qs = getQueueStatus(printer.name)
        if (qs) {
          result.printer.tested = true
          result.printer.status = qs.PrinterStatus === 3 ? 'Idle' : qs.PrinterStatus === 4 ? 'Printing' : qs.PrinterStatus === 5 ? 'Warming Up' : `Status ${qs.PrinterStatus || 0}`
          if ((qs.JobCount || 0) > 0) {
            result.printer.status += ` (${qs.JobCount} stuck jobs — clearing)`
            clearPrinterQueue(printer.name)
          }
        }
      } catch (_) {}
    }

    if (scale && scale.type === 'serial' && scale.port && SerialPortLib) {
      if (hwScalePort?.isOpen && lastStreamReading) {
        // Port is open and polling — use last cached reading (don't conflict with poller)
        result.scale.tested = true
        result.scale.testResult = `${lastStreamReading.weight} ${lastStreamReading.unit} (${lastStreamReading.status})`
        result.scale.reading = lastStreamReading
        result.scale.detected = true
      } else if (hwScalePort?.isOpen) {
        // Port open but no cached reading yet — do a single read
        try {
          const reading = await readScaleSerial()
          result.scale.tested = true
          if (!reading.error) {
            result.scale.testResult = `${reading.weight} ${reading.unit} (${reading.status})`
            result.scale.reading = reading
            result.scale.detected = true
          } else {
            result.scale.testResult = reading.error
          }
        } catch (_) {}
      } else {
        // Port not open — test fresh
        const test = await testSerialScale(scale.port, scale.baud || 9600, scale.protocol || 'mt8217')
        result.scale.tested = true
        if (test.ok) {
          result.scale.testResult = `${test.reading.weight} ${test.reading.unit} (${test.reading.status})`
          result.scale.reading = test.reading
          result.scale.detected = true
        } else {
          result.scale.testResult = test.error
        }
      }
    } else if (scale && scale.type === 'hid' && scale.path && HID) {
      const reading = readScaleHID()
      result.scale.tested = true
      if (reading.error) { result.scale.testResult = reading.error }
      else { result.scale.testResult = `${reading.weight} ${reading.unit} (${reading.status})`; result.scale.reading = reading }
    }

    return result
  }

  // ── Environment diagnostics — detect conflicts, locked ports, missing drivers ──
  async function diagnoseEnvironment () {
    const issues = []
    const info = []

    if (!isWin) {
      info.push({ type: 'info', area: 'platform', message: `Platform: ${process.platform} (some checks are Windows-only)` })
    }

    // ── 1. Scan ALL running processes for anything that commonly holds COM ports ──
    if (isWin) {
      const knownConflicts = {
        'profittrack': 'Profit Track', 'pt_pos': 'Profit Track POS', 'ptserver': 'Profit Track Server',
        'ptrack': 'Profit Track', 'ptwin': 'Profit Track', 'pt32': 'Profit Track',
        'putty': 'PuTTY (serial terminal)', 'realterm': 'RealTerm (serial terminal)',
        'teraterm': 'Tera Term', 'hterm': 'HTerm', 'com0com': 'com0com (virtual COM)',
        'scalelink': 'ScaleLink', 'scalemanager': 'Scale Manager',
        'hyperterminal': 'HyperTerminal', 'coolterm': 'CoolTerm', 'minicom': 'Minicom',
        'mtterminal': 'MT Terminal (Mettler Toledo)', 'winhex': 'WinHex',
        'device monitoring studio': 'Device Monitoring Studio',
      }
      // Generic COM port holders: any process with "serial", "com port", or "terminal" in name
      try {
        const tasklist = hwExec('tasklist /FO CSV /NH', { timeout: 5000, encoding: 'utf-8' })
        const lines = tasklist.split('\n').filter(l => l.trim())
        const foundConflicts = new Set()
        for (const line of lines) {
          const match = line.match(/^"([^"]+)"/)
          if (!match) continue
          const proc = match[1].replace(/\.exe$/i, '').toLowerCase()
          // Check known conflicts
          for (const [key, name] of Object.entries(knownConflicts)) {
            if (proc.includes(key) && !foundConflicts.has(key)) {
              foundConflicts.add(key)
              issues.push({ type: 'conflict', area: 'software', severity: 'high',
                message: `${name} is running (${match[1]}) — may be locking COM ports or printer queues`,
                fix: `Close ${name} before using Crisp POS, or it will block access to the scale and printer` })
            }
          }
        }
      } catch (_) {}

      // Also check which processes actually hold COM port handles
      try {
        const handleCheck = hwExec('powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue | Select-Object DeviceID,Name,Status,Description | ConvertTo-Json -Compress"', { timeout: 5000, encoding: 'utf-8' }).trim()
        if (handleCheck) {
          const ports = JSON.parse(handleCheck)
          const list = Array.isArray(ports) ? ports : [ports]
          for (const p of list) {
            if (p.Status && p.Status !== 'OK') {
              issues.push({ type: 'port_status', area: 'port', severity: 'medium',
                message: `${p.DeviceID}: hardware status is "${p.Status}" — ${p.Description || p.Name || ''}`,
                fix: `Check Device Manager → Ports → ${p.DeviceID} for errors` })
            }
          }
        }
      } catch (_) {}
    }

    // ── 2. COM port access + scale response test ──
    if (SerialPortLib) {
      try {
        const ports = await SerialPortLib.SerialPort.list()
        for (const p of ports) {
          // Skip if this port is already held open by our scale polling
          if (hwScalePort?.isOpen && hwScalePort.path === p.path) {
            info.push({ type: 'info', area: 'port', message: `${p.path}: in use by Crisp POS (scale connected)` })
            continue
          }
          let portOpened = false
          let testPort = null
          try {
            testPort = new SerialPortLib.SerialPort({ path: p.path, baudRate: 9600, autoOpen: false })
            await new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error('open_timeout')), 2000)
              testPort.open(err => { clearTimeout(t); err ? reject(err) : resolve() })
            })
            portOpened = true

            // Port opens — try to get a scale response to check if anything is connected
            let gotResponse = false
            try {
              const resp = await new Promise((resolve, reject) => {
                let buf = ''
                const timer = setTimeout(() => reject(new Error('no_response')), 1500)
                const onData = chunk => {
                  buf += chunk.toString('ascii')
                  if (buf.length > 0) { clearTimeout(timer); testPort.removeListener('data', onData); resolve(buf) }
                }
                testPort.on('data', onData)
                testPort.write('S\r\n', 'ascii', () => { testPort.drain(() => {}) })
              })
              gotResponse = true
              info.push({ type: 'info', area: 'port', message: `${p.path}: device responded${p.manufacturer ? ` (${p.manufacturer})` : ''}` })
            } catch (_) {
              // No response to SICS — try MT 8217
              try {
                const resp8217 = await new Promise((resolve, reject) => {
                  const buf = []
                  let inFrame = false
                  const timer = setTimeout(() => reject(new Error('no_response')), 1500)
                  const onData = chunk => {
                    for (const byte of chunk) {
                      if (byte === 0x02) { inFrame = true; buf.length = 0; continue }
                      if (byte === 0x0D && inFrame) { clearTimeout(timer); testPort.removeListener('data', onData); resolve(Buffer.from(buf)); return }
                      if (inFrame) buf.push(byte)
                    }
                  }
                  testPort.on('data', onData)
                  testPort.write('W', 'ascii', () => { testPort.drain(() => {}) })
                })
                gotResponse = true
                info.push({ type: 'info', area: 'port', message: `${p.path}: MT 8217 scale responded${p.manufacturer ? ` (${p.manufacturer})` : ''}` })
              } catch (_) {}
            }

            if (!gotResponse) {
              // Port opens but nothing responds
              issues.push({ type: 'no_response', area: 'scale', severity: 'medium',
                message: `${p.path}: port opens but no device responded`,
                fix: `Check: (1) Is the scale powered on? (2) Is the RS-232 cable connected to both the scale and this port? (3) Is the cable a straight-through or crossover — the Ariva-S needs a specific pinout` })
            }

            await new Promise(r => testPort.close(r))
          } catch (e) {
            if (/access denied|permission|busy/i.test(e.message)) {
              // Try to find which process holds this port
              let holder = ''
              if (isWin) {
                try {
                  // Use handle.exe-style query via PowerShell to find the holder
                  const result = hwExec(`powershell -NoProfile -NonInteractive -Command "$p = Get-CimInstance Win32_SerialPort -Filter \\"DeviceID='${p.path}'\\" -ErrorAction SilentlyContinue; if ($p) { $p.Name } else { 'unknown' }"`, { timeout: 3000, encoding: 'utf-8' }).trim()
                  if (result && result !== 'unknown') holder = ` (device: ${result})`
                } catch (_) {}
              }
              issues.push({ type: 'locked_port', area: 'port', severity: 'high',
                message: `${p.path}: LOCKED — another application has exclusive access${holder}`,
                fix: `Another program is using ${p.path}. Close Profit Track, serial terminals, Device Manager's port monitor, or any other software that connects to serial ports. Then re-scan.` })
            } else if (e.message === 'open_timeout') {
              issues.push({ type: 'port_timeout', area: 'port', severity: 'medium',
                message: `${p.path}: timed out trying to open — port may be in a bad state`,
                fix: `Try: (1) Unplug and replug the USB-to-Serial adapter (2) Restart the computer if the port is stuck` })
            } else {
              issues.push({ type: 'port_error', area: 'port', severity: 'medium',
                message: `${p.path}: ${e.message}`,
                fix: `Check Device Manager for errors on this port` })
            }
            if (testPort && portOpened) { try { await new Promise(r => testPort.close(r)) } catch (_) {} }
          }
        }
        if (ports.length === 0) {
          issues.push({ type: 'no_ports', area: 'port', severity: 'high',
            message: 'No COM ports found — the RS-232 adapter is not detected',
            fix: 'Check: (1) Is the USB-to-Serial adapter plugged in? (2) Does it show in Device Manager → Ports? (3) Install the correct driver — common adapters need FTDI, Prolific PL2303, CH340, or Silicon Labs CP210x drivers' })
        }
      } catch (e) {
        issues.push({ type: 'serial_error', area: 'port', severity: 'high',
          message: `Cannot list serial ports: ${e.message}` })
      }
    } else {
      issues.push({ type: 'missing_dep', area: 'driver', severity: 'high',
        message: 'serialport package not installed — RS-232 communication disabled',
        fix: 'Run: npm install serialport' })
    }

    // ── 3. USB devices without drivers (yellow triangle in Device Manager) ──
    if (isWin) {
      try {
        const problemDevices = hwExec('powershell -NoProfile -NonInteractive -Command "Get-PnpDevice -Status Error,Degraded,Unknown -ErrorAction SilentlyContinue | Where-Object { $_.Class -in \'Ports\',\'USB\',\'Printer\',\'HIDClass\',\'\' } | Select-Object FriendlyName,InstanceId,Status,Class | ConvertTo-Json -Compress"', { timeout: 5000, encoding: 'utf-8' }).trim()
        if (problemDevices && problemDevices !== '') {
          try {
            const devs = JSON.parse(problemDevices)
            const list = Array.isArray(devs) ? devs : [devs]
            for (const d of list) {
              const isUSBSerial = /serial|uart|com|rs.?232|ftdi|prolific|ch340|cp210/i.test(d.FriendlyName || d.InstanceId || '')
              issues.push({ type: 'driver_missing', area: 'driver', severity: isUSBSerial ? 'high' : 'medium',
                message: `Device "${d.FriendlyName || 'Unknown'}" has status: ${d.Status}${d.Class ? ` (class: ${d.Class})` : ''}`,
                fix: isUSBSerial
                  ? 'This looks like a USB-to-Serial adapter without a driver. Download and install the driver from the adapter manufacturer (FTDI, Prolific, CH340, or Silicon Labs)'
                  : 'This device has a driver problem — check Device Manager for details' })
            }
          } catch (_) {} // JSON parse fail = no problem devices
        }
      } catch (_) {}

      // ── 4. Port driver health ──
      try {
        const drivers = hwExec('powershell -NoProfile -NonInteractive -Command "Get-WmiObject Win32_PnPSignedDriver -Filter \\"DeviceClass=\'Ports\'\\" -ErrorAction SilentlyContinue | Select-Object DeviceName,DriverVersion,Manufacturer,Status | ConvertTo-Json -Compress"', { timeout: 5000, encoding: 'utf-8' }).trim()
        if (drivers) {
          const parsed = JSON.parse(drivers)
          const list = Array.isArray(parsed) ? parsed : [parsed]
          for (const d of list) {
            if (d.Status && d.Status !== 'OK') {
              issues.push({ type: 'driver_error', area: 'driver', severity: 'high',
                message: `Port driver "${d.DeviceName || 'Unknown'}" has status: ${d.Status}`,
                fix: 'Right-click the device in Device Manager → Update driver, or uninstall and reinstall' })
            } else {
              info.push({ type: 'info', area: 'driver', message: `Driver OK: ${d.DeviceName || 'Unknown'} v${d.DriverVersion || '?'} (${d.Manufacturer || '?'})` })
            }
          }
        }
      } catch (_) {}

      // ── 5. Print Spooler service ──
      try {
        const spoolerStatus = hwExec('powershell -NoProfile -NonInteractive -Command "(Get-Service Spooler -ErrorAction SilentlyContinue).Status"', { timeout: 3000, encoding: 'utf-8' }).trim()
        if (spoolerStatus !== 'Running') {
          issues.push({ type: 'service', area: 'printer', severity: 'high',
            message: `Print Spooler service is ${spoolerStatus || 'not found'} — receipt printing will not work`,
            fix: 'Open services.msc → find "Print Spooler" → right-click → Start. Set startup type to Automatic.' })
        } else {
          info.push({ type: 'info', area: 'printer', message: 'Print Spooler service is running' })
        }
      } catch (_) {}

      // ── 6. Stuck print jobs ──
      try {
        const jobs = hwExec('powershell -NoProfile -NonInteractive -Command "Get-Printer -ErrorAction SilentlyContinue | ForEach-Object { Get-PrintJob -PrinterName $_.Name -ErrorAction SilentlyContinue } | Measure-Object | Select-Object -ExpandProperty Count"', { timeout: 5000, encoding: 'utf-8' }).trim()
        const jobCount = parseInt(jobs)
        if (jobCount > 0) {
          issues.push({ type: 'stuck_jobs', area: 'printer', severity: 'medium',
            message: `${jobCount} print job(s) stuck in queue — may block new receipts`,
            fix: 'Open Printers & Scanners → select the receipt printer → Open queue → Cancel All Documents' })
        }
      } catch (_) {}

      // ── 7. Check for Bluetooth COM ports (can waste time during detection) ──
      try {
        const btPorts = hwExec('powershell -NoProfile -NonInteractive -Command "Get-PnpDevice -Class Bluetooth -Status OK -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count"', { timeout: 3000, encoding: 'utf-8' }).trim()
        const btCount = parseInt(btPorts)
        if (btCount > 0) {
          info.push({ type: 'info', area: 'port', message: `${btCount} Bluetooth device(s) found — Bluetooth COM ports may slow down hardware detection` })
        }
      } catch (_) {}
    }

    // ── 8. Scale connection status ──
    if (hwScale) {
      if (hwScalePort?.isOpen) {
        info.push({ type: 'info', area: 'scale', message: `Scale connected: ${hwScale.port || hwScale.path} (${hwScale.protocol || 'hid'})${scaleStreamActive ? ' — streaming' : ''}` })
      } else if (hwScale.configured) {
        issues.push({ type: 'scale_disconnected', area: 'scale', severity: 'medium',
          message: `Scale configured on ${hwScale.port || hwScale.path} but port is not open`,
          fix: 'Check the RS-232 cable connection. The scale may have been unplugged or powered off.' })
      }
    } else {
      issues.push({ type: 'no_scale', area: 'scale', severity: 'medium',
        message: 'No scale detected — weight-based products will require manual weight entry',
        fix: 'Connect the Mettler Toledo Ariva-S via the RS-232 cable, ensure it is powered on, and re-scan' })
    }

    // ── 9. Printer status ──
    if (!hwPrinter) {
      issues.push({ type: 'no_printer', area: 'printer', severity: 'medium',
        message: 'No receipt printer detected — receipts will not print',
        fix: 'Connect the receipt printer via USB, ensure it is powered on, and re-scan' })
    }

    // ── 10. Package availability ──
    if (!HID) {
      info.push({ type: 'info', area: 'driver', message: 'node-hid not available — USB HID scale reading disabled (RS-232 still works)' })
    }

    return { issues, info, timestamp: new Date().toISOString() }
  }

  // ── Expose cleanup for shutdown handler (module-scope can't see setupIPC locals) ─
  hardwareCleanup = () => {
    stopScalePolling()
    if (hwScalePort?.isOpen) try { hwScalePort.close() } catch (_) {}
    try { closeHidScale() } catch (_) {}
  }

  // ── Load saved config and auto-probe on startup ────────────────────────────

  loadSavedHardwareConfig()
  // Note: printer queue health is verified inside detectPrinter() during probeHardware()

  probeHardware().then(async r => {
    if (hwPrinter) appLog('info', 'hardware', `Printer: ${hwPrinter.name} (${hwPrinter.interface})`)
    if (hwScale) appLog('info', 'hardware', `Scale: ${hwScale.vendor || hwScale.product}`)
    startScalePolling()
    try { cleanupDuplicateQueues() } catch (_) {}

    // Run environment diagnostics and warn about issues
    try {
      const diag = await diagnoseEnvironment()
      for (const issue of diag.issues) {
        appLog('warn', 'hardware', `[DIAG] ${issue.message}${issue.fix ? ' — Fix: ' + issue.fix : ''}`)
      }
      // Send high-severity issues to renderer for toast notifications
      const critical = diag.issues.filter(i => i.severity === 'high')
      if (critical.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hardware:issues', critical)
      }
    } catch (e) { appLog('warn', 'hardware', 'Environment diagnostic failed', e.message) }
  }).catch(e => appLog('error', 'hardware', 'Auto-probe failed', e.message))

  // Auto-reprobe every 30s — also checks printer queue health
  setInterval(async () => {
    try {
      const hadPrinter = !!hwPrinter
      // If scale port is open and working, skip scale re-detection (avoids port conflict)
      const scaleWorking = hwScalePort?.isOpen && scaleErrorCount < 10
      if (scaleWorking) {
        // Only reprobe printer — don't touch scale
        const devices = enumerateDevices()
        const printer = detectPrinter(devices)
        if (!printer?.needsSetup) hwPrinter = printer
        if (!hadPrinter && hwPrinter) appLog('info', 'hardware', `Printer connected: ${hwPrinter.name}`)
      } else {
        const hadScale = !!hwScale
        await probeHardware()
        if (!hadPrinter && hwPrinter) appLog('info', 'hardware', `Printer connected: ${hwPrinter.name}`)
        if (!hadScale && hwScale) {
          appLog('info', 'hardware', `Scale connected: ${hwScale.vendor || hwScale.product}`)
          startScalePolling()
        }
      }
      // Clear any stuck print jobs on each reprobe (detectPrinter handles full repair)
      if (isWin && hwPrinter?.name && hwPrinter.interface === 'windows') {
        const qs = getQueueStatus(hwPrinter.name)
        if (qs && (qs.JobCount || 0) > 0) clearPrinterQueue(hwPrinter.name)
      }
    } catch (_) {}
  }, 30000)

  // ── Continuous scale weight reading ──────────────────────────────────────
  let scalePollingTimer = null
  let lastScaleWeight = null
  let scaleErrorCount = 0
  let scaleStreamActive = false
  let lastStreamReading = null

  async function startScalePolling () {
    if (scalePollingTimer || scaleStreamActive) return
    if (!hwScale) return

    const protocol = hwScale?.protocol || 'sics'
    // Both SICS and MT 8217 use request-response polling (send command, read response)
    // The Viva/Ariva retail scales do NOT support continuous streaming mode
    appLog('info', 'hardware', `Starting scale polling (${protocol})`)
    scalePollingTimer = setInterval(pollScale, 500)
  }

  function stopScalePolling () {
    if (scalePollingTimer) { clearInterval(scalePollingTimer); scalePollingTimer = null }
    if (scaleStreamActive) stopScaleStream()
    lastScaleWeight = null
    scaleErrorCount = 0
  }

  // ── MT 8217 continuous streaming ('C' command) ─────────────────────────
  async function startScaleStream () {
    if (scaleStreamActive) return
    if (!hwScale?.port || !SerialPortLib) return

    try {
      if (!hwScalePort || !hwScalePort.isOpen) {
        await openScaleSerialPort(hwScale.port, hwScale.baud || 9600, 'mt8217')
      }
    } catch (e) {
      appLog('error', 'hardware', `Cannot open scale port for streaming: ${e.message}`)
      scalePollingTimer = setInterval(pollScale, 1000)
      return
    }

    scaleStreamActive = true
    scaleErrorCount = 0
    appLog('info', 'hardware', `Starting MT 8217 continuous stream on ${hwScale.port}`)

    let frameBuf = []
    let inFrame = false
    let watchdog = null

    const resetWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        if (!scaleStreamActive) return
        appLog('warn', 'hardware', 'Scale stream timeout — no data for 5s, reconnecting...')
        broadcastScaleWeight({ error: 'Scale connection lost', connected: false })
        stopScaleStream()
        setTimeout(() => { if (hwScale) startScalePolling() }, 2000)
      }, 5000)
    }

    let silenceTimer = null

    const processFrame = (data) => {
      const parsed = parse8217Response(Buffer.from(data))
      if (parsed) {
        scaleErrorCount = 0
        lastStreamReading = parsed
        const key = `${parsed.weight}|${parsed.status}`
        if (key !== lastScaleWeight) {
          lastScaleWeight = key
          broadcastScaleWeight({ ...parsed, connected: true })
        }
      }
    }

    const onStreamData = (chunk) => {
      resetWatchdog()
      for (const byte of chunk) {
        // Track STX-framed protocol
        if (byte === 0x02) { inFrame = true; frameBuf = []; continue }
        if (inFrame) {
          if (byte === 0x0D) {
            inFrame = false
            processFrame(frameBuf)
            frameBuf = []
          } else {
            frameBuf.push(byte)
          }
          continue
        }
        // Unframed: collect until CR/LF/ETX
        frameBuf.push(byte)
        if (byte === 0x0D || byte === 0x0A || byte === 0x03) {
          if (frameBuf.length > 1) {
            processFrame(frameBuf.slice(0, -1))  // exclude terminator
          }
          frameBuf = []
          continue
        }
      }
      // Silence detection for completely unframed data
      if (frameBuf.length > 0 && !inFrame) {
        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(() => {
          if (frameBuf.length > 0) {
            processFrame(frameBuf)
            frameBuf = []
          }
        }, 50)
      }
    }

    hwScalePort._streamListener = onStreamData
    hwScalePort._streamWatchdog = watchdog
    hwScalePort.on('data', onStreamData)
    resetWatchdog()

    // 'C' starts continuous output on MT 8217
    hwScalePort.write('C', 'ascii', () => { hwScalePort.drain(() => {}) })
  }

  function stopScaleStream () {
    scaleStreamActive = false
    if (hwScalePort) {
      if (hwScalePort._streamListener) {
        hwScalePort.removeListener('data', hwScalePort._streamListener)
        hwScalePort._streamListener = null
      }
      if (hwScalePort._streamWatchdog) {
        clearTimeout(hwScalePort._streamWatchdog)
        hwScalePort._streamWatchdog = null
      }
      if (hwScalePort.isOpen) {
        try { hwScalePort.write('\r', 'ascii', () => {}) } catch (_) {}
      }
    }
  }

  // ── Request-response polling (SICS / fallback) ────────────────────────
  let scalePollingBusy = false
  let lastGoodWeight = null  // last reading with weight > 0 (persists through in-motion/not-ready)
  async function pollScale () {
    if (scalePollingBusy) return
    if (!hwScale) { stopScalePolling(); return }
    scalePollingBusy = true
    try {
      const reading = await readScale()
      if (reading.error) {
        scaleErrorCount++
        if (scaleErrorCount === 10) appLog('warn', 'hardware', `Scale read errors: ${reading.error}`)
        if (scaleErrorCount >= 10) {
          broadcastScaleWeight({ error: reading.error, connected: false })
          if (scalePollingTimer) { clearInterval(scalePollingTimer); scalePollingTimer = setInterval(pollScale, 5000) }
        }
        return
      }
      if (scaleErrorCount >= 10) {
        if (scalePollingTimer) { clearInterval(scalePollingTimer); scalePollingTimer = setInterval(pollScale, 500) }
        appLog('info', 'hardware', 'Scale reconnected')
      }
      scaleErrorCount = 0

      // When scale is in motion or not ready, show last good weight instead of 0
      // This prevents the display from flickering between the real weight and 0
      let displayReading = reading
      if ((reading.status === 'not_ready' || reading.inMotion) && reading.weight === 0 && lastGoodWeight) {
        displayReading = { ...lastGoodWeight, status: reading.status, stable: false, inMotion: true }
      }
      if (reading.weight > 0 || reading.stable) {
        lastGoodWeight = reading
      }
      // Clear last good weight when scale settles back to zero (item removed)
      if (reading.weight === 0 && reading.stable) {
        lastGoodWeight = null
      }

      lastStreamReading = displayReading  // cache for probe result
      const key = `${displayReading.weight}|${displayReading.status}|${displayReading.unit}`
      if (key !== lastScaleWeight) {
        lastScaleWeight = key
        broadcastScaleWeight({ ...displayReading, connected: true })
      }
    } catch (e) {
      scaleErrorCount++
      if (scaleErrorCount <= 3) appLog('warn', 'hardware', `Scale poll error: ${e.message}`)
    } finally {
      scalePollingBusy = false
    }
  }

  function broadcastScaleWeight (data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scale:weight', data)
    }
  }

  // ── IPC handlers ───────────────────────────────────────────────────────────

  ipcMain.handle('hardware:probe', () => {
    return Promise.race([
      probeHardware(),
      new Promise(resolve => setTimeout(() => resolve({
        timeout: true,
        printer: { found: !!hwPrinter, name: hwPrinter?.name || '', error: 'Probe timed out (20s) — serial port scan may be hanging' },
        scale: { found: false, error: 'Probe timed out — a serial port may be held by another application (e.g. Profit Track)' },
        scanner: { found: !!hwScanner },
        drawer: { found: !!hwPrinter },
        usbDevices: [], serialPorts: [],
      }), 20000))
    ])
  })

  ipcMain.handle('hardware:diagnose', () => diagnoseEnvironment())

  // Full hardware diagnostic — dumps everything raw for debugging
  ipcMain.handle('hardware:diagnostic', async () => {
    const diag = { timestamp: new Date().toISOString(), platform: process.platform, arch: process.arch, nodeVersion: process.version, electronVersion: process.versions.electron || '' }

    // All HID devices (raw, unfiltered)
    diag.hidAvailable = !!HID
    diag.hidDevices = []
    if (HID) {
      try {
        diag.hidDevices = HID.devices().map(d => ({
          vendorId: '0x' + (d.vendorId || 0).toString(16).padStart(4, '0'),
          productId: '0x' + (d.productId || 0).toString(16).padStart(4, '0'),
          manufacturer: d.manufacturer || '',
          product: d.product || '',
          usagePage: '0x' + (d.usagePage || 0).toString(16).padStart(4, '0'),
          usage: '0x' + (d.usage || 0).toString(16).padStart(4, '0'),
          interface: d.interface ?? -1,
          release: d.release || 0,
          path: d.path || '',
        }))
      } catch (e) { diag.hidError = e.message }
    }

    // All serial ports (raw, unfiltered)
    diag.serialAvailable = !!SerialPortLib
    diag.serialPorts = []
    if (SerialPortLib) {
      try {
        const ports = await SerialPortLib.SerialPort.list()
        diag.serialPorts = ports.map(p => ({
          path: p.path,
          manufacturer: p.manufacturer || '',
          vendorId: p.vendorId || '',
          productId: p.productId || '',
          serialNumber: p.serialNumber || '',
          pnpId: p.pnpId || '',
          friendlyName: p.friendlyName || '',
          locationId: p.locationId || '',
        }))
      } catch (e) { diag.serialError = e.message }
    }

    // Windows-level COM port scan (catches ports serialport might miss)
    diag.windowsComPorts = []
    if (isWin) {
      try {
        const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_PnPEntity -Filter \\"Name LIKE '%(COM%'\\" -ErrorAction SilentlyContinue | Select-Object Name,DeviceID,Status | ConvertTo-Json -Compress"`, { timeout: 8000, encoding: 'utf-8' }).trim()
        if (raw) {
          const parsed = JSON.parse(raw)
          diag.windowsComPorts = (Array.isArray(parsed) ? parsed : [parsed]).map(d => ({
            name: d.Name || '', deviceId: d.DeviceID || '', status: d.Status || '',
            comPort: (d.Name?.match(/\((COM\d+)\)/) || [])[1] || '',
          }))
        }
      } catch (e) { diag.windowsComPortsError = e.message }
      // Also try registry
      try {
        const raw = hwExec(`powershell -NoProfile -NonInteractive -Command "Get-ItemProperty 'HKLM:\\HARDWARE\\DEVICEMAP\\SERIALCOMM' -ErrorAction SilentlyContinue | ConvertTo-Json -Compress"`, { timeout: 5000, encoding: 'utf-8' }).trim()
        if (raw) diag.registryComPorts = JSON.parse(raw)
      } catch (e) { diag.registryComPortsError = e.message }
    }

    // Current hardware state
    diag.currentState = {
      printer: hwPrinter ? { name: hwPrinter.name, interface: hwPrinter.interface, port: hwPrinter.port, configured: !!hwPrinter.configured } : null,
      scale: hwScale ? { type: hwScale.type, vendor: hwScale.vendor, port: hwScale.port, path: hwScale.path, protocol: hwScale.protocol, baud: hwScale.baud, configured: !!hwScale.configured } : null,
      scanner: hwScanner ? { vendor: hwScanner.vendor, product: hwScanner.product } : null,
    }

    // Brute-force serial scale scan — try every port with both protocols
    diag.serialScaleScan = []
    if (SerialPortLib && diag.serialPorts.length > 0) {
      for (const sp of diag.serialPorts) {
        for (const protocol of ['sics', 'mt8217']) {
          for (const baud of [9600, 19200, 4800, 2400]) {
            try {
              const result = await testSerialScale(sp.path, baud, protocol)
              diag.serialScaleScan.push({ port: sp.path, baud, protocol, ok: result.ok, reading: result.reading || null, error: result.error || null, raw: result.raw || null })
              if (result.ok) break // Found it at this baud, skip other baud rates for this protocol
            } catch (e) {
              diag.serialScaleScan.push({ port: sp.path, baud, protocol, ok: false, error: e.message })
            }
          }
        }
      }
    }

    // HID scale attempt — try reading from any device with scale usage page
    diag.hidScaleScan = []
    if (HID) {
      const hidDevs = HID.devices()
      // Try known vendor IDs
      for (const d of hidDevs) {
        if (SCALE_VENDORS[d.vendorId] || d.usagePage === SCALE_USAGE_PAGE) {
          try {
            const dev = new HID.HID(d.path)
            const data = dev.readTimeout(2000)
            dev.close()
            diag.hidScaleScan.push({
              path: d.path, vid: '0x' + d.vendorId.toString(16).padStart(4, '0'),
              pid: '0x' + d.productId.toString(16).padStart(4, '0'),
              vendor: SCALE_VENDORS[d.vendorId] || d.manufacturer || 'Unknown',
              ok: !!data && data.length >= 4,
              rawBytes: data ? Array.from(data).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ') : null,
              error: data ? null : 'No data (timeout)',
            })
          } catch (e) {
            diag.hidScaleScan.push({
              path: d.path, vid: '0x' + d.vendorId.toString(16).padStart(4, '0'),
              pid: '0x' + d.productId.toString(16).padStart(4, '0'),
              error: e.message,
            })
          }
        }
      }
    }

    // Printer / drawer diagnosis
    diag.printerScan = {}
    if (isWin) {
      const queues = getWindowsQueues()
      diag.printerScan.queues = queues.map(q => ({ name: q.Name, port: q.PortName, driver: q.DriverName, status: q.PrinterStatus }))
      diag.printerScan.queueTests = []
      for (const q of queues) {
        const works = testQueueRaw(q.Name)
        diag.printerScan.queueTests.push({ name: q.Name, port: q.PortName, driver: q.DriverName, rawSendOk: works })
      }
    }
    diag.printerScan.currentPrinter = hwPrinter ? { name: hwPrinter.name, interface: hwPrinter.interface, port: hwPrinter.port, tested: !!hwPrinter.tested, configured: !!hwPrinter.configured } : null
    diag.printerScan.drawerAvailable = !!hwPrinter && !hwPrinter.needsSetup

    // Scanner diagnosis
    diag.scannerScan = {}
    const scannerDevices = HID ? HID.devices().filter(d => d.vendorId && SCANNER_VENDORS[d.vendorId]) : []
    diag.scannerScan.hidMatches = scannerDevices.map(d => ({
      vid: '0x' + d.vendorId.toString(16).padStart(4, '0'),
      pid: '0x' + d.productId.toString(16).padStart(4, '0'),
      vendor: SCANNER_VENDORS[d.vendorId],
      product: d.product || '',
      manufacturer: d.manufacturer || '',
    }))
    diag.scannerScan.currentScanner = hwScanner
    // Also list any HID keyboard-mode devices (scanners often present as keyboards)
    diag.scannerScan.hidKeyboards = HID ? HID.devices().filter(d => d.usagePage === 1 && d.usage === 6 && d.vendorId).map(d => ({
      vid: '0x' + d.vendorId.toString(16).padStart(4, '0'),
      pid: '0x' + d.productId.toString(16).padStart(4, '0'),
      product: d.product || '',
      manufacturer: d.manufacturer || '',
      note: 'HID keyboard (could be scanner in keyboard-emulation mode)',
    })) : []

    // Saved config from DB
    diag.savedConfig = {}
    for (const key of ['hw_scale_type', 'hw_scale_port', 'hw_scale_path', 'hw_scale_baud', 'hw_scale_protocol', 'hw_printer_interface', 'hw_printer_name', 'hw_printer_port', 'hw_printer_ip']) {
      const row = dbGet("SELECT value FROM settings WHERE key = ?1", [key])
      if (row) diag.savedConfig[key] = row.value
    }

    // Auto-save to desktop for easy sharing
    try {
      const desktop = path.join(os.homedir(), 'Desktop')
      const filePath = path.join(desktop, `crisp-hw-diag-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`)
      fs.writeFileSync(filePath, JSON.stringify(diag, null, 2))
      diag._savedTo = filePath
    } catch (e) { diag._saveError = e.message }

    return diag
  })

  ipcMain.handle('hardware:printReceipt', async (_e, receiptData) => {
    try {
      // Try OPOS first (if available and configured)
      const opos = checkOpos()
      if (opos.printer) {
        appLog('info', 'printer', `Printing receipt via OPOS (device: ${oposPrinterName || 'auto'})`)
        const buf = buildReceiptBuffer(receiptData)
        const b64 = buf.toString('base64')
        const result = oposPrintRaw(b64)
        if (result.ok) {
          oposCut()
          return true
        }
        appLog('warn', 'printer', `OPOS print failed: ${result.error} — falling back to raw spooler`)
      }

      // Fallback: raw spooler path
      if (!hwPrinter) {
        appLog('info', 'printer', 'No printer configured, probing...')
        await probeHardware()
      }
      if (!hwPrinter) return { error: 'No printer detected. Go to Admin → Hardware and run Probe All Devices.' }
      appLog('info', 'printer', `Printing receipt via "${hwPrinter.name}" (${hwPrinter.interface})`)
      if (hwPrinter?.name && isWin) resumePrinterQueue(hwPrinter.name)
      const buf = buildReceiptBuffer(receiptData)
      const result = await sendToPrinter(buf)
      if (!result.ok) {
        appLog('error', 'printer', `Print send failed: ${result.detail}`)
        return { error: result.detail }
      }
      return true
    } catch (err) {
      appLog('error', 'printer', 'Print failed', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('hardware:openDrawer', async () => {
    try {
      // Try OPOS first (dedicated CashDrawer device — more reliable than printer DK port)
      const opos = checkOpos()
      if (opos.drawer) {
        appLog('info', 'drawer', `Opening drawer via OPOS (device: ${oposDrawerName || 'auto'})`)
        const result = oposOpenDrawer()
        if (result.ok) {
          appLog('info', 'drawer', 'OPOS drawer opened OK')
          return true
        }
        appLog('warn', 'drawer', `OPOS drawer failed: ${result.error} — falling back to ESC/POS`)
      }

      // Fallback: ESC/POS drawer kick via printer
      if (!hwPrinter) {
        appLog('info', 'drawer', 'No printer configured, probing...')
        await probeHardware()
      }
      if (!hwPrinter) return { error: 'No printer detected — drawer opens via printer DK port. Go to Admin → Hardware.' }
      if (hwPrinter?.name && isWin) resumePrinterQueue(hwPrinter.name)
      appLog('info', 'drawer', `Opening drawer via "${hwPrinter.name}" (${hwPrinter.interface})`)
      const buf = Buffer.concat([ESCPOS.INIT, ESCPOS.DRAWER_KICK])
      const result = await sendToPrinter(buf)
      if (!result.ok) { appLog('error', 'drawer', `Drawer open failed: ${result.detail}`); return { error: result.detail } }
      appLog('info', 'drawer', 'Drawer kick sent OK')
      return true
    } catch (err) {
      appLog('error', 'drawer', 'Open drawer failed', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('hardware:readScale', () => readScale())
  ipcMain.handle('hardware:zeroScale', () => zeroScale())
  ipcMain.handle('hardware:getSerialPorts', () => enumerateSerialPorts())
  ipcMain.handle('hardware:testScale', (_e, portPath, baud, protocol) => testSerialScale(portPath, baud, protocol))

  ipcMain.handle('hardware:testPrinter', async () => {
    if (!hwPrinter) return { ok: false, error: 'No printer detected' }
    const parts = [ESCPOS.INIT, Buffer.from([0x1B, 0x74, 0x00]), ESCPOS.ALIGN_CENTER, ESCPOS.BOLD_ON]
    parts.push(Buffer.from('=== TEST PRINT ===\n', 'latin1'))
    parts.push(ESCPOS.BOLD_OFF)
    parts.push(Buffer.from(`Printer: ${hwPrinter.name || 'Unknown'}\n`, 'latin1'))
    parts.push(Buffer.from(`Port: ${hwPrinter.port || hwPrinter.interface || 'N/A'}\n`, 'latin1'))
    parts.push(Buffer.from(`Date: ${new Date().toLocaleString('en-AU')}\n`, 'latin1'))
    parts.push(Buffer.from('If you see this, printing works!\n', 'latin1'))
    parts.push(ESCPOS.FEED_3, ESCPOS.PARTIAL_CUT)
    const buf = Buffer.concat(parts)
    const result = await sendToPrinter(buf)
    return result.ok ? { ok: true, status: 'Test page printed successfully' } : { ok: false, error: result.detail }
  })

  ipcMain.handle('hardware:testQueue', (_e, queueName) => {
    if (!isWin) return { ok: false, error: 'Queue test only available on Windows' }
    // Send a visible test page so user can confirm which queue actually prints
    const testBuf = Buffer.concat([
      ESCPOS.INIT, Buffer.from([0x1B, 0x74, 0x00]),
      ESCPOS.ALIGN_CENTER, ESCPOS.BOLD_ON,
      Buffer.from('=== QUEUE TEST ===\n', 'latin1'), ESCPOS.BOLD_OFF,
      Buffer.from(`Queue: ${queueName}\n`, 'latin1'),
      Buffer.from(`Time: ${new Date().toLocaleString('en-AU')}\n`, 'latin1'),
      Buffer.from('This queue works!\n', 'latin1'),
      ESCPOS.FEED_3, ESCPOS.PARTIAL_CUT
    ])
    const tmpFile = path.join(os.tmpdir(), `crisp-test-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, testBuf)
    let works = false
    try {
      const result = hwExec(`powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${RAWPRINT_SCRIPT}" -PrinterName "${queueName.replace(/"/g, '`"')}" -FilePath "${tmpFile}"`, { timeout: 8000, encoding: 'utf-8' }).trim()
      works = result.startsWith('OK')
    } catch (_) {}
    try { fs.unlinkSync(tmpFile) } catch (_) {}
    if (works) {
      hwPrinter = { name: queueName, interface: 'windows', tested: true }
      hwPrinterReady = true
      hwPrinterCheckTime = Date.now()
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_name', ?1)", [queueName])
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('hw_printer_interface', 'windows')", [])
      scheduleSave()
      return { ok: true, status: `Queue "${queueName}" responds to raw data` }
    }
    return { ok: false, error: `Queue "${queueName}" did not respond — may be offline, wrong port, or wrong driver` }
  })

  ipcMain.handle('hardware:getQueues', () => {
    return getWindowsQueues().map(q => ({ name: q.Name, port: q.PortName, driver: q.DriverName }))
  })

  // ── OPOS IPC handlers ────────────────────────────────────────────────────
  ipcMain.handle('hardware:oposCheck', () => {
    const result = checkOpos()
    const devices = listOposDevices()
    return { available: result, devices: devices.ok ? devices.data : null }
  })

  ipcMain.handle('hardware:oposListDevices', () => listOposDevices())

  ipcMain.handle('hardware:oposConfigure', (_e, config) => {
    if (config.printerName !== undefined) {
      oposPrinterName = config.printerName
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('opos_printer_name', ?1)", [config.printerName])
    }
    if (config.drawerName !== undefined) {
      oposDrawerName = config.drawerName
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('opos_drawer_name', ?1)", [config.drawerName])
    }
    if (config.scaleName !== undefined) {
      oposScaleName = config.scaleName
      dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('opos_scale_name', ?1)", [config.scaleName])
    }
    scheduleSave()
    return { ok: true }
  })

  ipcMain.handle('hardware:oposTestPrinter', (_e, deviceName) => {
    const name = deviceName || oposPrinterName
    const result = oposCall('print', { deviceName: name, data: '=== OPOS TEST ===\nPrinter: ' + name + '\nDate: ' + new Date().toLocaleString('en-AU') + '\nOPOS is working!\n' })
    if (result.ok) oposCall('cut', { deviceName: name })
    return result
  })

  ipcMain.handle('hardware:oposTestDrawer', (_e, deviceName) => {
    return oposCall('open-drawer', { deviceName: deviceName || oposDrawerName })
  })

  ipcMain.handle('hardware:oposTestScale', (_e, deviceName) => {
    return oposCall('read-scale', { deviceName: deviceName || oposScaleName })
  })

  ipcMain.handle('hardware:configure', async (_e, config) => {
    const keys = {
      printerName: 'hw_printer_name', printerPort: 'hw_printer_port', printerInterface: 'hw_printer_interface',
      printerIp: 'hw_printer_ip', printerNetworkPort: 'hw_printer_network_port',
      scalePath: 'hw_scale_path', scaleType: 'hw_scale_type', scalePort: 'hw_scale_port',
      scaleBaud: 'hw_scale_baud', scaleProtocol: 'hw_scale_protocol',
    }
    for (const [k, dbKey] of Object.entries(keys)) {
      if (config[k] !== undefined) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)", [dbKey, config[k]])
    }
    scheduleSave()
    hwPrinterReady = false
    // Close existing scale connections if reconfiguring
    if (hwScalePort) { try { hwScalePort.close() } catch (_) {} hwScalePort = null }
    closeHidScale()
    loadSavedHardwareConfig()
    return { ok: true }
  })

  ipcMain.handle('hardware:getConfig', () => {
    return {
      printerName: dbGet("SELECT value FROM settings WHERE key='hw_printer_name'")?.value || '',
      printerPort: dbGet("SELECT value FROM settings WHERE key='hw_printer_port'")?.value || '',
      printerInterface: dbGet("SELECT value FROM settings WHERE key='hw_printer_interface'")?.value || '',
      printerIp: dbGet("SELECT value FROM settings WHERE key='hw_printer_ip'")?.value || '',
      printerNetworkPort: dbGet("SELECT value FROM settings WHERE key='hw_printer_network_port'")?.value || '9100',
      scalePath: dbGet("SELECT value FROM settings WHERE key='hw_scale_path'")?.value || '',
      scaleType: dbGet("SELECT value FROM settings WHERE key='hw_scale_type'")?.value || '',
      scalePort: dbGet("SELECT value FROM settings WHERE key='hw_scale_port'")?.value || '',
      scaleBaud: dbGet("SELECT value FROM settings WHERE key='hw_scale_baud'")?.value || '9600',
      scaleProtocol: dbGet("SELECT value FROM settings WHERE key='hw_scale_protocol'")?.value || 'sics',
    }
  })

  // ── LAN Sync ────────────────────────────────────────────────────────────────

  ipcMain.handle('lan:getStatus', () => lanSync.getStatus())
  ipcMain.handle('lan:getPeers', () => lanSync.getPeers())
  ipcMain.handle('lan:sessionAction', (_e, action, staffId, staffName, registerId) => lanSync.sessionAction(action, staffId, staffName, registerId))

  ipcMain.handle('lan:testConnection', (_e, ip, port) => lanSync.testConnection(ip, port))

  ipcMain.handle('lan:restart', async () => {
    lanSync.stopAll()
    const lanMode = dbGet("SELECT value FROM settings WHERE key = 'lan_mode'")?.value
    const lanPort = parseInt(dbGet("SELECT value FROM settings WHERE key = 'lan_port'")?.value || '5555')
    if (lanMode === 'server') {
      lanSync.startServer(lanPort, { dbAll, dbGet, dbRun, saveDB, uuid })
      await new Promise(resolve => setTimeout(resolve, 500))
    } else if (lanMode === 'client') {
      const serverIp = dbGet("SELECT value FROM settings WHERE key = 'lan_server_ip'")?.value
      const secret = dbGet("SELECT value FROM settings WHERE key = 'lan_secret'")?.value
      if (serverIp) {
        lanSync.startClient(serverIp, lanPort, secret, { dbAll, dbGet, dbRun, saveDB, uuid })
      }
    }
    return lanSync.getStatus()
  })

  ipcMain.handle('lan:discover', async () => {
    const result = await lanSync.discoverServer(6000)
    return result
  })

  ipcMain.handle('lan:networkDiagnostic', async () => {
    return await lanSync.networkDiagnostic()
  })

  // ── Linkly Payment Terminal ─────────────────────────────────────────────────

  ipcMain.handle('linkly:getStatus', () => linkly.getStatus())

  ipcMain.handle('linkly:configure', (_e, opts) => {
    linkly.configure(opts)
    if (opts.username) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_username', ?1)", [opts.username])
    if (opts.password) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_password', ?1)", [opts.password])
    if (opts.secret) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_secret', ?1)", [opts.secret])
    if (opts.environment) dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_environment', ?1)", [opts.environment])
    return { ok: true }
  })

  ipcMain.handle('linkly:pair', async (_e, username, password, pairCode) => {
    try {
      const result = await linkly.pair(username, password, pairCode)
      if (result.secret) {
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_secret', ?1)", [result.secret])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_username', ?1)", [username])
        dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('linkly_password', ?1)", [password])
      }
      return result
    } catch (e) {
      return { error: e.message }
    }
  })

  ipcMain.handle('linkly:purchase', async (_e, amountCents, txnRef) => {
    try {
      const result = await linkly.processPayment(amountCents, txnRef, (status) => {
        if (mainWindow) mainWindow.webContents.send('linkly:status', status)
      })
      return result
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('linkly:refund', async (_e, amountCents, txnRef) => {
    try {
      const result = await linkly.processRefund(amountCents, txnRef, (status) => {
        if (mainWindow) mainWindow.webContents.send('linkly:status', status)
      })
      return result
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('linkly:cancel', () => {
    linkly.cancelPolling()
    return { ok: true }
  })

  ipcMain.handle('linkly:settlement', async () => {
    try {
      const result = await linkly.settlement()
      return result
    } catch (e) {
      return { error: e.message }
    }
  })

  // Restore Linkly config from settings on startup
  try {
    const lkUser = dbGet("SELECT value FROM settings WHERE key = 'linkly_username'")
    const lkPass = dbGet("SELECT value FROM settings WHERE key = 'linkly_password'")
    const lkSecret = dbGet("SELECT value FROM settings WHERE key = 'linkly_secret'")
    const lkEnv = dbGet("SELECT value FROM settings WHERE key = 'linkly_environment'")
    if (lkUser?.value || lkSecret?.value) {
      linkly.configure({
        username: lkUser?.value || '',
        password: lkPass?.value || '',
        secret: lkSecret?.value || '',
        environment: lkEnv?.value || 'sandbox'
      })
      appLog('info', 'linkly', 'Linkly credentials loaded from settings')
    }
  } catch (_) {}
}

// ─── Sync Queue Helper ───────────���────────────────────────────────────────────

function queueSync(table, recordId, action) {
  const row = dbGet(`SELECT * FROM ${table} WHERE id = ?1`, [recordId])
  if (row) {
    dbRun(`INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES (?1, ?2, ?3, ?4)`,
          [table, recordId, action, JSON.stringify(row)])
  }
  lanSync.bumpVersion()
}
