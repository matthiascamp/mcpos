/**
 * Profit Track → Crisp POS Migration
 *
 * Reads the products.json from your website (or local file) and loads
 * everything into the local SQLite database.
 *
 * Usage:
 *   node migrate-from-pt.js [path-to-products.json]
 *
 * If no path given, reads from the GitHub Pages site:
 *   https://matthiascamp.github.io/crisponcreek/products.json
 */

const Database = require('better-sqlite3')
const { v4: uuid } = require('uuid')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const DB_PATH = process.argv[3] || path.join(
  process.env.APPDATA || process.env.HOME,
  '.config', 'crisp-pos', 'crisp-pos.sqlite'
)

async function main() {
  let raw

  const source = process.argv[2]
  if (source && fs.existsSync(source)) {
    raw = fs.readFileSync(source, 'utf-8')
    console.log(`Reading from file: ${source}`)
  } else {
    console.log('Fetching from website...')
    const resp = await fetch('https://matthiascamp.github.io/crisponcreek/products.json')
    raw = await resp.text()
    console.log(`Fetched ${raw.length} bytes`)
  }

  const data = JSON.parse(raw)

  const schemaPath = path.join(__dirname, 'db', 'schema.sql')
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

  const db = new Database(DB_PATH)
  db.exec(fs.readFileSync(schemaPath, 'utf-8'))

  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, sort_order, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `)
  const insertProd = db.prepare(`
    INSERT OR REPLACE INTO products (id, barcode, name, category_id, price, unit, active, updated_at)
    VALUES (?, ?, ?, ?, ?, 'each', 1, datetime('now'))
  `)

  const migrate = db.transaction(() => {
    let catOrder = 0
    let totalProducts = 0
    const catMap = {}

    for (const [category, items] of Object.entries(data)) {
      if (!Array.isArray(items)) continue

      const catId = uuid()
      catMap[category] = catId
      insertCat.run(catId, category, catOrder++)

      for (const item of items) {
        if (!item.name || !item.price) continue
        const id = uuid()
        insertProd.run(id, item.barcode || null, item.name, catId, item.price)
        totalProducts++
      }
    }

    return { categories: Object.keys(catMap).length, products: totalProducts }
  })

  const result = migrate()
  console.log(`\nMigration complete:`)
  console.log(`  Categories: ${result.categories}`)
  console.log(`  Products:   ${result.products}`)
  console.log(`  Database:   ${DB_PATH}`)

  db.close()
}

main().catch(console.error)
