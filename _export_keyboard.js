const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const pages = db.exec("SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5 ORDER BY page");
  const buttons = db.exec(`SELECT id, label, type, price, image, color, bg_color, parent_id,
    category_filter, alpha_range, sort_order, position, page, grid_row, grid_col,
    col_span, row_span, product_id, active
    FROM keyboard_buttons WHERE page > 5 ORDER BY page, grid_row, grid_col`);

  const pagesData = pages[0].values.map(r => ({ page: r[0], name: r[1], cols: r[2], rows: r[3] }));
  const buttonsData = buttons[0].values.map(r => ({
    id: r[0], label: r[1], type: r[2], price: r[3], image: r[4],
    color: r[5], bg_color: r[6], parent_id: r[7], category_filter: r[8],
    alpha_range: r[9], sort_order: r[10], position: r[11], page: r[12],
    grid_row: r[13], grid_col: r[14], col_span: r[15], row_span: r[16],
    product_id: r[17], active: r[18]
  }));

  console.log(`Exported ${pagesData.length} pages, ${buttonsData.length} buttons`);

  const output = `// Keyboard sub-pages (pages 7-36) — extracted from Profit Track register photos
// Auto-generated, do not edit manually
const VERSION = '2026-05-17'

const pages = ${JSON.stringify(pagesData, null, 2)}

const buttons = ${JSON.stringify(buttonsData, null, 2)}

function apply(db) {
  const localVer = (() => { try { const r = db.exec("SELECT value FROM settings WHERE key = 'kb_subpages_ver'"); return r.length && r[0].values.length ? r[0].values[0][0] : '0' } catch (_) { return '0' } })()
  if (localVer >= VERSION) return 0

  db.run("DELETE FROM keyboard_buttons WHERE page > 5")
  db.run("DELETE FROM keyboard_pages WHERE page > 5")

  const pgStmt = db.prepare("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)")
  for (const p of pages) { pgStmt.run([p.page, p.name, p.cols, p.rows]); }
  pgStmt.free()

  const btnStmt = db.prepare("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  for (const b of buttons) {
    btnStmt.run([b.id, b.label, b.type, b.price, b.image, b.color, b.bg_color, b.parent_id, b.category_filter, b.alpha_range, b.sort_order, b.position, b.page, b.grid_row, b.grid_col, b.col_span, b.row_span, b.product_id, b.active])
  }
  btnStmt.free()

  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_subpages_ver', ?)", [VERSION])
  return buttons.length
}

module.exports = { apply, VERSION }
`

  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-subpages.js'), output, 'utf-8');
  console.log('Written to db/keyboard-subpages.js');
}
main().catch(console.error);
