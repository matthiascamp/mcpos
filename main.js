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
    "DELETE FROM keyboard_buttons WHERE id = 'fn-ubereats'",
  ]
  for (const m of migrations) {
    try { db.run(m) } catch (_) {}
  }

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
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const rows = []
    while (stmt.step()) {
      rows.push(stmt.getAsObject())
    }
    stmt.free()
    return rows
  } catch (e) {
    appLog('error', 'database', `dbAll error: ${e.message}`, sql.slice(0, 200))
    return []
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
const KB_IMAGE_MAP = {
  // Main page department buttons
  'btn-meat':    { base: 'ext', file: 'Barbell_Air_Dried_Steak.jpg' },
  'btn-coffee':  { base: 'img', file: 'Fresh_Press_Cold_Drip_Coffee.jpg' },
  'btn-fv':      { base: 'fv', file: 'Apple_Royal_Gala_Large.jpg' },
  'btn-cheese':  { base: 'deli', file: 'Auricchio_Grana_Padano.jpg' },
  'btn-flowers': { base: 'fv', file: 'Strawberries.jpg' },
  'btn-bread':   { base: 'ext', file: 'F_R_CIABATTA_LOAF.jpg' },
  'btn-bags':    { base: 'img', file: 'Home_Force_Garbage_Bags_Handle_Tie.jpg' },
  'btn-deli':    { base: 'deli', file: 'Casalingo_Prosciutto.jpg' },
  'btn-nuts':    { base: 'img', file: 'Cashew_Macadamia_Mix.jpg' },
  'btn-grocery': { base: 'img', file: 'Kettle.jpg' },
  'btn-gas':     { base: 'img', file: 'Coca_Cola_1.25L.jpg' },
  // Page 2: Fruit A-M
  'pg2-apples': { base: 'fv', file: 'Apple_Royal_Gala_Large.jpg' },
  'pg2-apricots': { base: 'fv', file: 'Apricots.jpg' },
  'pg2-avocados': { base: 'fv', file: 'Avocadoes_Small.jpg' },
  'pg2-bananas': { base: 'fv', file: 'Bananas_Cavendish.jpg' },
  'pg2-berries': { base: 'fv', file: 'Strawberries.jpg' },
  'pg2-cherries': { base: 'fv', file: 'Cherry_Tomatoes.jpg' },
  'pg2-coconut': { base: 'img', file: 'MAE_MASSIMO_VUVOA_COCONUT.jpg' },
  'pg2-custard-apple': { base: 'fv', file: 'Custard_Apples.jpg' },
  'pg2-dragon-fruit': { base: 'img', file: 'Red_Dragon_Fruit.jpg' },
  'pg2-figs': { base: 'fv', file: 'Figs_Fresh.jpg' },
  'pg2-grapes': { base: 'fv', file: 'Grapes_Autumn_King.jpg' },
  'pg2-grapefruit': { base: 'fv', file: 'Grapefruit_Ruby_Red.jpg' },
  'pg2-guava': { base: 'fv', file: 'Passionfruit.jpg' },
  'pg2-kiwi': { base: 'fv', file: 'Kiwi_Fruit.jpg' },
  'pg2-lemons': { base: 'fv', file: 'Lemons_Fresh.jpg' },
  'pg2-limes': { base: 'fv', file: 'Limes.jpg' },
  'pg2-longan': { base: 'fv', file: 'Nectarine.jpg' },
  'pg2-lychee': { base: 'fv', file: 'Raspberries_Punnet.jpg' },
  'pg2-mandarins': { base: 'fv', file: 'Mandarines_Afrourer.jpg' },
  'pg2-mangoes': { base: 'ext', file: 'MANGOES_R2E2_EA.jpg' },
  'pg2-melons': { base: 'fv', file: 'Melon_Honey_Dew.jpg' },
  // Page 3: Fruit N-Z
  'pg3-nectarines': { base: 'fv', file: 'Nectarine.jpg' },
  'pg3-oranges': { base: 'fv', file: 'Navel_Orange.jpg' },
  'pg3-passion-fruit': { base: 'fv', file: 'Passionfruit.jpg' },
  'pg3-papaya': { base: 'fv', file: '(S)_Red_Papaya.jpg' },
  'pg3-pawpaw': { base: 'fv', file: 'Paw_Paw_Green.jpg' },
  'pg3-peaches': { base: 'fv', file: 'Peach_White.jpg' },
  'pg3-pears': { base: 'fv', file: 'Pears_Packham.jpg' },
  'pg3-persimmons': { base: 'fv', file: 'Persimmon.jpg' },
  'pg3-pineapple-sm': { base: 'fv', file: 'Pineapple_Smooth_Small.jpg' },
  'pg3-pineapple-md': { base: 'fv', file: 'Pineapple_Topless_M_Small.jpg' },
  'pg3-pineapple-xl': { base: 'fv', file: 'Pineapple_Extra_Large.jpg' },
  'pg3-plums': { base: 'fv', file: 'Plums_Sugar.jpg' },
  'pg3-pomegranate': { base: 'fv', file: 'Pomegranate.jpg' },
  'pg3-raspberries': { base: 'fv', file: 'Raspberries_Punnet.jpg' },
  'pg3-blueberries': { base: 'fv', file: 'Blueberries_Punnet.jpg' },
  'pg3-rockmelon': { base: 'fv', file: 'Rockmelon.jpg' },
  'pg3-strawberries': { base: 'fv', file: 'Strawberries.jpg' },
  'pg3-watermelon': { base: 'fv', file: '(S)Seedless_Watermelon_Whole.jpg' },
  'pg3-tangello': { base: 'fv', file: 'Cara_Cara_Orange.jpg' },
  // Page 4: Vegetables A-G
  'pg4-asian-vege': { base: 'fv', file: 'Cabbage_Chinese.jpg' },
  'pg4-asparagus': { base: 'fv', file: 'Asparagus_Bunch.jpg' },
  'pg4-beans': { base: 'fv', file: 'Beans_Fresh.jpg' },
  'pg4-beetroot': { base: 'fv', file: 'Beetroot.jpg' },
  'pg4-broccolini': { base: 'fv', file: 'Broccolini_Bunch.jpg' },
  'pg4-broccoli': { base: 'fv', file: 'Broccoli.jpg' },
  'pg4-brussels': { base: 'fv', file: 'Brussel_Sprouts.jpg' },
  'pg4-cabbage': { base: 'fv', file: 'Cabbage_Drum_Head.jpg' },
  'pg4-capsicum': { base: 'fv', file: 'Capsicum_Red.jpg' },
  'pg4-carrots': { base: 'fv', file: 'Carrots.jpg' },
  'pg4-carrot-bag': { base: 'fv', file: 'Carrot_Bag.jpg' },
  'pg4-cauliflower': { base: 'fv', file: 'Cauliflower.jpg' },
  'pg4-celery': { base: 'fv', file: 'Celery.jpg' },
  'pg4-celeriac': { base: 'ext', file: 'CELERIAC_EA.jpg' },
  'pg4-chillies': { base: 'fv', file: '(S)_Chilli_Birds_Eye.jpg' },
  'pg4-chokos': { base: 'fv', file: 'Chokoes.jpg' },
  'pg4-corn': { base: 'fv', file: 'Corn_Each.jpg' },
  'pg4-cucumbers': { base: 'fv', file: 'Cucumber_Continental.jpg' },
  'pg4-eggplant': { base: 'fv', file: 'Eggplant.jpg' },
  'pg4-leb-eggplant': { base: 'fv', file: 'Eggplant_Baby.jpg' },
  'pg4-fennel': { base: 'fv', file: 'Celery.jpg' },
  'pg4-garlic': { base: 'fv', file: 'Garlic.jpg' },
  'pg4-ginger': { base: 'fv', file: 'Ginger.jpg' },
  // Page 5: Vegetables H-Z
  'pg5-herbs': { base: 'fv', file: 'Basil_Large_Bunch.jpg' },
  'pg5-kale': { base: 'fv', file: 'Kale_Bunch.jpg' },
  'pg5-leeks': { base: 'fv', file: 'Leek_Bunch.jpg' },
  'pg5-lettuces': { base: 'fv', file: 'Lettuce_Iceberg.jpg' },
  'pg5-lettuce-bags': { base: 'fv', file: 'Assorted_Lettuce_Bags.jpg' },
  'pg5-mushrooms': { base: 'fv', file: 'Mushroom_Cups.jpg' },
  'pg5-olives': { base: 'ext', file: 'AGEAN_BLACK_BEANS.jpg' },
  'pg5-onions': { base: 'fv', file: 'Onions_Brown.jpg' },
  'pg5-parsnip': { base: 'fv', file: 'Parsnip.jpg' },
  'pg5-peas': { base: 'ext', file: 'SNOW_PEAS_KG.jpg' },
  'pg5-potatoes': { base: 'fv', file: 'Potatoes_Washed.jpg' },
  'pg5-pumpkins': { base: 'fv', file: 'Pumpkin_Jap.jpg' },
  'pg5-radish': { base: 'fv', file: 'Snacking_Raddish.jpg' },
  'pg5-rhubarb': { base: 'fv', file: 'Celery.jpg' },
  'pg5-shallots': { base: 'fv', file: 'Eshallots_Bunch.jpg' },
  'pg5-silverbeet': { base: 'fv', file: 'Silverbeet_Bunch.jpg' },
  'pg5-snow-peas': { base: 'ext', file: 'SNOW_PEAS_KG.jpg' },
  'pg5-sprouts': { base: 'fv', file: 'Alfalfa_Sprout_Salad.jpg' },
  'pg5-swedes': { base: 'fv', file: 'Swedes.jpg' },
  'pg5-sweet-potato': { base: 'fv', file: 'Special_Sweet_Potatoes.jpg' },
  'pg5-tomatoes': { base: 'fv', file: 'Tomatoes.jpg' },
  'pg5-turnip': { base: 'fv', file: 'Swedes.jpg' },
  'pg5-zucchini': { base: 'fv', file: 'Zucchini_Large.jpg' },
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

  // Send store name
  customerWindow.webContents.on('did-finish-load', () => {
    const row = dbGet("SELECT value FROM settings WHERE key = 'store_name'")
    if (row && customerWindow) {
      customerWindow.webContents.send('customer:update', { items: [], storeName: row.value })
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
      SELECT p.*, c.name as category_name,
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
      SELECT p.*, c.name as category_name,
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
      SELECT p.*, c.name as category_name,
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
      dbRun(`INSERT OR REPLACE INTO products (id, barcode, name, category_id, price, unit, active, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, datetime('now'))`,
            [id, p.barcode || null, p.name, catMap[p.category] || null, p.price, p.unit || 'each'])
      imported++
    }

    saveDB()
    return { imported, categories: Object.keys(catMap).length }
  })

  // ── Hardware (Windows spooler ESC/POS — Epson TM-T82II on USB003) ──────────

  const { execSync: hwExec } = require('child_process')
  const os = require('os')

  const RECEIPT_PRINTER_NAME = 'EPSON TM-T82II Receipt'
  const RECEIPT_PRINTER_PORT = 'USB003'

  // ESC/POS command bytes
  const ESC = 0x1b
  const GS = 0x1d
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
    DRAWER_KICK: Buffer.from([ESC, 0x70, 0x00, 0x19, 0x78]),
    // Barcode: CODE128, height 60, width 2, HRI below
    BARCODE_HEIGHT: Buffer.from([GS, 0x68, 0x3C]),
    BARCODE_WIDTH: Buffer.from([GS, 0x77, 0x02]),
    BARCODE_HRI_BELOW: Buffer.from([GS, 0x48, 0x02]),
  }

  // Ensure the Epson is registered as a Windows printer on USB003
  let printerReady = false
  let printerCheckTime = 0
  function ensureReceiptPrinter() {
    // Cache printer check for 60 seconds to avoid repeated slow powershell calls
    if (printerReady && Date.now() - printerCheckTime < 60000) return
    try {
      const check = hwExec(`powershell -NoProfile -Command "Get-Printer -Name '${RECEIPT_PRINTER_NAME}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"`, { timeout: 5000, encoding: 'utf-8' })
      if (check.trim()) { printerReady = true; printerCheckTime = Date.now(); return }
    } catch (_) {}
    // Add it using Generic / Text Only driver on USB003
    try {
      hwExec(`powershell -NoProfile -Command "Add-Printer -Name '${RECEIPT_PRINTER_NAME}' -DriverName 'Generic / Text Only' -PortName '${RECEIPT_PRINTER_PORT}'"`, { timeout: 5000, encoding: 'utf-8' })
      printerReady = true; printerCheckTime = Date.now()
      console.log('Added receipt printer:', RECEIPT_PRINTER_NAME, 'on', RECEIPT_PRINTER_PORT)
    } catch (e) {
      printerCheckTime = Date.now() // Don't retry for 60s even on failure
      console.log('Failed to add receipt printer:', e.message)
    }
  }

  // Send raw bytes to the printer via Windows spooler (rawprint.ps1)
  const RAWPRINT_SCRIPT = path.join(__dirname, 'rawprint.ps1')

  function sendRawToPrinter(data) {
    const tmpFile = path.join(os.tmpdir(), `crisp-receipt-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, data)
    try {
      const result = hwExec(
        `powershell -ExecutionPolicy Bypass -NoProfile -File "${RAWPRINT_SCRIPT}" -PrinterName "${RECEIPT_PRINTER_NAME}" -FilePath "${tmpFile}"`,
        { timeout: 15000, encoding: 'utf-8' }
      )
      const output = result.trim()
      console.log('rawprint.ps1 output:', output)
      if (output.startsWith('OK')) return { ok: true, detail: output }
      return { ok: false, detail: output }
    } catch (e) {
      return { ok: false, detail: e.stderr || e.message }
    } finally {
      try { fs.unlinkSync(tmpFile) } catch (_) {}
    }
  }

  // Build receipt as a single ESC/POS byte buffer
  function buildReceiptBuffer(receiptData) {
    const parts = []
    const text = (s) => parts.push(Buffer.from(s + '\n', 'utf-8'))
    const cmd = (buf) => parts.push(buf)

    cmd(ESCPOS.INIT)
    cmd(ESCPOS.ALIGN_CENTER)

    // Print barcode at top if provided (for held sales)
    if (receiptData.barcode) {
      cmd(ESCPOS.BARCODE_HEIGHT)
      cmd(ESCPOS.BARCODE_WIDTH)
      cmd(ESCPOS.BARCODE_HRI_BELOW)
      // CODE128: GS k 73 len data
      const barcodeStr = receiptData.barcode.replace(/-/g, '').substring(0, 20)
      const barcodeData = Buffer.from(barcodeStr, 'ascii')
      cmd(Buffer.from([GS, 0x6B, 0x49, barcodeData.length]))
      cmd(barcodeData)
      text('')
      text('')
    }

    cmd(ESCPOS.BOLD_ON)
    cmd(ESCPOS.DOUBLE_SIZE)
    text(receiptData.storeName || 'Crisp on Creek')
    cmd(ESCPOS.NORMAL_SIZE)
    cmd(ESCPOS.BOLD_OFF)

    if (receiptData.storeAddress) text(receiptData.storeAddress)
    if (receiptData.storePhone) text(`Ph: ${receiptData.storePhone}`)
    if (receiptData.storeAbn) text(`ABN: ${receiptData.storeAbn}`)
    if (receiptData.header) { text(''); text(receiptData.header) }

    text('')
    cmd(ESCPOS.ALIGN_LEFT)
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

    text('-'.repeat(42))
    cmd(ESCPOS.ALIGN_RIGHT)
    if (receiptData.discount > 0) text(`Discount: -$${receiptData.discount.toFixed(2)}`)
    cmd(ESCPOS.BOLD_ON)
    cmd(ESCPOS.DOUBLE_SIZE)
    text(`TOTAL: $${receiptData.total.toFixed(2)}`)
    cmd(ESCPOS.NORMAL_SIZE)
    cmd(ESCPOS.BOLD_OFF)
    text(`Total includes GST of $${receiptData.tax.toFixed(2)}`)
    text('')

    for (const pay of receiptData.payments) {
      text(`${pay.method.toUpperCase()}: $${pay.amount.toFixed(2)}`)
    }
    if (receiptData.change > 0) text(`Change: $${receiptData.change.toFixed(2)}`)

    text('')
    cmd(ESCPOS.ALIGN_CENTER)
    text(receiptData.footer || 'Thank you for shopping local!')
    cmd(ESCPOS.FEED_3)
    cmd(ESCPOS.PARTIAL_CUT)

    return Buffer.concat(parts)
  }

  // Auto-setup printer on app start
  ensureReceiptPrinter()

  ipcMain.handle('hardware:printReceipt', async (_e, receiptData) => {
    try {
      ensureReceiptPrinter()
      const buf = buildReceiptBuffer(receiptData)
      const result = sendRawToPrinter(buf)
      if (!result.ok) return { error: result.detail }
      return true
    } catch (err) {
      appLog('error', 'printer', 'Print receipt failed', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('hardware:openDrawer', async () => {
    try {
      ensureReceiptPrinter()
      const buf = Buffer.concat([ESCPOS.INIT, ESCPOS.DRAWER_KICK])
      const result = sendRawToPrinter(buf)
      if (!result.ok) return { error: result.detail }
      return true
    } catch (err) {
      appLog('error', 'drawer', 'Open drawer failed', err.message)
      return { error: err.message }
    }
  })

  // -- Device Probing -------------------------------------------------------

  ipcMain.handle('hardware:probe', async () => {
    const result = {
      usbDevices: [],
      printer: { found: false, name: '', error: '' },
      drawer: { found: false },
      scanner: { found: false, name: '' },
      scale: { found: false, name: '' }
    }

    const PRINTER_VIDS = [0x04b8, 0x0519, 0x0416, 0x0dd4, 0x20d1, 0x0fe6, 0x1fc9, 0x0483]
    const SCALE_VIDS = [0x0b67, 0x0922, 0x1446, 0x0eb8]
    const SCANNER_VIDS = [0x05e0, 0x05f9, 0x0c2e, 0x1eab, 0x2dd6, 0x1a86]

    // Use PowerShell to detect all USB/HID/Printer devices
    try {
      const psCmd = `powershell -NoProfile -Command "Get-PnpDevice -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.Class -in @('USB','Printer','HIDClass','Ports','PrintQueue') } | Select-Object FriendlyName,InstanceId,Class | ConvertTo-Json -Compress"`
      const raw = hwExec(psCmd, { timeout: 15000, encoding: 'utf-8' })
      const devices = JSON.parse(raw)
      const devList = Array.isArray(devices) ? devices : [devices]
      for (const d of devList) {
        const vid = (d.InstanceId?.match(/VID_([0-9A-F]{4})/i) || [])[1]
        const pid = (d.InstanceId?.match(/PID_([0-9A-F]{4})/i) || [])[1]
        result.usbDevices.push({
          vendorId: vid ? parseInt(vid, 16) : 0,
          productId: pid ? parseInt(pid, 16) : 0,
          manufacturer: '',
          product: d.FriendlyName || '',
          deviceClass: d.Class || ''
        })
      }
    } catch (e) {
      result.printer.error = `Device detection failed: ${e.message}`
    }

    // Only check real USB devices (vendorId > 0) — skip virtual printers/ports
    for (const d of result.usbDevices) {
      if (!d.vendorId) continue // Skip virtual devices (PrintQueue, COM ports)
      if (PRINTER_VIDS.includes(d.vendorId)) {
        result.printer.found = true
        result.printer.name = d.product || `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
        result.drawer.found = true
      }
      if (SCALE_VIDS.includes(d.vendorId)) {
        result.scale.found = true
        result.scale.name = d.product || `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
      }
      if (SCANNER_VIDS.includes(d.vendorId)) {
        result.scanner.found = true
        result.scanner.name = d.product || `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
      }
      // Only match physical USB printers (not virtual print queues)
      const name = (d.product || '').toLowerCase()
      if (!result.printer.found && d.deviceClass === 'USB' && (name.includes('receipt') || name.includes('pos') || name.includes('thermal'))) {
        result.printer.found = true
        result.printer.name = d.product || 'Detected printer'
        result.drawer.found = true
      }
    }

    // Check if our specific receipt printer queue exists (configured printer only)
    if (!result.printer.found) {
      try {
        const check = hwExec(`powershell -NoProfile -Command "Get-Printer -Name '${RECEIPT_PRINTER_NAME}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name"`, { timeout: 10000, encoding: 'utf-8' })
        if (check.trim()) {
          result.printer.found = true
          result.printer.name = 'Epson TM-T82II (USB003)'
          result.drawer.found = true
        }
      } catch (_) {}
    }

    return result
  })

  // ── LAN Sync ────────────────────────────────────────────────────────────────

  ipcMain.handle('lan:getStatus', () => lanSync.getStatus())

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
