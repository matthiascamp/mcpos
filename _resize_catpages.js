const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 13×10 grid with 2×2 buttons
// Rows 0-1: cols 0,2,4,6,8 = 5 slots (BACK at 0,11 as 2×2)
// Rows 2-3: cols 0,2,4,6,8,10 = 6 slots
// Rows 4-5: cols 0,2,4,6,8,10 = 6 slots
// Rows 6-7: cols 0,2,4,6,8,10 = 6 slots
// Rows 8-9: cols 0,2,4,6,8,10 = 6 slots
// Total: 29 product slots (max needed: 24 for page 5)

const SLOTS = [
  [0,0],[0,2],[0,4],[0,6],[0,8],
  [2,0],[2,2],[2,4],[2,6],[2,8],[2,10],
  [4,0],[4,2],[4,4],[4,6],[4,8],[4,10],
  [6,0],[6,2],[6,4],[6,6],[6,8],[6,10],
  [8,0],[8,2],[8,4],[8,6],[8,8],[8,10],
];

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Update grid size to 13×10 for pages 2-5
  for (const pg of [2, 3, 4, 5]) {
    db.run("UPDATE keyboard_pages SET rows = 10 WHERE page = ?", [pg]);
  }

  for (const pg of [2, 3, 4, 5]) {
    const btns = db.exec(
      `SELECT id, label, type, price, image, color, bg_color, parent_id,
              category_filter, alpha_range, sort_order, position, product_id, active
       FROM keyboard_buttons WHERE page = ? AND active = 1 ORDER BY sort_order`, [pg]);
    if (!btns.length) continue;

    const backBtns = [];
    const productBtns = [];
    for (const r of btns[0].values) {
      if (r[2] === 'back_home') backBtns.push(r);
      else productBtns.push(r);
    }

    // Sort alphabetically by first line of label
    productBtns.sort((a, b) => {
      const la = String(a[1]).split('\\n')[0].toUpperCase();
      const lb = String(b[1]).split('\\n')[0].toUpperCase();
      return la.localeCompare(lb);
    });

    console.log(`Page ${pg}: ${productBtns.length} products`);

    // Delete and re-insert with new layout
    db.run("DELETE FROM keyboard_buttons WHERE page = ?", [pg]);

    const stmt = db.prepare(`INSERT INTO keyboard_buttons
      (id, label, type, price, image, color, bg_color, parent_id,
       category_filter, alpha_range, sort_order, position, page,
       grid_row, grid_col, col_span, row_span, product_id, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (let i = 0; i < productBtns.length && i < SLOTS.length; i++) {
      const [row, col] = SLOTS[i];
      const r = productBtns[i];
      stmt.run([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9],
        i, 'grid', pg, row, col, 2, 2, r[12], r[13]]);
    }

    // BACK button: 2×2 at (0, 11)
    const backId = `pg${pg}-back`;
    stmt.run([backId, 'BACK', 'back_home', 0, null, '#fff', '#16a34a', null,
      null, null, 90, 'grid', pg, 0, 11, 2, 2, null, 1]);

    stmt.free();

    if (productBtns.length > SLOTS.length) {
      console.log(`  WARNING: ${productBtns.length - SLOTS.length} products didn't fit!`);
    }
  }

  // Verify
  console.log('\n--- Verification ---');
  for (const pg of [2, 3, 4, 5]) {
    const meta = db.exec('SELECT cols, rows FROM keyboard_pages WHERE page = ?', [pg]);
    const btns = db.exec('SELECT id, grid_row, grid_col, col_span, row_span FROM keyboard_buttons WHERE page = ? AND active = 1', [pg]);
    if (!btns.length) continue;
    const maxCols = meta[0].values[0][0];
    const maxRows = meta[0].values[0][1];
    const occupied = new Set();
    let issues = 0;
    for (const [id, row, col, cs, rs] of btns[0].values) {
      if (col + cs > maxCols || row + rs > maxRows) { issues++; console.log(`  OOB: ${id} at (${row},${col}) ${cs}x${rs} in ${maxCols}x${maxRows}`); continue; }
      for (let r = row; r < row + rs; r++) {
        for (let c = col; c < col + cs; c++) {
          if (occupied.has(r+','+c)) { issues++; console.log(`  OVERLAP at (${r},${c}): ${id}`); }
          occupied.add(r+','+c);
        }
      }
    }
    console.log(`Page ${pg}: ${maxCols}x${maxRows} grid, ${btns[0].values.length} btns, ${issues === 0 ? 'OK' : issues + ' ISSUES'}`);
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('\nBundled DB updated');
  }
}
main().catch(console.error);
