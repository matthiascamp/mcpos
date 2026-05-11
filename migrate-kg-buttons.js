// One-shot: flip /KG keyboard buttons from 'open_price' to 'weighed_open'.
// Usage: node migrate-kg-buttons.js
const fs = require('fs')
const path = require('path')
const os = require('os')
const initSqlJs = require('sql.js')

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'crisp-pos', 'crisp-pos.sqlite')

;(async () => {
  if (!fs.existsSync(dbPath)) { console.error('DB not found:', dbPath); process.exit(1) }
  const SQL = await initSqlJs({ locateFile: f => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  // Find every keyboard button that looks like a /KG generic-price button.
  // Match on label containing "/KG" (case-insensitive) AND type 'open_price'.
  const before = db.exec("SELECT id, label, type FROM keyboard_buttons WHERE label LIKE '%/KG%' OR label LIKE '%/kg%'")
  const rows = before[0]?.values || []
  console.log('Matching buttons:')
  for (const r of rows) console.log(`  ${r[0]} | "${r[1]}" | type=${r[2]}`)

  db.run("UPDATE keyboard_buttons SET type='weighed_open' WHERE (label LIKE '%/KG%' OR label LIKE '%/kg%') AND type='open_price'")
  const changed = db.getRowsModified()
  console.log(`Updated ${changed} button(s) to type='weighed_open'.`)

  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  const after = db.exec("SELECT id, label, type FROM keyboard_buttons WHERE label LIKE '%/KG%' OR label LIKE '%/kg%'")
  console.log('After:')
  for (const r of (after[0]?.values || [])) console.log(`  ${r[0]} | "${r[1]}" | type=${r[2]}`)
  db.close()
})()
