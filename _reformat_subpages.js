const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const pages = db.exec("SELECT DISTINCT page FROM keyboard_buttons WHERE page > 5 ORDER BY page");
  if (!pages.length) { console.log('No sub-pages found'); return; }

  // Grid: 13 cols x 7 rows. Each product button is 2x2.
  // BACK button: top-right at (row=0, col=11), 2x2
  // Products: sorted alphabetically, fill left-to-right, top-to-bottom as 2x2
  const COLS = 13;
  const BACK_ROW = 0, BACK_COL = 11;

  // Product positions: 2-wide buttons placed at even columns
  // Row 0-1: cols 0,2,4,6,8 (5 slots, col 10 empty, col 11-12 = BACK)
  // Row 2-3: cols 0,2,4,6,8,10 (6 slots)
  // Row 4-5: cols 0,2,4,6,8,10 (6 slots)
  const productSlots = [
    // row, col
    [0, 0], [0, 2], [0, 4], [0, 6], [0, 8],           // row 0-1 (5 slots)
    [2, 0], [2, 2], [2, 4], [2, 6], [2, 8], [2, 10],   // row 2-3 (6 slots)
    [4, 0], [4, 2], [4, 4], [4, 6], [4, 8], [4, 10],   // row 4-5 (6 slots)
  ]; // max 17 products per page

  let totalUpdated = 0;

  for (const [pageNum] of pages[0].values) {
    const buttons = db.exec(`SELECT id, label, type FROM keyboard_buttons WHERE page = ${pageNum} ORDER BY id`);
    if (!buttons.length) continue;

    const backBtns = [];
    const productBtns = [];

    for (const row of buttons[0].values) {
      if (row[2] === 'back_home') backBtns.push(row[0]);
      else productBtns.push({ id: row[0], label: row[1] });
    }

    // Sort products alphabetically by label (first line only, ignore price)
    productBtns.sort((a, b) => {
      const la = String(a.label).split('\n')[0].toUpperCase();
      const lb = String(b.label).split('\n')[0].toUpperCase();
      return la.localeCompare(lb);
    });

    // Place BACK button top-right, 2x2
    for (const id of backBtns) {
      db.run("UPDATE keyboard_buttons SET grid_row=?, grid_col=?, col_span=2, row_span=2 WHERE id=?",
        [BACK_ROW, BACK_COL, id]);
    }

    // Place products in 2x2 slots, alphabetical order
    for (let i = 0; i < productBtns.length && i < productSlots.length; i++) {
      const [r, c] = productSlots[i];
      db.run("UPDATE keyboard_buttons SET grid_row=?, grid_col=?, col_span=2, row_span=2 WHERE id=?",
        [r, c, productBtns[i].id]);
    }

    totalUpdated += productBtns.length + backBtns.length;
    console.log(`Page ${pageNum}: ${productBtns.length} products + ${backBtns.length} back (sorted: ${productBtns.map(b => String(b.label).split('\n')[0]).join(', ')})`);
  }

  console.log(`\nTotal updated: ${totalUpdated} buttons`);

  // Save to local DB
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  // Save to bundled DB
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // Now re-export to keyboard-subpages.js
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const pagesData = db2.exec("SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5 ORDER BY page");
  const buttonsData = db2.exec(`SELECT id, label, type, price, image, color, bg_color, parent_id,
    category_filter, alpha_range, sort_order, position, page, grid_row, grid_col,
    col_span, row_span, product_id, active
    FROM keyboard_buttons WHERE page > 5 ORDER BY page, grid_row, grid_col`);

  const pArr = pagesData[0].values.map(r => ({ page: r[0], name: r[1], cols: r[2], rows: r[3] }));
  const bArr = buttonsData[0].values.map(r => ({
    id: r[0], label: r[1], type: r[2], price: r[3], image: r[4],
    color: r[5], bg_color: r[6], parent_id: r[7], category_filter: r[8],
    alpha_range: r[9], sort_order: r[10], position: r[11], page: r[12],
    grid_row: r[13], grid_col: r[14], col_span: r[15], row_span: r[16],
    product_id: r[17], active: r[18]
  }));

  const output = `// Keyboard sub-pages (pages 7-36) — extracted from Profit Track register photos
// Auto-generated, do not edit manually
const VERSION = '2026-05-18'

const pages = ${JSON.stringify(pArr, null, 2)}

const buttons = ${JSON.stringify(bArr, null, 2)}

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
`;

  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-subpages.js'), output, 'utf-8');
  console.log('Re-exported db/keyboard-subpages.js (VERSION: 2026-05-18)');
}
main().catch(console.error);
