#!/usr/bin/env node
/**
 * Import products.json and keyboard-layout.json into the live SQLite database.
 * Run once on a fresh machine: npm run import
 */
const path = require('path')
const fs = require('fs')
const { v4: uuid } = require('uuid')

const DB_DIR = path.join(process.env.APPDATA || process.env.HOME, 'crisp-pos')
const DB_PATH = path.join(DB_DIR, 'crisp-pos.sqlite')

async function main () {
  const initSqlJs = require('sql.js')
  const wasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist')
  const SQL = await initSqlJs({ locateFile: f => path.join(wasmPath, f) })

  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

  let db
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
    console.log('Opened existing database:', DB_PATH)
  } else {
    db = new SQL.Database()
    console.log('Created new database:', DB_PATH)
    // Run schema to create tables
    const schemaPath = path.join(__dirname, 'db', 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      for (const stmt of schema.split(';').filter(s => s.trim())) {
        try { db.run(stmt) } catch (_) {}
      }
      console.log('Applied schema.sql')
    }
  }

  // Helper
  const get = (sql, params) => {
    const stmt = db.prepare(sql)
    if (params) stmt.bind(params)
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return row
  }

  // ── Import products.json ─────────────────────────────────────────
  const prodPath = path.join(__dirname, 'products.json')
  if (fs.existsSync(prodPath)) {
    const data = JSON.parse(fs.readFileSync(prodPath, 'utf-8'))
    let imported = 0, skipped = 0

    for (const [catName, items] of Object.entries(data)) {
      let catRow = get("SELECT id FROM categories WHERE name = ?", [catName])
      if (!catRow) {
        const catId = uuid()
        db.run("INSERT INTO categories (id, name, sort_order, colour, active, updated_at) VALUES (?, ?, 100, '#4fbd77', 1, datetime('now'))",
          [catId, catName])
        catRow = { id: catId }
      }

      for (const p of items) {
        const barcode = p.barcode || null
        if (barcode) {
          const existing = get("SELECT id FROM products WHERE barcode = ?", [barcode])
          if (existing) { skipped++; continue }
        }
        const plu = barcode && /^\d{3,6}$/.test(barcode) ? barcode : null
        const unit = p.unit || (/\bKG\b/i.test(p.name || '') ? 'kg' : 'each')
        const id = uuid()
        db.run("INSERT INTO products (id, barcode, plu, name, category_id, price, unit, tax_rate, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0.10, 1, datetime('now'))",
          [id, barcode, plu, p.name, catRow.id, p.price, unit])
        imported++
      }
    }
    console.log(`Products: imported ${imported}, skipped ${skipped} (barcode already exists)`)
  } else {
    console.log('No products.json found, skipping product import')
  }

  // ── Import keyboard-layout.json ──────────────────────────────────
  const kbPath = path.join(__dirname, 'keyboard-layout.json')
  if (fs.existsSync(kbPath)) {
    const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'))

    db.run("DELETE FROM keyboard_buttons")
    db.run("DELETE FROM keyboard_pages")

    if (data.pages && Array.isArray(data.pages)) {
      for (const pg of data.pages) {
        db.run("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?, ?, ?, ?)",
          [pg.page, pg.name || 'Untitled', pg.cols || 13, pg.rows || 7])
      }
    }

    let btnCount = 0
    for (const btn of (data.buttons || [])) {
      const id = btn.id || uuid()
      db.run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, product_id, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
        [id, btn.label, btn.type, btn.price || 0, btn.image || null, btn.color || '#fff',
         btn.bg_color || '#1a3d2a', btn.parent_id || null, btn.category_filter || null,
         btn.alpha_range || null, btn.sort_order || 0, btn.position || 'grid',
         btn.page || 1, btn.grid_row || 0, btn.grid_col || 0, btn.col_span || 1,
         btn.row_span || 1, btn.active !== undefined ? btn.active : 1,
         btn.product_id || null])
      btnCount++
    }

    // Restore linked products
    let prodRestored = 0
    if (data.products && Array.isArray(data.products)) {
      for (const p of data.products) {
        if (!p.id) continue
        db.run(`INSERT OR IGNORE INTO products (id, name, barcode, plu, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
          [p.id, p.name, p.barcode || null, p.plu || null, p.category_id || null,
           p.price || 0, p.cost_price || 0, p.unit || 'each', p.tax_rate ?? 0.1,
           p.track_stock || 0, p.stock_qty || 0, p.active !== undefined ? p.active : 1])
        prodRestored++
      }
    }

    // Mark migration done so the app doesn't re-run it
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_import_keyboard_v1', '1')")
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_import_products_v1', '1')")

    console.log(`Keyboard: imported ${btnCount} buttons, ${(data.pages || []).length} pages, ${prodRestored} linked products`)
  } else {
    console.log('No keyboard-layout.json found, skipping keyboard import')
  }

  // ── Save to disk ─────────────────────────────────────────────────
  const out = Buffer.from(db.export())
  fs.writeFileSync(DB_PATH, out)
  db.close()
  console.log(`\nDatabase saved to ${DB_PATH}`)
  console.log('Done! Start the app with: npm start')
}

main().catch(e => { console.error('Import failed:', e); process.exit(1) })
