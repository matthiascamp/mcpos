#!/usr/bin/env node
/**
 * Full first-launch setup: products, keyboard, prices, deals.
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
    const schemaPath = path.join(__dirname, 'db', 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8')
      for (const stmt of schema.split(';').filter(s => s.trim())) {
        try { db.run(stmt) } catch (_) {}
      }
      console.log('Applied schema.sql')
    }
  }

  const get = (sql, params) => {
    const stmt = db.prepare(sql)
    if (params) stmt.bind(params)
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return row
  }
  const getAll = (sql, params) => {
    const stmt = db.prepare(sql)
    if (params) stmt.bind(params)
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    return rows
  }

  // ── 1. Import products.json ──────────────────────────────────────
  const prodPath = path.join(__dirname, 'products.json')
  if (fs.existsSync(prodPath)) {
    const data = JSON.parse(fs.readFileSync(prodPath, 'utf-8'))
    let imported = 0, skipped = 0

    for (const [catName, items] of Object.entries(data)) {
      let catRow = get("SELECT id FROM categories WHERE name = ?", [catName])
      if (!catRow) {
        const catId = uuid()
        db.run("INSERT INTO categories (id, name, sort_order, colour, active, updated_at) VALUES (?, ?, 100, '#4fbd77', 1, datetime('now'))", [catId, catName])
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
        db.run("INSERT INTO products (id, barcode, plu, name, category_id, price, unit, tax_rate, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0.10, 1, datetime('now'))",
          [uuid(), barcode, plu, p.name, catRow.id, p.price, unit])
        imported++
      }
    }
    console.log(`Products: imported ${imported}, skipped ${skipped} (barcode already exists)`)
  } else {
    console.log('No products.json found, skipping product import')
  }

  // ── 2. Import keyboard-layout.json ───────────────────────────────
  const kbPath = path.join(__dirname, 'keyboard-layout.json')
  if (fs.existsSync(kbPath)) {
    const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'))
    db.run("PRAGMA foreign_keys = OFF")
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
      db.run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, product_id, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
        [btn.id || uuid(), btn.label, btn.type, btn.price || 0, btn.image || null, btn.color || '#fff',
         btn.bg_color || '#1a3d2a', btn.parent_id || null, btn.category_filter || null,
         btn.alpha_range || null, btn.sort_order || 0, btn.position || 'grid',
         btn.page || 1, btn.grid_row || 0, btn.grid_col || 0, btn.col_span || 1,
         btn.row_span || 1, btn.active !== undefined ? btn.active : 1, btn.product_id || null])
      btnCount++
    }
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
    db.run("PRAGMA foreign_keys = ON")
    console.log(`Keyboard: imported ${btnCount} buttons, ${(data.pages || []).length} pages, ${prodRestored} linked products`)
  } else {
    console.log('No keyboard-layout.json found, skipping keyboard import')
  }

  // ── 3. New product categories ────────────────────────────────────
  db.run("INSERT OR IGNORE INTO categories (id, name, sort_order, colour, active) VALUES ('cat-berries', 'Berries', 130, '#8b2252', 1)")
  db.run("INSERT OR IGNORE INTO categories (id, name, sort_order, colour, active) VALUES ('cat-bucket-specials', 'Bucket Specials', 140, '#d97706', 1)")
  db.run("INSERT OR IGNORE INTO categories (id, name, sort_order, colour, active) VALUES ('cat-tropical', 'Tropical', 131, '#e87830', 1)")

  // ── 4. New products not in products.json ─────────────────────────
  const newProducts = [
    ['Snacking Carrots', 'cat-veg', 3.99, 'each', '20200'],
    ['Baby Cucumbers', 'cat-veg', 3.99, 'each', '20201'],
    ['Lebanese Eggplant', 'cat-veg', 9.99, 'kg', '20202'],
    ['Broccolini', 'cat-veg', 3.99, 'each', '20203'],
    ['Thai Eggplant', 'cat-veg', 9.89, 'kg', '20204'],
    ['Bitter Gourd', 'cat-veg', 5.99, 'kg', '20205'],
    ['Jap Cut', 'cat-pumpkins', 2.69, 'kg', '20206'],
    ['Butternut Cut', 'cat-pumpkins', 2.99, 'kg', '20207'],
    ['Red Onion Bag', 'cat-onions', 2.99, 'each', '20208'],
    ['Pickling Onion Bag', 'cat-onions', 3.49, 'each', '20209'],
    ['Garlic Bag', 'cat-garlic', 5.99, 'each', '20210'],
    ['Sweet Potato', 'cat-sweet-potatoes', 3.99, 'kg', '20211'],
    ['White Sweet Potato', 'cat-sweet-potatoes', 6.99, 'kg', '20212'],
    ['Dutch Cream', 'cat-potatoes', 7.99, 'kg', '20213'],
    ['Washed Potato Bag', 'cat-potatoes', 2.89, 'each', '20214'],
    ['Sugarloaf Cabbage', 'cat-cabbage', 2.99, 'each', '20215'],
    ['Fancy Lettuce', 'cat-lettuces', 3.99, 'each', '20216'],
    ['Twin Cos', 'cat-lettuces', 3.99, 'each', '20217'],
    ['Lebanese Cucumber', 'cat-veg', 5.89, 'kg', '20218'],
    ['Kanzi', 'cat-apples', 7.99, 'kg', '20219'],
    ['Sassy', 'cat-apples', 6.49, 'kg', '20220'],
    ['Cara Cara', 'cat-oranges', 5.89, 'kg', '20221'],
    ['Missile', 'cat-apples', 4.99, 'kg', '20222'],
    ['Blackberries', 'cat-berries', 2.99, 'each', '20223'],
    ['Blueberries', 'cat-berries', 8.99, 'each', '20224'],
    ['Farm Strawberries', 'cat-berries', 5.89, 'each', '20225'],
    ['Raspberries', 'cat-berries', 5.99, 'each', '20226'],
    ['Eggplant Bucket', 'cat-bucket-specials', 2.89, 'kg', '20230'],
    ['Granny Smith Bucket', 'cat-bucket-specials', 1.99, 'kg', '20231'],
    ['Leb Cucumber Bucket', 'cat-bucket-specials', 2.89, 'kg', '20232'],
    ['Bananas Bucket', 'cat-bucket-specials', 1.99, 'kg', '20233'],
    ['Limes Bucket', 'cat-bucket-specials', 2.99, 'kg', '20234'],
    ['Lemons Bucket', 'cat-bucket-specials', 1.99, 'kg', '20235'],
    ['Round Tomatoes Bucket', 'cat-bucket-specials', 1.49, 'kg', '20236'],
    ['Imperial Bucket', 'cat-bucket-specials', 1.99, 'kg', '20237'],
    ['Pink Lady Bucket', 'cat-bucket-specials', 2.89, 'kg', '20238'],
    ['Jap Pumpkin Bucket', 'cat-bucket-specials', 1.99, 'kg', '20239'],
    ['Cauliflower Outside', 'cat-bucket-specials', 1.99, 'each', '20240'],
    ['Sweet Potato Outside', 'cat-bucket-specials', 1.49, 'kg', '20241'],
    ['Red Onion 10kg', 'cat-bucket-specials', 18.00, 'each', '20242'],
    ['Brown Onion 10kg', 'cat-bucket-specials', 12.90, 'each', '20243'],
    ['Red Capsicum Bag', 'cat-bucket-specials', 2.49, 'kg', '20244'],
    ['Twin Cos Bag', 'cat-bucket-specials', 0.79, 'each', '20245'],
    ['Red Paw Paw Cut', 'cat-tropical', 6.49, 'kg', '20246'],
    ['Watermelon Cut', 'cat-melons', 1.49, 'kg', '20247'],
  ]
  let addCount = 0
  for (const [name, catId, price, unit, plu] of newProducts) {
    const exists = get("SELECT id FROM products WHERE name = ? AND active = 1", [name])
    if (!exists) {
      db.run("INSERT INTO products (id, name, category_id, price, unit, tax_rate, plu, active, updated_at) VALUES (?,?,?,?,?,0,?,1,datetime('now'))",
        [uuid(), name, catId, price, unit, plu])
      addCount++
    }
  }
  console.log(`New products: added ${addCount}`)

  // ── 5. Price updates (LIKE-based matching against actual DB names) ──
  // [LIKE pattern, price, unit, optional: limit to 1 match]
  const priceUpdates = [
    // Vegetables / Greens
    ['LARGE HERB BUNCH', 3.89, 'each'],
    ['ASIAN VEG%BUNCH', 2.99, 'each'],
    ['ESHALLOT%BUNCH', 1.99, 'each'],
    ['LEEK BUNCH', 3.49, 'each'],
    ['SILVERBEET%BUNCH', 3.99, 'each'],
    ['CELERY', 2.99, 'each', true],  // exact — not "CELERY 1/2 BUNCH"
    ['CABBAGE RED EA', 3.99, 'each'],
    ['CABBAGE DRUM HEAD EA', 3.99, 'each'],
    ['PUMPKIN JAP KG', 2.49, 'kg'],
    ['PUMPKIN JAP CUT KG', 2.69, 'kg'],
    ['PUMPKIN BUTTERNUT KG', 2.49, 'kg'],
    ['PUMPKIN BUTTERNUT CUT KG', 2.99, 'kg'],
    ['1KG CARROT BAG', 2.69, 'each'],
    ['CARROTS BAG%1 KG', 2.69, 'each'],
    ['CARROTS LOOSE KG', 3.69, 'kg'],
    ['BEANS FRESH', 12.99, 'kg'],
    ['CAPSICUM RED KG', 5.99, 'kg'],
    ['CAPSICUM GREEN KG', 7.99, 'kg'],
    ['ZUCCHINI LGE KG', 6.99, 'kg'],
    ['MUSHROOM SWISS BROWN KG', 16.90, 'kg'],
    ['MUSHROOM FLAT KG', 14.90, 'kg'],
    ['CUCUMBER BABY%', 3.99, 'each'],
    ['ANISEED/FENNEL EACH', 2.69, 'each'],
    ['CORN EACH', 1.49, 'each'],
    ['EGGPLANT KG', 5.99, 'kg'],
    ['EGGPLANT BABY KG', 9.99, 'kg'],
    ['EGGPLANT THAI KG', 9.89, 'kg'],
    ['SNOW PEAS KG', 24.99, 'kg'],
    ['ASPARAGUS BUNCH', 4.99, 'each'],
    ['BRUSSEL SPROUTS KG', 12.99, 'kg'],
    ['BROCCOLINI BUNCH', 3.99, 'each'],
    ['BROCCOLI KG', 4.59, 'kg'],
    ['CHOKOS KG', 6.99, 'kg'],
    ['PARSNIP KG', 12.99, 'kg'],
    ['SWEDES KG', 5.89, 'kg'],
    ['TURNIP WHITE KG', 5.89, 'kg'],
    // Potatoes / Onions / Garlic
    ['POTATOES BRUSHED 3KG', 5.99, 'each'],
    ['ONIONS BROWN 1%KG BAG', 3.99, 'each'],
    ['ONIONS PICKLING BAG 1KG', 3.49, 'each'],
    ['FRESH GARLIC BAG%', 5.99, 'each'],
    ['ONIONS BROWN KG', 2.99, 'kg'],
    ['ONIONS WHITE KG', 7.99, 'kg'],
    ['POTATOES BRUSHED%KG', 2.99, 'kg'],
    ['POTATOES CHATS 1KG BAG', 4.89, 'each'],
    ['POTATOES WASHED KG', 5.59, 'kg'],
    ['POTATOES DUTCH KG', 7.99, 'kg'],
    ['BEETROOT KG', 4.99, 'kg'],
    // Salad / Lettuce / Tomatoes / Cucumbers
    ['CAULIFLOWER EA%', 1.99, 'each'],
    ['KALE BUNCH', 3.99, 'each'],
    ['LETTUCE ICEBERG EA', 1.99, 'each'],
    ['LETTUCE FANCY EA', 3.99, 'each'],
    ['LETTUCE COS EACH', 4.99, 'each'],
    ['TOMATOES TRUSS VINE%KG', 7.99, 'kg'],
    ['CUCUMBER LEBANESE%KG', 5.89, 'kg'],
    ['TOMATOES ROMA%KG', 7.89, 'kg'],
    ['CUCUMBER CONTINENTAL EA', 1.99, 'each'],
    // Apples / Citrus / Pears / Avocado
    ['NAVEL ORANGE KG', 6.99, 'kg'],
    ['APPLE PINK LADY%KG', 8.99, 'kg', true],  // large only, not small
    ['APPLE GRANNY SMITH LGE KG', 5.99, 'kg'],
    ['APPLE ROYAL GALA LGE KG', 6.89, 'kg'],
    ['APPLE RED DELICIOUS LGE KG', 5.89, 'kg'],
    ['APPLES KANZIL KG', 7.99, 'kg'],
    ['JAZZ%APPLE%KG', 6.89, 'kg'],
    ['PEARS PACKHAM KG', 5.89, 'kg'],
    ['PEARS WILLIAM KG', 5.89, 'kg'],
    ['IMPERIAL MANDARINS%KG', 4.89, 'kg'],
    ['MANDARINES AFROURER%KG', 4.99, 'kg'],
    ['PEAR NASHI EA%', 1.99, 'each'],
    ['GRAPEFRUIT RUBY RED KG', 3.99, 'kg'],
    ['LEMONS BAGGED NET KG', 1.99, 'each'],
    ['ORANGES VALENCIA KG', 3.89, 'kg'],
    ['AVOCADO LARGE HASS', 2.99, 'each'],
    ['AVOCADO IN NET BAG', 1.49, 'each'],
    ['CUSTARD APPLES KG', 12.99, 'kg'],
    ['PERSIMMON%KG', 12.99, 'kg'],
    ['POMEGRANATE EA', 4.89, 'each'],
    ['LIMES EACH', 1.99, 'each'],
    ['PASSIONFRUIT EA%', 1.99, 'each'],
    ['KIWI FRUIT KG', 14.89, 'kg'],
    ['KIWI FRUIT GOLD EACH', 2.89, 'each'],
    ['BANANAS LADYFINGER KG', 6.99, 'kg'],
    ['3 KG ORANGES', 6.99, 'each'],
    ['BANANAS CAVENDISH%KG', 4.99, 'kg'],
    // Melons / Tropical
    ['PINEAPPLE%EXTRA LARGE', 7.99, 'each'],
    ['PINEAPPLE SMOOTH SMALL', 3.99, 'each'],
    ['ROCKMELON EA', 5.99, 'each'],
    ['RED PAPAYA KG', 5.99, 'kg'],
    ['%DRINKING COCONUT%', 4.49, 'each'],
    ['DRAGON FRUIT KG', 15.99, 'kg'],
    // Berries / Grapes
    ['GRAPES RED SEEDLESS KG', 5.99, 'kg'],
    ['GRAPES BLACK SEEDLESS KG', 5.99, 'kg'],
    // Bucket / Outside
    ['SEEDLESS WATERMELON WHOLE', 0.99, 'kg'],
    ['SEEDLESS WATERMELON CUT KG', 1.49, 'kg'],
    ['JAP PUMPKIN OUTSIDE%KG', 1.99, 'kg'],
    ['SPECIAL SWEET POTATOES', 1.49, 'kg'],
  ]

  let updCount = 0
  for (const [pattern, price, unit, firstOnly] of priceUpdates) {
    if (firstOnly) {
      const row = get("SELECT id FROM products WHERE name = ? AND active = 1", [pattern])
      if (row) {
        db.run("UPDATE products SET price = ?, unit = ?, updated_at = datetime('now') WHERE id = ?", [price, unit, row.id])
        updCount++
      }
    } else {
      const likePattern = pattern.includes('%') ? pattern : pattern
      const rows = getAll("SELECT id FROM products WHERE name LIKE ? AND active = 1", [likePattern])
      for (const row of rows) {
        db.run("UPDATE products SET price = ?, unit = ?, updated_at = datetime('now') WHERE id = ?", [price, unit, row.id])
        updCount++
      }
    }
  }
  console.log(`Prices: updated ${updCount} products`)

  // ── 6. Deals ─────────────────────────────────────────────────────
  // [dealId, dealName, qty, price, productNameLIKE]
  const deals = [
    ['deal-carrot-bags-2for5',  'Carrot Bags 2 for $5',      2, 5, '1KG CARROT BAG'],
    ['deal-fennel-2for4',       'Fennel 2 for $4',           2, 4, 'ANISEED/FENNEL EACH'],
    ['deal-corn-2for2',         'Sweet Corn 2 for $2',       2, 2, 'CORN EACH'],
    ['deal-avocado-2for5',      'Hass Avocado 2 for $5',     2, 5, 'AVOCADO LARGE HASS'],
    ['deal-limes-3for5',        'Limes 3 for $5',            3, 5, 'LIMES EACH'],
    ['deal-kiwi-gold-2for5',    'Gold Kiwi Fruit 2 for $5',  2, 5, 'KIWI FRUIT GOLD EACH'],
    ['deal-blackberries-2for5', 'Blackberries 2 for $5',     2, 5, '%BLACKBERRIES%'],
    ['deal-twincos-2for1',      'Twin Cos Bags 2 for $1',    2, 1, 'Twin Cos Bag'],
  ]

  let dealCount = 0
  for (const [id, name, qty, price, prodPattern] of deals) {
    db.run("INSERT OR REPLACE INTO deals (id, name, type, config, active) VALUES (?, ?, 'multi_buy', ?, 1)",
      [id, name, JSON.stringify({ qty, price })])

    const isLike = prodPattern.includes('%')
    const pRow = isLike
      ? get("SELECT id FROM products WHERE name LIKE ? AND active = 1", [prodPattern])
      : get("SELECT id FROM products WHERE name = ? AND active = 1", [prodPattern])
    if (pRow) {
      db.run("DELETE FROM deal_products WHERE deal_id = ?", [id])
      db.run("INSERT INTO deal_products (deal_id, product_id, role) VALUES (?, ?, 'trigger')", [id, pRow.id])
      dealCount++
    } else {
      console.log(`  Warning: deal product "${prodPattern}" not found for ${name}`)
    }
  }
  console.log(`Deals: created ${deals.length} deals, linked ${dealCount} products`)

  // ── 7. Convert broccoli/cabbage/chillies/tomatoes to section buttons ─
  const sectionConversions = [
    ['pg4-broccoli', 'Broccoli'],
    ['pg4-cabbage', 'Cabbage'],
    ['pg4-chillies', 'Chillies'],
    ['pg5-tomatoes', 'Tomatoes'],
  ]
  let secCount = 0
  for (const [btnId, catName] of sectionConversions) {
    const catRow = get("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)", [catName])
    if (catRow) {
      db.run("UPDATE keyboard_buttons SET type = 'section', category_filter = ? WHERE id = ?", [catRow.id, btnId])
      secCount++
    }
  }
  console.log(`Section buttons: converted ${secCount}`)

  // ── 8. Mark all migrations done ──────────────────────────────────
  const migrationFlags = [
    'migration_import_products_v1', 'migration_import_keyboard_v1',
    'migration_prices_may2026_v1', 'deals_v1',
    'migration_gst_rates_v1', 'migration_repair_labels_v1', 'migration_fv_subcats_v1',
    'migration_link_kb_products_v1', 'migration_btn_colors_v1', 'migration_local_images_v1',
    'migration_section_buttons_v1',
  ]
  for (const key of migrationFlags) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, '1')", [key])
  }
  console.log(`Marked ${migrationFlags.length} migrations as done`)

  // ── Save to disk ─────────────────────────────────────────────────
  const out = Buffer.from(db.export())
  fs.writeFileSync(DB_PATH, out)
  db.close()
  console.log(`\nDatabase saved to ${DB_PATH}`)
  console.log('Done! Start the app with: npm start')
}

main().catch(e => { console.error('Import failed:', e); process.exit(1) })
