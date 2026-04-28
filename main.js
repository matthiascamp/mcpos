const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require('uuid')

let mainWindow
let db
let saveTimer = null

const DB_PATH = path.join(app.getPath('userData'), 'crisp-pos.sqlite')
const SCHEMA_PATH = path.join(__dirname, 'db', 'schema.sql')

async function initDatabase() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
  } else {
    db = new SQL.Database()
  }

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
  const statements = schema.split(';').filter(s => s.trim())
  for (const stmt of statements) {
    try { db.run(stmt) } catch (_) {}
  }

  // Migrations for existing DBs
  const migrations = [
    "ALTER TABLE keyboard_buttons ADD COLUMN page INTEGER DEFAULT 1",
    "ALTER TABLE keyboard_buttons ADD COLUMN grid_row INTEGER DEFAULT 0",
    "ALTER TABLE keyboard_buttons ADD COLUMN grid_col INTEGER DEFAULT 0",
    "ALTER TABLE keyboard_buttons ADD COLUMN col_span INTEGER DEFAULT 1",
    "ALTER TABLE keyboard_buttons ADD COLUMN row_span INTEGER DEFAULT 1",
  ]
  for (const m of migrations) {
    try { db.run(m) } catch (_) {}
  }

  saveDB()
}

function saveDB() {
  if (!db) return
  const data = db.export()
  const buf = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buf)
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
    console.error('dbAll error:', e.message, sql)
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
    console.error('dbRun error:', e.message, sql)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: !process.argv.includes('--dev'),
    kiosk: !process.argv.includes('--dev'),
    autoHideMenuBar: true,
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
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()
  setupIPC()
})

app.on('window-all-closed', () => {
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

  // ── Products ────────���───────────────────────────��─────────────────────────

  ipcMain.handle('db:products:search', (_e, query) => {
    const q = `%${query}%`
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
      LIMIT 50
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
    dbRun(`
      INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, image_url, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, datetime('now'))
    `, [id, product.barcode || null, product.plu || null, product.name, product.category_id || null,
        product.price, product.cost_price || 0, product.unit || 'each',
        product.tax_rate ?? 0.10, product.track_stock ? 1 : 0,
        product.stock_qty || 0, product.active !== false ? 1 : 0, product.image_url || null])

    queueSync('products', id, product.id ? 'update' : 'insert')
    return { id }
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
    return { id }
  })

  ipcMain.handle('db:deals:delete', (_e, id) => {
    dbRun("DELETE FROM deal_products WHERE deal_id = ?1", [id])
    dbRun("DELETE FROM deals WHERE id = ?1", [id])
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
    return true
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
    return { id }
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

  ipcMain.handle('db:staff:upsert', (_e, s) => {
    const id = s.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO staff (id, name, pin, role, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
    `, [id, s.name, s.pin, s.role || 'cashier', s.active !== false ? 1 : 0])
    queueSync('staff', id, s.id ? 'update' : 'insert')
    return { id }
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
    return true
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
    return dbAll("SELECT * FROM keyboard_buttons WHERE active = 1 ORDER BY page, sort_order")
  })

  ipcMain.handle('db:keyboard:getByPage', (_e, page) => {
    return dbAll("SELECT * FROM keyboard_buttons WHERE active = 1 AND page = ?1 ORDER BY grid_row, grid_col", [page])
  })

  ipcMain.handle('db:keyboard:getPages', () => {
    return dbAll("SELECT DISTINCT page FROM keyboard_buttons WHERE active = 1 ORDER BY page")
  })

  ipcMain.handle('db:keyboard:upsert', (_e, btn) => {
    const id = btn.id || uuid()
    dbRun(`
      INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, datetime('now'))
    `, [id, btn.label, btn.type, btn.price || 0, btn.image || null, btn.color || '#fff',
        btn.bg_color || '#1B4332', btn.parent_id || null, btn.category_filter || null,
        btn.alpha_range || null, btn.sort_order || 0, btn.position || 'grid',
        btn.page || 1, btn.grid_row || 0, btn.grid_col || 0,
        btn.col_span || 1, btn.row_span || 1,
        btn.active !== false ? 1 : 0])
    return { id }
  })

  ipcMain.handle('db:keyboard:delete', (_e, id) => {
    dbRun("DELETE FROM keyboard_buttons WHERE id = ?1", [id])
    dbRun("DELETE FROM keyboard_buttons WHERE parent_id = ?1", [id])
    return true
  })

  ipcMain.handle('db:keyboard:deletePage', (_e, page) => {
    dbRun("DELETE FROM keyboard_buttons WHERE page = ?1", [page])
    return true
  })

  ipcMain.handle('db:keyboard:getAllIncludingInactive', () => {
    return dbAll("SELECT * FROM keyboard_buttons ORDER BY page, sort_order")
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

  // ── Hardware (printer/drawer — graceful no-op if not available) ────────────

  ipcMain.handle('hardware:printReceipt', async (_e, receiptData) => {
    try {
      const escpos = require('escpos')
      require('escpos-usb')
      const device = new escpos.USB()
      const printer = new escpos.Printer(device)

      return new Promise((resolve) => {
        device.open(() => {
          printer.align('ct').style('b').size(1, 1)
            .text(receiptData.storeName || 'Crisp on Creek')
            .style('normal').size(0, 0)

          if (receiptData.storeAddress) printer.text(receiptData.storeAddress)
          if (receiptData.storePhone) printer.text(`Ph: ${receiptData.storePhone}`)
          if (receiptData.storeAbn) printer.text(`ABN: ${receiptData.storeAbn}`)
          if (receiptData.header) printer.text('').text(receiptData.header)

          printer.text('').align('lt')
            .text(`Date:     ${receiptData.date}`)
            .text(`Register: ${receiptData.registerId || 'LANE01'}`)
            .text(`Txn:      ${receiptData.txnId?.slice(0, 8) || ''}`)
            .text(`Staff:    ${receiptData.staffName || ''}`)
            .text('─'.repeat(42))

          for (const item of receiptData.items) {
            const name = item.name.substring(0, 28)
            const price = item.line_total.toFixed(2).padStart(10)
            printer.text(`${name}${' '.repeat(Math.max(0, 42 - name.length - price.length))}${price}`)
            if (item.qty !== 1) printer.text(`  ${item.qty} x $${item.unit_price.toFixed(2)}`)
            if (item.discount > 0) printer.text(`  Discount: -$${item.discount.toFixed(2)}`)
          }

          printer.text('─'.repeat(42)).align('rt')
          if (receiptData.discount > 0) printer.text(`Discount: -$${receiptData.discount.toFixed(2)}`)
          printer.style('b').size(1, 1)
            .text(`TOTAL: $${receiptData.total.toFixed(2)}`)
            .style('normal').size(0, 0)
            .text(`Total includes GST of $${receiptData.tax.toFixed(2)}`)
            .text('')

          for (const pay of receiptData.payments) {
            printer.text(`${pay.method.toUpperCase()}: $${pay.amount.toFixed(2)}`)
          }
          if (receiptData.change > 0) printer.text(`Change: $${receiptData.change.toFixed(2)}`)

          printer.text('').align('ct')
            .text(receiptData.footer || 'Thank you for shopping local!')
            .text('').cut().close()
          resolve(true)
        })
      })
    } catch (err) {
      console.log('Printer not available:', err.message)
      return { error: err.message }
    }
  })

  ipcMain.handle('hardware:openDrawer', async () => {
    try {
      const escpos = require('escpos')
      require('escpos-usb')
      const device = new escpos.USB()
      return new Promise((resolve) => {
        device.open(() => {
          new escpos.Printer(device).cashdraw(2).close()
          resolve(true)
        })
      })
    } catch (err) {
      console.log('Drawer not available:', err.message)
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

    // Known vendor IDs
    const PRINTER_VIDS = [0x04b8, 0x0519, 0x0416, 0x0dd4, 0x20d1, 0x0fe6, 0x1fc9, 0x0483]
    const SCALE_VIDS = [0x0b67, 0x0922, 0x1446, 0x0eb8]
    const SCANNER_VIDS = [0x05e0, 0x05f9, 0x0c2e, 0x1eab, 0x2dd6, 0x1a86]

    try {
      const usb = require('usb')
      const devices = usb.getDeviceList()

      result.usbDevices = devices.map(d => {
        let manufacturer = '', product = ''
        try {
          const desc = d.deviceDescriptor
          return {
            vendorId: desc.idVendor,
            productId: desc.idProduct,
            manufacturer: manufacturer,
            product: product,
            deviceClass: desc.bDeviceClass
          }
        } catch (_) {
          return {
            vendorId: d.deviceDescriptor?.idVendor || 0,
            productId: d.deviceDescriptor?.idProduct || 0,
            manufacturer: '',
            product: '',
            deviceClass: d.deviceDescriptor?.bDeviceClass || 0
          }
        }
      })

      for (const d of result.usbDevices) {
        if (PRINTER_VIDS.includes(d.vendorId)) {
          result.printer.found = true
          result.printer.name = `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
          result.drawer.found = true
        }
        if (SCALE_VIDS.includes(d.vendorId)) {
          result.scale.found = true
          result.scale.name = `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
        }
        if (SCANNER_VIDS.includes(d.vendorId)) {
          result.scanner.found = true
          result.scanner.name = `VID:0x${d.vendorId.toString(16)} PID:0x${d.productId.toString(16)}`
        }
      }
    } catch (e1) {
      // usb module not available, try escpos
      try {
        const escpos = require('escpos')
        require('escpos-usb')
        const device = new escpos.USB()
        if (device) {
          result.printer.found = true
          result.printer.name = 'ESC/POS USB printer'
          result.drawer.found = true
        }
      } catch (e2) {
        result.printer.error = 'No USB library available (install usb or escpos-usb)'
      }
    }

    // Probe serial ports for scale
    try {
      const { SerialPort } = require('serialport')
      const ports = await SerialPort.list()
      result.usbDevices.push(...ports.map(p => ({
        vendorId: parseInt(p.vendorId, 16) || 0,
        productId: parseInt(p.productId, 16) || 0,
        manufacturer: p.manufacturer || 'Serial',
        product: p.path,
        deviceClass: 'Serial'
      })))
      for (const p of ports) {
        const mfr = (p.manufacturer || '').toLowerCase()
        if (mfr.includes('cas') || mfr.includes('mettler') || mfr.includes('ohaus') || mfr.includes('scale')) {
          result.scale.found = true
          result.scale.name = `${p.manufacturer} at ${p.path}`
        }
      }
    } catch (_) {}

    return result
  })
}

// ─── Sync Queue Helper ───────────���────────────────────────────────────────────

function queueSync(table, recordId, action) {
  const row = dbGet(`SELECT * FROM ${table} WHERE id = ?1`, [recordId])
  if (row) {
    dbRun(`INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES (?1, ?2, ?3, ?4)`,
          [table, recordId, action, JSON.stringify(row)])
  }
}
