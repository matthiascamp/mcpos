#!/usr/bin/env node
// setup-keyboard.js — Populate keyboard pages from the Profit Track register layout
// Run ONCE after fresh install: node setup-keyboard.js
// This creates Pages 2-6 (Fruit A-M, Fruit N-Z, Vege A-G, Vege H-Z, Grocery)
// and updates Page 1 bottom nav to link to them.

const path = require('path')
const fs = require('fs')

const DB_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'crisp-pos')
  : path.join(require('os').homedir(), 'Library', 'Application Support', 'crisp-pos')
const DB_PATH = path.join(DB_DIR, 'crisp-pos.sqlite')

async function main() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()

  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at', DB_PATH)
    console.error('Run the app once first (npm start) to create the database, then run this script.')
    process.exit(1)
  }

  const buf = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buf)

  // Helper to run SQL
  const run = (sql, params) => db.run(sql, params)
  const get = (sql, params) => {
    const stmt = db.prepare(sql)
    if (params) stmt.bind(params)
    const row = stmt.step() ? stmt.getAsObject() : null
    stmt.free()
    return row
  }

  console.log('Setting up keyboard pages...\n')

  // ═══════════════════════════════════════════════════════════════
  // Update Page 1 bottom nav: change nav buttons to page_link
  // ═══════════════════════════════════════════════════════════════
  console.log('Updating Page 1 bottom nav to link to keyboard pages...')

  // Update bottom nav buttons to use page_link instead of nav
  // GROCERY -> page 6, FRUIT A-M -> page 2, FRUIT N-Z -> page 3, VEGE A-G -> page 4, VEGE H-Z -> page 5
  const navUpdates = [
    { id: 'btn-grocery',  label: 'GROCERY',   page_link: '6' },
    { id: 'btn-fruit-am', label: 'FRUIT A-M', page_link: '2' },
    { id: 'btn-fruit-nz', label: 'FRUIT N-Z', page_link: '3' },
    { id: 'btn-veg-ag',   label: 'VEGE A-G',  page_link: '4' },
    { id: 'btn-veg-hz',   label: 'VEGE H-Z',  page_link: '5' },
  ]
  for (const u of navUpdates) {
    run(`UPDATE keyboard_buttons SET type = 'page_link', parent_id = ?1 WHERE id = ?2`, [u.page_link, u.id])
  }

  // Also fix the main page missing buttons from the photo
  // Row 2 col 2: GROCERY department (not in current seed, the photo shows it)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
       VALUES ('btn-grocery-dept', 'GROCERY', 'section', 0, '#000', '#d0d0d0', 22, 'grid', 1, 2, 2, 1, 1, 'Grocery', 1)`)

  // Row 3 col 2: FRUIT & VEG (open price)
  run(`UPDATE keyboard_buttons SET grid_row = 3, grid_col = 2 WHERE id = 'btn-fv'`)

  // Row 4 col 1: BREAD (already exists but check position)
  // Row 4 col 2: FRUIT & VEG /KG
  run(`UPDATE keyboard_buttons SET grid_row = 4, grid_col = 1, col_span = 1 WHERE id = 'btn-bread'`)
  run(`UPDATE keyboard_buttons SET grid_row = 4, grid_col = 2 WHERE id = 'btn-fvkg'`)

  // Row 5: BAG, GAS, DELI
  // BAG should be at col 0
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, active)
       VALUES ('btn-bag', 'BAG', 'fixed_price', 0.15, '#000', '#e8e8e8', 27, 'grid', 1, 5, 0, 1, 1, 1)`)
  // Remove old bags button if different id
  run(`DELETE FROM keyboard_buttons WHERE id = 'btn-bags'`)

  // GAS at row 5 col 1
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
       VALUES ('btn-gas-dept', 'GAS', 'section', '#000', '#d0d0d0', 28, 'grid', 1, 5, 1, 1, 1, 'Gas', 1)`)

  // DELI at row 5 col 2
  run(`UPDATE keyboard_buttons SET grid_row = 5, grid_col = 2 WHERE id = 'btn-deli'`)

  // Barcode area (row 4-5, col 6) - numpad display already handles this region
  // Add barcode image area placeholder
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, active)
       VALUES ('np-barcode', '', 'num_display', '#000', '#ffffff', 41, 'grid', 1, 4, 6, 2, 2, 1)`)

  // Fix GAS nav button at bottom row (col 3) — keep it but move NUTS position
  // Photo shows: GROCERY(2col) | NUTS | 91263+LEGGINGS | FRUIT A-M | FRUIT N-Z | VEGE A-G | VEGE H-Z | SUB TOTAL

  console.log('  Page 1 updated.\n')

  // ═══════════════════════════════════════════════════════════════
  // Delete any existing pages 2-6 buttons (clean slate)
  // ═══════════════════════════════════════════════════════════════
  for (let p = 2; p <= 6; p++) {
    run(`DELETE FROM keyboard_buttons WHERE page = ?1`, [p])
  }

  // ═══════════════════════════════════════════════════════════════
  // Page 2: Fruit A-M (8 cols x 6 rows)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating Page 2: Fruit A-M...')
  const fruitAM = [
    // row, col, plu, label, unit
    [0, 0, null,   'APPLES',           'section'], // group
    [0, 1, null,   'APRICOTS',         'section'],
    [0, 2, null,   'AVOCADOS',         'section'],
    [0, 3, '4351', 'BANANAS',          'kg'],
    [0, 4, '4382', 'CHERRIES KG',      'kg'],
    [0, 5, null,   'COCONUT EA',       'each'],
    [1, 0, '4401', 'CUSTARD APPLE KG', 'kg'],
    [1, 1, '5322', 'DRAGON FRUIT KG',  'kg'],
    [1, 2, null,   'FIGS KG',          'kg'],
    [1, 3, '4421', 'GRAPES',           'section'],
    [1, 4, null,   'GRAPEFRUIT KG',    'kg'],
    [2, 0, '4552', 'GUAVA KG',         'kg'],
    [2, 1, null,   'KIWI FRUITS',      'section'],
    [2, 2, null,   'LEMONS',           'section'],
    [2, 3, null,   'LIMES',            'section'],
    [2, 4, '6061', 'LONGAN KG',        'kg'],
    [2, 5, '4671', 'LYCHEE KG',        'kg'],
    [3, 0, null,   'MANDARINS',        'section'],
    [3, 1, null,   'MANGOES',          'section'],
    [3, 2, null,   'MELONS',           'section'],
  ]

  let btnCount = 0
  for (const [row, col, plu, label, unit] of fruitAM) {
    const id = `p2-r${row}c${col}`
    const type = plu ? 'product' : 'open_price'
    run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
         VALUES (?1, ?2, ?3, '#000', '#ffffff', ?4, 'grid', 2, ?5, ?6, 1, 1, ?7, 1)`,
      [id, label, type, btnCount++, row, col, plu])
  }
  // Nav buttons on right side
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p2-back', 'BACK', 'back_home', '#000', '#44dd44', 100, 'grid', 2, 0, 6, 1, 1, NULL, 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p2-vegmenu', 'Vegetable\\nMenu', 'page_link', '#000', '#44dd44', 101, 'grid', 2, 1, 6, 1, 1, '4', 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p2-next', 'NEXT\\nKEYBOARD\\nFRUIT>', 'page_link', '#000', '#44dd44', 102, 'grid', 2, 2, 6, 1, 1, '3', 1)`)
  console.log(`  ${fruitAM.length} product buttons + 3 nav buttons.\n`)

  // ═══════════════════════════════════════════════════════════════
  // Page 3: Fruit N-Z (8 cols x 5 rows)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating Page 3: Fruit N-Z...')
  const fruitNZ = [
    [0, 0, null,   'NECTARINES',        'section'],
    [0, 1, null,   'ORANGES',           'section'],
    [0, 2, '4871', 'PASSION FRUIT EA',  'each'],
    [0, 3, '5282', 'PAPAYA RED KG',     'kg'],
    [0, 4, '5461', 'PAW PAW GREEN KG',  'kg'],
    [0, 5, null,   'PEACHES',           'section'],
    [1, 0, null,   'PEARS',             'section'],
    [1, 1, '5022', 'PERSIMMONS KG',     'kg'],
    [1, 2, '5445', 'SMALL PINEAPPLE EA','each'],
    [1, 3, '5052', 'MEDIUM PINEAPPLE EA','each'],
    [1, 4, '5422', 'XL PINEAPPLE EA',   'each'],
    [1, 5, null,   'PLUMS',             'section'],
    [2, 0, '5042', 'POMEGRANITE EA',    'each'],
    [2, 1, '4914', 'POMMELO KG',        'kg'],
    [2, 2, '5211', 'QUINCE KG',         'kg'],
    [2, 3, '5581', 'TANGELLO KG',       'kg'],
  ]

  btnCount = 0
  for (const [row, col, plu, label, unit] of fruitNZ) {
    const id = `p3-r${row}c${col}`
    const type = plu ? 'product' : 'open_price'
    run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
         VALUES (?1, ?2, ?3, '#000', '#ffffff', ?4, 'grid', 3, ?5, ?6, 1, 1, ?7, 1)`,
      [id, label, type, btnCount++, row, col, plu])
  }
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p3-back', 'BACK', 'back_home', '#000', '#44dd44', 100, 'grid', 3, 0, 6, 1, 1, NULL, 1)`)
  console.log(`  ${fruitNZ.length} product buttons + 1 nav button.\n`)

  // ═══════════════════════════════════════════════════════════════
  // Page 4: Vege A-G (8 cols x 6 rows)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating Page 4: Vege A-G...')
  const vegeAG = [
    [0, 0, '1552', 'ASIAN VEGE EA',     'each'],
    [0, 1, '1042', 'ASPARAGUS EA',      'each'],
    [0, 2, '1051', 'BEANS KG',          'kg'],
    [0, 3, '9123', 'BEETROOT',          'section'],
    [0, 4, null,   'BOTTLE GOURD',      'each'],
    [0, 5, null,   'BROCCOLI',          'section'],
    [1, 0, '1171', 'BRUSSEL SPROUTS KG','kg'],
    [1, 1, null,   'CABBAGE',           'section'],
    [1, 2, null,   'CAPSICUM',          'section'],
    [1, 3, '1371', 'CARROTS LOOSE KG',  'kg'],
    [1, 4, '1374', 'CARROT BAG EA',     'each'],
    [1, 5, '1412', 'CAULIFLOWER EA',    'each'],
    [2, 0, '1472', 'WHOLE CELERY EA',   'each'],
    [2, 1, '1452', 'CELERIAC BULB EA',  'each'],
    [2, 2, '1701', 'CHILLIES',          'section'],
    [2, 3, '1722', 'CHOKOS KG',         'kg'],
    [2, 4, null,   'CORN EA',           'each'],
    [2, 5, null,   'CUCUMBERS',         'section'],
    [3, 0, '1801', 'EGGPLANT KG',       'kg'],
    [3, 1, '1811', 'LEBANESE EGGPLANT KG','kg'],
    [3, 2, '1912', 'FENNEL EA',         'each'],
    [3, 3, null,   'GARLIC',            'section'],
    [3, 4, '1861', 'GINGER KG',         'kg'],
  ]

  btnCount = 0
  for (const [row, col, plu, label, unit] of vegeAG) {
    const id = `p4-r${row}c${col}`
    const type = plu ? 'product' : 'open_price'
    run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
         VALUES (?1, ?2, ?3, '#000', '#ffffff', ?4, 'grid', 4, ?5, ?6, 1, 1, ?7, 1)`,
      [id, label, type, btnCount++, row, col, plu])
  }
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p4-back', 'BACK', 'back_home', '#000', '#44dd44', 100, 'grid', 4, 0, 6, 1, 1, NULL, 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p4-fruitmenu', 'FRUIT\\nMENU', 'page_link', '#000', '#44dd44', 101, 'grid', 4, 1, 6, 1, 1, '2', 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p4-next', 'NEXT\\nKEYBOARD\\nVEGE>', 'page_link', '#000', '#88dddd', 102, 'grid', 4, 2, 6, 1, 1, '5', 1)`)
  console.log(`  ${vegeAG.length} product buttons + 3 nav buttons.\n`)

  // ═══════════════════════════════════════════════════════════════
  // Page 5: Vege H-Z (8 cols x 6 rows)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating Page 5: Vege H-Z...')
  const vegeHZ = [
    [0, 0, '3312', 'HERBS',             'section'],
    [0, 1, '2212', 'KALE EA',           'each'],
    [0, 2, '2232', 'LEEKS EA',          'each'],
    [0, 3, null,   'LETTUCES',          'section'],
    [0, 4, '22756','LETTUCE BAGS EA',   'each'],
    [0, 5, '2711', 'LOBOK KG',          'kg'],
    [1, 0, null,   'MUSHROOMS',         'section'],
    [1, 1, '8979', 'OLIVES KG',         'kg'],
    [1, 2, null,   'ONIONS',            'section'],
    [1, 3, '2471', 'PARSNIP KG',        'kg'],
    [1, 4, '2481', 'PEAS KG',           'kg'],
    [1, 5, null,   'POTATOES',          'section'],
    [2, 0, null,   'PUMPKINS',          'section'],
    [2, 1, '2701', 'RADISH BUNCH EA',   'each'],
    [2, 2, '2741', 'RHUBARB EA',        'each'],
    [2, 3, '2772', 'SHALLOTS EA',       'each'],
    [2, 4, '2812', 'SILVERBEET EA',     'each'],
    [2, 5, '1231', 'SNOW PEAS KG',      'kg'],
    [3, 0, '5622', 'SUGAR SNAP PEAS KG','kg'],
    [3, 1, '2871', 'SWEDES KG',         'kg'],
    [3, 2, null,   'SWEET POTATOES',    'section'],
    [3, 3, null,   'TOMATOES',          'section'],
    [3, 4, '3041', 'TURNIP KG',         'kg'],
    [3, 5, null,   'ZUCCHINI',          'section'],
  ]

  btnCount = 0
  for (const [row, col, plu, label, unit] of vegeHZ) {
    const id = `p5-r${row}c${col}`
    const type = plu ? 'product' : 'open_price'
    run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
         VALUES (?1, ?2, ?3, '#000', '#ffffff', ?4, 'grid', 5, ?5, ?6, 1, 1, ?7, 1)`,
      [id, label, type, btnCount++, row, col, plu])
  }
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p5-back', 'BACK', 'back_home', '#000', '#44dd44', 100, 'grid', 5, 0, 6, 1, 1, NULL, 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p5-fruitmenu', 'FRUIT MENU', 'page_link', '#000', '#44dd44', 101, 'grid', 5, 1, 6, 1, 1, '2', 1)`)
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p5-prev', '<BACK\\nKEYBOARD\\nVEG', 'page_link', '#000', '#44dd44', 102, 'grid', 5, 2, 6, 1, 1, '4', 1)`)
  console.log(`  ${vegeHZ.length} product buttons + 3 nav buttons.\n`)

  // ═══════════════════════════════════════════════════════════════
  // Page 6: Grocery (8 cols x 5 rows)
  // ═══════════════════════════════════════════════════════════════
  console.log('Creating Page 6: Grocery...')
  const grocery = [
    [0, 0, null,   'GROCERY',           'section'],
    [0, 1, null,   'CONFECTIONARY',     'section'],
    [0, 2, null,   'CHIPS',             'section'],
    [0, 3, null,   'NOODLES',           'section'],
    [0, 4, null,   'WATER $2PK',        'each'],
    [1, 0, null,   'SALMON PORTION',    'each'],
    [1, 1, null,   'SALMON PORTION',    'each'],
    [1, 2, '1447', 'FRESH JUICE 500ml', 'each'],
    [1, 3, null,   'MUSTARD',           'each'],
    [1, 4, null,   'MUSTARD',           'each'],
    [1, 5, '9674', 'LEMON JUICE 500ML', 'each'],
    [2, 0, '706',  'ASSORTED SPICE',    'each'],
    [2, 1, null,   'MIXED PICKLE',      'each'],
    [2, 2, '1224', 'ALTERNATIVE MILK',  'each'],
  ]

  btnCount = 0
  for (const [row, col, plu, label, unit] of grocery) {
    const id = `p6-r${row}c${col}`
    const type = plu ? 'product' : 'open_price'
    run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, category_filter, active)
         VALUES (?1, ?2, ?3, '#000', '#ffffff', ?4, 'grid', 6, ?5, ?6, 1, 1, ?7, 1)`,
      [id, label, type, btnCount++, row, col, plu])
  }
  run(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, parent_id, active)
       VALUES ('p6-back', 'BACK', 'back_home', '#000', '#44dd44', 100, 'grid', 6, 0, 6, 1, 1, NULL, 1)`)
  console.log(`  ${grocery.length} product buttons + 1 nav button.\n`)

  // ═══════════════════════════════════════════════════════════════
  // Save database
  // ═══════════════════════════════════════════════════════════════
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
  console.log('Database saved to', DB_PATH)

  // Count total buttons
  const total = db.exec("SELECT COUNT(*) as c FROM keyboard_buttons WHERE active = 1")[0].values[0][0]
  console.log(`\nTotal active keyboard buttons: ${total}`)
  const pages = db.exec("SELECT DISTINCT page FROM keyboard_buttons WHERE active = 1 ORDER BY page")[0].values.map(v => v[0])
  console.log(`Pages: ${pages.join(', ')}`)

  console.log('\nDone! Restart the app to see the new keyboard pages.')
  console.log('Use the bottom nav buttons (FRUIT A-M, FRUIT N-Z, VEGE A-G, VEGE H-Z, GROCERY) to navigate between pages.')
  console.log('Use BACK on each page to return to the main register.')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
