/**
 * Import products.json into the Crisp POS SQLite database.
 * Uses sql.js (same as the app) so it works without better-sqlite3.
 *
 * Usage: node _import_products.js
 */

const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')

const DB_PATH = path.join(
  process.env.APPDATA || path.join(process.env.HOME, '.config'),
  'crisp-pos', 'crisp-pos.sqlite'
)
const JSON_PATH = path.join(__dirname, 'products.json')

async function main () {
  if (!fs.existsSync(JSON_PATH)) {
    console.error('products.json not found at', JSON_PATH)
    process.exit(1)
  }

  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()

  let db
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buf)
    console.log('Opened existing database:', DB_PATH)
  } else {
    db = new SQL.Database()
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8')
    for (const stmt of schema.split(';').filter(s => s.trim())) {
      try { db.run(stmt) } catch (_) {}
    }
    console.log('Created new database')
  }

  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))

  let catCount = 0
  let prodCount = 0
  let skipped = 0

  // Get max sort_order for categories
  const maxOrder = db.exec("SELECT COALESCE(MAX(sort_order), 0) FROM categories")
  let catOrder = maxOrder.length ? maxOrder[0].values[0][0] : 0

  for (const [category, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue

    // Check if category already exists
    const existing = db.exec("SELECT id FROM categories WHERE name = ?", [category])
    let catId
    if (existing.length && existing[0].values.length) {
      catId = existing[0].values[0][0]
      console.log(`  Category "${category}" already exists (${items.length} products)`)
    } else {
      catId = uuid()
      catOrder++
      db.run(
        "INSERT INTO categories (id, name, sort_order, active, updated_at) VALUES (?, ?, ?, 1, datetime('now'))",
        [catId, category, catOrder]
      )
      catCount++
      console.log(`  Created category "${category}" (${items.length} products)`)
    }

    for (const item of items) {
      if (!item.name || !item.price) continue
      const barcode = item.barcode || null
      const plu = barcode && /^\d{3,6}$/.test(barcode) ? barcode : null

      // Check if product already exists by barcode
      if (barcode) {
        const dup = db.exec("SELECT id FROM products WHERE barcode = ?", [barcode])
        if (dup.length && dup[0].values.length) {
          skipped++
          continue
        }
      }

      // Detect unit from name
      let unit = 'each'
      const nameLower = item.name.toLowerCase()
      if (nameLower.includes(' kg') || nameLower.includes('per kg') || nameLower.endsWith('kg')) {
        unit = 'kg'
      } else if (nameLower.includes('100g') || nameLower.includes('per 100g')) {
        unit = '100g'
      }

      const id = uuid()
      db.run(
        "INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, unit, tax_rate, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0.10, 1, datetime('now'))",
        [id, barcode, plu, item.name, catId, item.price, unit]
      )
      prodCount++
    }
  }

  // Save to disk
  const outData = db.export()
  const buffer = Buffer.from(outData)
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
  fs.writeFileSync(DB_PATH, buffer)

  console.log(`\nImport complete:`)
  console.log(`  New categories: ${catCount}`)
  console.log(`  New products:   ${prodCount}`)
  console.log(`  Skipped (dupe): ${skipped}`)
  console.log(`  Database:       ${DB_PATH}`)

  db.close()
}

main().catch(e => { console.error(e); process.exit(1) })
