const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 13-col × 7-row grid. Buttons: 2 cols × 1 row.
// BACK: 2×2 at (0, 11).
// Row 0: cols 0,2,4,6,8 = 5 slots (cols 10+ reserved for BACK)
// Row 1: cols 0,2,4,6,8 = 5 slots
// Rows 2-6: cols 0,2,4,6,8,10 = 6 slots per row × 5 = 30
// Total: 40 product slots — fits all categories (max 25)

const SLOTS_ROW01 = [[0,0],[0,2],[0,4],[0,6],[0,8],
                      [1,0],[1,2],[1,4],[1,6],[1,8]];
const SLOTS_ROW26 = [];
for (let r = 2; r <= 6; r++) {
  for (let c = 0; c <= 10; c += 2) SLOTS_ROW26.push([r, c]);
}
const ALL_SLOTS = [...SLOTS_ROW01, ...SLOTS_ROW26];

const CATEGORIES = [
  { mainPage: 2, overflowPage: 37, name: 'Fruit A-M' },
  { mainPage: 3, overflowPage: null, name: 'Fruit N-Z' },
  { mainPage: 4, overflowPage: 38, name: 'Vegetables A-G' },
  { mainPage: 5, overflowPage: 39, name: 'Vegetables H-Z' },
];

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  for (const cat of CATEGORIES) {
    const pages = [cat.mainPage];
    if (cat.overflowPage) pages.push(cat.overflowPage);
    const inClause = pages.join(',');

    // Get all buttons from main + overflow
    const btns = db.exec(`SELECT id, label, type, price, image, color, bg_color, parent_id,
      category_filter, alpha_range, sort_order, position, product_id, active
      FROM keyboard_buttons WHERE page IN (${inClause}) AND active = 1 ORDER BY id`);
    if (!btns.length) continue;

    const backBtns = [];
    const productBtns = [];
    for (const r of btns[0].values) {
      if (r[2] === 'back_home') backBtns.push(r);
      else if (r[1] === 'MORE >>') continue; // skip MORE links
      else productBtns.push(r);
    }

    // Sort alphabetically
    productBtns.sort((a, b) => {
      const la = String(a[1]).split('\\n')[0].toUpperCase();
      const lb = String(b[1]).split('\\n')[0].toUpperCase();
      return la.localeCompare(lb);
    });

    console.log(`${cat.name} (page ${cat.mainPage}): ${productBtns.length} products`);

    // Delete old buttons on main + overflow
    db.run(`DELETE FROM keyboard_buttons WHERE page IN (${inClause})`);
    if (cat.overflowPage) {
      db.run(`DELETE FROM keyboard_pages WHERE page = ?`, [cat.overflowPage]);
    }

    const stmt = db.prepare(`INSERT OR REPLACE INTO keyboard_buttons
      (id, label, type, price, image, color, bg_color, parent_id,
       category_filter, alpha_range, sort_order, position, page,
       grid_row, grid_col, col_span, row_span, product_id, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    // Place products as 2×1 buttons
    for (let i = 0; i < productBtns.length && i < ALL_SLOTS.length; i++) {
      const [row, col] = ALL_SLOTS[i];
      const r = productBtns[i];
      // Normalize ID to main page
      const id = r[0].replace(`pg${cat.overflowPage}-`, `pg${cat.mainPage}-`);
      stmt.run([id, r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9],
        i, 'grid', cat.mainPage, row, col, 2, 1, r[12], r[13]]);
    }

    // BACK button: 2×2 at (0, 11)
    const backId = `pg${cat.mainPage}-back`;
    stmt.run([backId, 'BACK', 'back_home', 0, null, '#fff', '#16a34a', null,
      null, null, 90, 'grid', cat.mainPage, 0, 11, 2, 2, null, 1]);

    stmt.free();

    if (productBtns.length > ALL_SLOTS.length) {
      console.log(`  WARNING: ${productBtns.length - ALL_SLOTS.length} products didn't fit!`);
    }
  }

  // Verify
  console.log('\n--- Verification ---');
  for (const pg of [2, 3, 4, 5]) {
    const btns = db.exec(`SELECT id, grid_row, grid_col, col_span, row_span FROM keyboard_buttons WHERE page = ${pg} AND active = 1`);
    if (!btns.length) continue;
    const occupied = new Set();
    let issues = 0;
    for (const [id, row, col, cs, rs] of btns[0].values) {
      for (let r = row; r < row + (rs||1); r++) {
        for (let c = col; c < col + (cs||1); c++) {
          if (occupied.has(r+','+c)) { issues++; console.log(`  OVERLAP page ${pg} at (${r},${c}): ${id}`); }
          occupied.add(r+','+c);
        }
      }
    }
    const count = btns[0].values.length;
    console.log(`Page ${pg}: ${count} btns, ${issues === 0 ? 'OK' : issues + ' ISSUES'}`);
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
