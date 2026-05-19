/**
 * Build keyboard sub-pages from Profit Track layout photos.
 * Reads apple images from v4 export, creates all buttons with correct PLUs.
 * Run once: node _build_keyboard.js
 */
const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')

const DB_PATH = path.join(
  process.env.APPDATA || path.join(process.env.HOME, '.config'),
  'crisp-pos', 'crisp-pos.sqlite'
)

async function main() {
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()
  const buf = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(buf)
  console.log('Opened database:', DB_PATH)

  // Load apple images from v4 export
  const v4 = JSON.parse(fs.readFileSync(path.join(__dirname, 'keyboard-layout-2026-05-17.json'), 'utf-8'))
  const v4Images = {}
  v4.buttons.forEach(b => {
    if (b.image && b.label) v4Images[b.label.toUpperCase().split('\n')[0].trim()] = b.image
  })
  console.log('Loaded', Object.keys(v4Images).length, 'images from v4 export')

  function getImage(labelKey) {
    // Try exact match first, then partial
    if (v4Images[labelKey]) return v4Images[labelKey]
    for (const [k, v] of Object.entries(v4Images)) {
      if (k.includes(labelKey) || labelKey.includes(k)) return v
    }
    return null
  }

  function clearPage(page) {
    // Delete all buttons on page except BACK
    db.run("DELETE FROM keyboard_buttons WHERE page = ? AND type != 'back_home'", [page])
    // Also delete back_home buttons so we can recreate them consistently
    db.run("DELETE FROM keyboard_buttons WHERE page = ? AND type = 'back_home'", [page])
  }

  function addButton(page, row, col, label, plu, unit, opts = {}) {
    const id = opts.id || uuid()
    const colSpan = opts.colSpan || 2
    const rowSpan = opts.rowSpan || 1
    const type = opts.type || 'fixed_price'
    const price = opts.price || 0
    const bgColor = opts.bgColor || '#1a3d2a'
    const color = opts.color || '#fff'
    const image = opts.image || null

    db.run(`INSERT OR REPLACE INTO keyboard_buttons
      (id, label, type, price, image, color, bg_color, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'grid', ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [id, label, type, price, image, color, bgColor, row * 20 + col, page, row, col, colSpan, rowSpan, null])

    // Link to product by PLU if possible
    if (plu) {
      const existing = db.exec("SELECT id FROM products WHERE plu = ?", [String(plu)])
      if (existing.length && existing[0].values.length) {
        const productId = existing[0].values[0][0]
        db.run("UPDATE keyboard_buttons SET product_id = ? WHERE id = ?", [productId, id])
      }
    }
  }

  function addBack(page) {
    addButton(page, 0, 10, 'BACK', null, null, {
      type: 'back_home', colSpan: 3, rowSpan: 1,
      bgColor: '#4fbd77', color: '#fff', price: 0
    })
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE 7: APPLES
  // ═══════════════════════════════════════════════════════════
  clearPage(7)
  addBack(7)
  // Row 0
  addButton(7, 0, 0, 'SM PINK LADY KG\n(SPOTTY)', '4015', 'kg', { image: getImage('SMALL PINK LADY') })
  addButton(7, 0, 2, 'SM GRANNY SMITH\nKG', '4075', 'kg', { image: getImage('SMALL GRANNY SMITH') })
  addButton(7, 0, 4, 'SM ROYAL GALA KG\n(STRIPY)', '4065', 'kg', { image: getImage('SMALL ROYAL GALA') })
  addButton(7, 0, 6, 'BRAVO KG', null, 'kg', { bgColor: '#2d1a3d' })
  addButton(7, 0, 8, 'JAZZ APPLE KG', '3812', 'kg', { image: getImage('JAZZ APPLE') })
  // Row 1
  addButton(7, 1, 0, 'LG PINK LADY KG', '4011', 'kg', { image: getImage('LARGE PINK LADY') })
  addButton(7, 1, 2, 'LG GRANNY SMITH\nKG', '4071', 'kg', { image: getImage('LARGE GRANNY SMITH') })
  addButton(7, 1, 4, 'LG ROYAL GALA KG\n(STRIPY)', '4061', 'kg', { image: getImage('LARGE ROYAL GALA') })
  addButton(7, 1, 6, 'KANZI KG', '4835', 'kg')
  addButton(7, 1, 8, 'RED DELICIOUS KG\n(DARK)', '4021', 'kg', { image: getImage('RED DELICIOUS') })
  // Row 2
  addButton(7, 2, 0, 'RED APPLE\nBUCKET KG', '4031', 'kg', { bgColor: '#6b21a8' })
  addButton(7, 2, 2, 'GRANNY SMITH\nBUCKET KG', '40026', 'kg', { bgColor: '#6b21a8' })
  addButton(7, 2, 4, 'FUJI APPLE EA', null, 'ea')
  console.log('Page 7 (Apples): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 9: AVOCADOS
  // ═══════════════════════════════════════════════════════════
  clearPage(9)
  addBack(9)
  addButton(9, 0, 0, 'HASS EA\n(DARK & ROUGH)', '4152', 'ea')
  addButton(9, 0, 2, 'REED EA\n(ROUND & SMOOTH)', '4157', 'ea')
  addButton(9, 0, 4, 'SHEPARD EA\n(GREEN & SMOOTH)', '41522', 'ea')
  addButton(9, 1, 0, 'SMALL AVOCADO EA', '4155', 'ea')
  addButton(9, 1, 2, 'AVOCADO BAG KG', '5925', 'kg')
  console.log('Page 9 (Avocados): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 10: BANANAS
  // ═══════════════════════════════════════════════════════════
  clearPage(10)
  addBack(10)
  addButton(10, 0, 0, 'CAVENDISH KG\n(LONG & STRAIGHT)', '4201', 'kg')
  addButton(10, 0, 2, 'LADY FINGER KG\n(THICK & STUBBY)', '4221', 'kg')
  addButton(10, 1, 0, 'CAVENDISH\nBUCKET KG', '40024', 'kg', { bgColor: '#65a30d' })
  addButton(10, 1, 2, 'LADYFINGER\nBUCKET KG', '40022', 'kg', { bgColor: '#65a30d' })
  console.log('Page 10 (Bananas): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 11: GRAPES
  // ═══════════════════════════════════════════════════════════
  clearPage(11)
  addBack(11)
  addButton(11, 0, 0, 'WHITE SEEDLESS KG', '4891', 'kg')
  addButton(11, 0, 2, 'RED SEEDLESS KG', '4861', 'kg')
  addButton(11, 1, 0, 'BLACK SEEDLESS KG', '4831', 'kg')
  addButton(11, 1, 2, 'AUTUMN KING KG', '4881', 'kg')
  addButton(11, 1, 4, 'BLACK MUSCAT KG', '5235', 'kg')
  console.log('Page 11 (Grapes): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 12: KIWIFRUITS
  // ═══════════════════════════════════════════════════════════
  clearPage(12)
  addBack(12)
  addButton(12, 0, 0, 'REGULAR KIWI KG', '4645', 'kg')
  addButton(12, 0, 2, 'GOLD KIWI EA\n(ZESPRI)', '5085', 'ea')
  console.log('Page 12 (Kiwifruits): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 13: LEMONS
  // ═══════════════════════════════════════════════════════════
  clearPage(13)
  addBack(13)
  addButton(13, 0, 0, 'LEMONS KG', '4633', 'kg')
  addButton(13, 0, 2, 'BAGGED LEMONS KG', null, 'kg')
  console.log('Page 13 (Lemons): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 14: LIMES
  // ═══════════════════════════════════════════════════════════
  clearPage(14)
  addBack(14)
  addButton(14, 0, 0, 'LIMES EA', '4643', 'ea')
  addButton(14, 0, 2, 'BAGGED LIMES KG', '46422', 'kg')
  console.log('Page 14 (Limes): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 15: MANDARINS
  // ═══════════════════════════════════════════════════════════
  clearPage(15)
  addBack(15)
  addButton(15, 0, 0, 'IMPERIAL KG\n(FLAT & SMALL)', '5821', 'kg')
  addButton(15, 0, 2, 'HONEY MURCOTT KG\n(LARGE & ROUND)', '4665', 'kg')
  addButton(15, 0, 4, 'MANDARINES\nGREEN BUCKET', '40049', 'kg', { bgColor: '#65a30d' })
  addButton(15, 1, 0, 'EMPRESS KG\n(ROUND & SMALL)', '4661', 'kg')
  addButton(15, 1, 2, 'DAISY KG\n(ROUND & DARK)', '4457', 'kg')
  addButton(15, 1, 4, 'AFOURER KG\n(FLAT & MEDIUM)', '5791', 'kg')
  console.log('Page 15 (Mandarins): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 16: MANGOES
  // ═══════════════════════════════════════════════════════════
  clearPage(16)
  addBack(16)
  addButton(16, 0, 0, 'SMALL KP EA', '4395', 'ea')
  addButton(16, 0, 2, 'R2E2 EA', '4735', 'ea')
  addButton(16, 0, 4, 'PEACH MANGO EA', '1642', 'ea')
  addButton(16, 1, 0, 'MEDIUM KP EA', '4702', 'ea')
  addButton(16, 1, 2, 'KEITT EA\n(GREENISH)', '5772', 'ea')
  addButton(16, 1, 4, 'CALYPSO\nMANGO EA', '5766', 'ea')
  addButton(16, 2, 0, 'LARGE KP EA', '4701', 'ea')
  console.log('Page 16 (Mangoes): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 17: MELONS
  // ═══════════════════════════════════════════════════════════
  clearPage(17)
  addBack(17)
  addButton(17, 0, 0, 'ROCKMELON EA', '4752', 'ea')
  addButton(17, 0, 2, 'HONEY DEW EA', '4722', 'ea')
  addButton(17, 0, 4, 'ROUND SEEDLESS\nWATERMELON EA', '4801', 'ea')
  addButton(17, 1, 0, 'OUTDOOR\nROCKMELON EA', '4757', 'ea')
  addButton(17, 1, 2, 'OUTSIDE\nHONEYDEW EA', '4716', 'ea', { bgColor: '#65a30d' })
  addButton(17, 2, 0, 'JESTER MELON EA', '4761', 'ea')
  addButton(17, 2, 2, 'SANTA CLAUS\nMELON EA', '5992', 'ea')
  addButton(17, 2, 4, 'LONG SEEDED\nWATERMELON KG', '5441', 'kg')
  console.log('Page 17 (Melons): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 18: NECTARINES
  // ═══════════════════════════════════════════════════════════
  clearPage(18)
  addBack(18)
  addButton(18, 0, 0, 'YELLOW\nNECTARINE KG', '4641', 'kg')
  addButton(18, 0, 2, 'WHITE\nNECTARINE KG', '4051', 'kg')
  addButton(18, 0, 4, 'NECTARINES\nBUCKET KG', '4425', 'kg', { bgColor: '#65a30d' })
  console.log('Page 18 (Nectarines): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 19: ORANGES
  // ═══════════════════════════════════════════════════════════
  clearPage(19)
  addBack(19)
  addButton(19, 0, 0, 'NAVEL ORANGE KG\n(NAV HOLE)', '4912', 'kg')
  addButton(19, 0, 2, 'VALENCIA\nORANGE KG', '3791', 'kg')
  addButton(19, 0, 4, 'BLOOD ORANGE\nBUCKET KG', '6117', 'kg', { bgColor: '#c4b800' })
  addButton(19, 1, 0, 'BLOOD ORANGE KG', '6302', 'kg')
  addButton(19, 1, 2, 'CARA CARA\nORANGE KG', '6376', 'kg')
  addButton(19, 1, 4, '3KG ORANGES\nBAG EA', '4815', 'ea')
  console.log('Page 19 (Oranges): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 20: PEACHES
  // ═══════════════════════════════════════════════════════════
  clearPage(20)
  addBack(20)
  addButton(20, 0, 0, 'YELLOW PEACH KG', '5081', 'kg')
  addButton(20, 0, 2, 'GOLDEN QUEEN KG', '5037', 'kg')
  addButton(20, 1, 0, 'WHITE PEACH KG', '5025', 'kg')
  addButton(20, 1, 2, 'PEACH BUCKET KG', '5013', 'kg', { bgColor: '#65a30d' })
  console.log('Page 20 (Peaches): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 21: PEARS
  // ═══════════════════════════════════════════════════════════
  clearPage(21)
  addBack(21)
  addButton(21, 0, 0, 'PACKHAM KG', '4901', 'kg')
  addButton(21, 0, 2, 'NASHI EA', '5292', 'ea')
  addButton(21, 0, 4, 'BEURRE BOSC KG', '3123', 'kg')
  addButton(21, 1, 0, 'WILLIAMS KG', '4975', 'kg')
  addButton(21, 1, 2, 'PIQABOO KG', '5275', 'kg')
  addButton(21, 1, 4, 'PEAR BUCKET KG', '40023', 'kg', { bgColor: '#65a30d' })
  console.log('Page 21 (Pears): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 22: PLUMS
  // ═══════════════════════════════════════════════════════════
  clearPage(22)
  addBack(22)
  addButton(22, 0, 0, 'RED PLUM KG', '5121', 'kg')
  addButton(22, 0, 2, 'SUGAR PLUM KG', '5241', 'kg')
  addButton(22, 1, 0, 'BLACK PLUM KG', '6753', 'kg')
  addButton(22, 1, 2, 'CANDY PLUM KG', '5675', 'kg')
  addButton(22, 1, 4, 'PLUMS\nBUCKET KG', '44250', 'kg', { bgColor: '#65a30d' })
  console.log('Page 22 (Plums): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 29: LETTUCES
  // ═══════════════════════════════════════════════════════════
  clearPage(29)
  addBack(29)
  addButton(29, 0, 0, 'ICEBERG\nLETTUCE EA', '3304', 'ea')
  addButton(29, 0, 2, 'COS LETTUCE EA', '1272', 'ea')
  addButton(29, 0, 4, 'FANCY\nLETTUCE EA', '2962', 'ea')
  console.log('Page 29 (Lettuces): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 30: MUSHROOMS
  // ═══════════════════════════════════════════════════════════
  clearPage(30)
  addBack(30)
  addButton(30, 0, 0, 'BUTTON\nMUSHROOMS KG', '2323', 'kg')
  addButton(30, 0, 2, 'SWISS BROWN\nMUSHROOM KG', '2393', 'kg')
  addButton(30, 0, 4, 'FLAT\nMUSHROOM KG', '2383', 'kg')
  console.log('Page 30 (Mushrooms): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 31: ONIONS
  // ═══════════════════════════════════════════════════════════
  clearPage(31)
  addBack(31)
  // Row 0
  addButton(31, 0, 0, '1KG BROWN\nONION BAG', '2451', 'ea')
  addButton(31, 0, 2, 'ONION\nBROWN KG', '2411', 'kg')
  addButton(31, 0, 4, 'ONION RED KG', '2441', 'kg')
  addButton(31, 0, 6, 'ONION\nWHITE KG', '2431', 'kg')
  // Row 1
  addButton(31, 1, 0, 'ONION BAG\n(PURPLE)', '2452', 'ea')
  addButton(31, 1, 2, 'SALAD ONION KG', '2462', 'kg')
  addButton(31, 1, 4, 'PICKLING BAG', '2454', 'ea')
  addButton(31, 1, 6, 'SPRING ONION\nBUNCH', '2453', 'ea')
  console.log('Page 31 (Onions): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 32: POTATOES
  // ═══════════════════════════════════════════════════════════
  clearPage(32)
  addBack(32)
  // Row 0
  addButton(32, 0, 0, 'BRUSHED KG', '2525', 'kg')
  addButton(32, 0, 2, 'WASHED\nWHITE KG', '2511', 'kg')
  addButton(32, 0, 4, 'CHATS 5KG BAG', '2764', 'ea')
  // Row 1
  addButton(32, 1, 0, 'MARIS PIPER KG', '2522', 'kg')
  addButton(32, 1, 2, 'WASHED RED KG', '2531', 'kg')
  addButton(32, 1, 4, 'RED CHATS KG', '2545', 'kg')
  addButton(32, 1, 6, 'DUTCH CREAM KG', '2524', 'kg')
  console.log('Page 32 (Potatoes): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 33: PUMPKINS
  // ═══════════════════════════════════════════════════════════
  clearPage(33)
  addBack(33)
  // Row 0 - whole
  addButton(33, 0, 0, 'BUTTERNUT KG', '2661', 'kg')
  addButton(33, 0, 2, 'JAP KG', '2931', 'kg')
  addButton(33, 0, 4, 'JARRA KG', '2621', 'kg')
  // Row 1 - cut
  addButton(33, 1, 0, 'BUTTERNUT CUT', '2671', 'kg')
  addButton(33, 1, 2, 'JAP CUT', '2941', 'kg')
  addButton(33, 1, 4, 'JARRA CUT\n(BLUEISH SKIN)', '2631', 'kg')
  // Row 2 - from outside
  addButton(33, 2, 0, 'BUTTERNUT\nOUTSIDE KG', '3681', 'kg', { bgColor: '#c4b800' })
  addButton(33, 2, 2, 'JAP\nOUTSIDE KG', '2721', 'kg', { bgColor: '#c4b800' })
  addButton(33, 2, 4, 'JARRA\nOUTSIDE KG', '91321', 'kg', { bgColor: '#c4b800' })
  console.log('Page 33 (Pumpkins): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 34: SWEET POTATOES
  // ═══════════════════════════════════════════════════════════
  clearPage(34)
  addBack(34)
  addButton(34, 0, 0, 'GOLD KG', '2571', 'kg')
  addButton(34, 0, 2, 'RED KG', '2551', 'kg')
  addButton(34, 0, 4, 'WHITE KG', '2565', 'kg')
  addButton(34, 1, 0, 'GOLD\nOUTSIDE KG', '1082', 'kg', { bgColor: '#c4b800' })
  console.log('Page 34 (Sweet Potatoes): done')

  // ═══════════════════════════════════════════════════════════
  // PAGE 36: ZUCCHINI
  // ═══════════════════════════════════════════════════════════
  clearPage(36)
  addBack(36)
  addButton(36, 0, 0, 'ZUCCHINI KG', '3061', 'kg')
  addButton(36, 0, 2, 'ZUCCHINI\nBUCKET KG', '5233', 'kg', { bgColor: '#65a30d' })
  console.log('Page 36 (Zucchini): done')

  // Save
  const outData = db.export()
  const buffer = Buffer.from(outData)
  fs.writeFileSync(DB_PATH, buffer)
  console.log('\nDatabase saved to:', DB_PATH)

  // Count totals
  const total = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page >= 7 AND active = 1")
  console.log('Total active buttons on sub-pages:', total[0].values[0][0])

  db.close()
}

main().catch(e => { console.error(e); process.exit(1) })
