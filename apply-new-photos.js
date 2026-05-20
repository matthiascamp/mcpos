const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

const root = __dirname
const sourceDir = path.join(root, 'new photos')
const assetDir = path.join(root, 'pos', 'images', 'products')
const bundledDbPath = path.join(root, 'db', 'crisp-pos.sqlite')
const runtimeDbPath = process.argv[2] || ''

const mappings = [
  ['afourer.png', ['pg15-btn5']],
  ['autumn king.png', ['pg11-btn3']],
  ['avo bag.png', ['pg9-btn4']],
  ['black grapes.png', ['pg11-btn2']],
  ['black muscat.webp', ['pg11-btn4']],
  ['bravo apple.png', ['pg7-btn0']],
  ['daisy mandarin.png', ['pg15-btn4']],
  ['empress mandarin.png', ['pg15-btn3']],
  ['fancy lettuce.png', ['pg29-btn2']],
  ['golden peach.png', ['pg20-btn1']],
  ['hass avo.png', ['pg9-btn0']],
  ['honey murcott.png', ['pg15-btn1']],
  ['jazz-apple.png', ['pg7-btn4']],
  ['lady_finger.png', ['pg10-btn1', 'pg10-btn3']],
  ['lemon bag.png', ['pg13-btn1']],
  ['lime bag.png', ['pg14-btn1']],
  ['Mandarin-Imperial.png', ['pg15-btn0']],
  ['nashi pear.png', ['pg21-btn1']],
  ['oranges-valencia-3-kg-bag-fruit_396x298.png', ['pg19-btn5']],
  ['red delicious apple.png', ['pg7-btn11']],
  ['red grapes.png', ['pg11-btn1']],
  ['reed avo.png', ['pg9-btn1']],
  ['shepherd avo.png', ['pg9-btn2']],
  ['small avo.png', ['pg9-btn3']],
  ['sugar plum.png', ['pg22-btn1']],
  ['white grapes.png', ['pg11-btn0']],
]

const intentionallySkipped = [
  'Beetroot-Baby-Bunch.png',
  'broccolini.png',
  'cabbage.png',
  'chinese cabbage or wombok.png',
  'green capsicum.png',
  'green chilli.png',
  'green sweet or banana chilli.png',
  'garlic bag.png',
  'red cabbage.png',
  'red capsicum.png',
  'red chilli.png',
  'sassy apple.png',
  'sugarloaf cabbage.png',
  'yellow capsicum.png',
  'australian garlic.png',
  'mexican garlic.png',
  'hass avo.avif',
]

function assetName(file) {
  return 'new-' + file.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
}

function copyAssets() {
  fs.mkdirSync(assetDir, { recursive: true })
  const copied = []
  for (const [file] of mappings) {
    const src = path.join(sourceDir, file)
    if (!fs.existsSync(src)) {
      console.log(`missing source: ${file}`)
      continue
    }
    const destName = assetName(file)
    fs.copyFileSync(src, path.join(assetDir, destName))
    copied.push(destName)
  }
  return copied
}

function updateDb(SQL, dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return { dbPath, skipped: true, updated: 0, missing: [] }
  const db = new SQL.Database(fs.readFileSync(dbPath))
  const check = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='keyboard_buttons'")
  if (!check.length) return { dbPath, skipped: true, updated: 0, missing: [] }

  let updated = 0
  const missing = []
  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ?1, bg_color = '#ffffff', color = '#111111', alpha_range = 'image:contain', updated_at = datetime('now') WHERE id = ?2 AND active = 1 AND page > 5")
  const exists = db.prepare("SELECT id FROM keyboard_buttons WHERE id = ?1 AND active = 1 AND page > 5")
  for (const [file, ids] of mappings) {
    const imgPath = 'images/products/' + assetName(file)
    for (const id of ids) {
      exists.bind([id])
      const found = exists.step()
      exists.reset()
      if (!found) {
        missing.push(id)
        continue
      }
      stmt.run([imgPath, id])
      updated++
    }
  }
  stmt.free()
  exists.free()
  const data = db.export()
  fs.writeFileSync(dbPath, Buffer.from(data))
  db.close()
  return { dbPath, updated, missing }
}

async function main() {
  const copied = copyAssets()
  const SQL = await initSqlJs()
  const results = [updateDb(SQL, bundledDbPath)]
  if (runtimeDbPath) results.push(updateDb(SQL, runtimeDbPath))
  console.log(JSON.stringify({ copied, results, intentionallySkipped }, null, 2))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
