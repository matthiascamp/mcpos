// One-shot: persist the working Crisp Receipt queue into the app's settings table.
// Usage: node set-printer-config.js
const fs = require('fs')
const path = require('path')
const os = require('os')
const initSqlJs = require('sql.js')

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'crisp-pos', 'crisp-pos.sqlite')

;(async () => {
  if (!fs.existsSync(dbPath)) { console.error('DB not found:', dbPath); process.exit(1) }
  const SQL = await initSqlJs({ locateFile: f => path.join(__dirname, 'node_modules', 'sql.js', 'dist', f) })
  const db = new SQL.Database(fs.readFileSync(dbPath))

  const set = (k, v) => db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [k, v])
  set('hw_printer_name', 'Crisp Receipt')
  set('hw_printer_interface', 'windows')
  set('hw_printer_port', 'USB002')

  fs.writeFileSync(dbPath, Buffer.from(db.export()))
  const rows = db.exec("SELECT key, value FROM settings WHERE key LIKE 'hw_printer%' OR key LIKE 'hw_scale%' ORDER BY key")
  console.log('Saved hardware settings:')
  for (const r of (rows[0]?.values || [])) console.log('  ' + r[0] + ' = ' + r[1])
  db.close()
})()
