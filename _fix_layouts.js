const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// 13x7 grid, 2x2 buttons:
// Row 0-1: 5 slots (cols 0,2,4,6,8) + BACK at (0,11)
// Row 2-3: 6 slots (cols 0,2,4,6,8,10)
// Row 4-5: 6 slots (cols 0,2,4,6,8,10)
// = 17 product slots max per page
// With a MORE>> link, that's 16 products + MORE + BACK

const PRODUCT_SLOTS = [
  [0, 0], [0, 2], [0, 4], [0, 6], [0, 8],
  [2, 0], [2, 2], [2, 4], [2, 6], [2, 8], [2, 10],
  [4, 0], [4, 2], [4, 4], [4, 6], [4, 8], [4, 10],
];
const BACK_POS = [0, 11];
const MAX_PER_PAGE = PRODUCT_SLOTS.length; // 17

const OVERFLOW_PAGES = {
  2: { overflowPage: 37, name: 'Fruit A-M (more)' },
  4: { overflowPage: 38, name: 'Vegetables A-G (more)' },
  5: { overflowPage: 39, name: 'Vegetables H-Z (more)' },
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  for (const [pageStr, cfg] of Object.entries(OVERFLOW_PAGES)) {
    const page = Number(pageStr);
    const btns = db.exec(
      `SELECT id, label, type, price, image, color, bg_color, parent_id,
              category_filter, alpha_range, sort_order, position, product_id, active
       FROM keyboard_buttons WHERE page = ? AND active = 1 ORDER BY id`, [page]);
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

    const needsOverflow = productBtns.length > MAX_PER_PAGE;
    const mainLimit = needsOverflow ? MAX_PER_PAGE - 1 : MAX_PER_PAGE; // leave 1 slot for MORE>>
    const mainBtns = productBtns.slice(0, mainLimit);
    const overflowBtns = productBtns.slice(mainLimit);

    console.log(`\nPage ${page}: ${productBtns.length} products, ${needsOverflow ? 'OVERFLOW ' + overflowBtns.length + ' -> page ' + cfg.overflowPage : 'fits'}`);

    // Delete all buttons on this page, we'll re-insert
    db.run("DELETE FROM keyboard_buttons WHERE page = ?", [page]);

    // Place main page buttons
    const stmt = db.prepare(`INSERT OR REPLACE INTO keyboard_buttons
      (id, label, type, price, image, color, bg_color, parent_id,
       category_filter, alpha_range, sort_order, position, page,
       grid_row, grid_col, col_span, row_span, product_id, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (let i = 0; i < mainBtns.length && i < PRODUCT_SLOTS.length; i++) {
      const [row, col] = PRODUCT_SLOTS[i];
      const r = mainBtns[i];
      stmt.run([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], i, 'grid', page, row, col, 2, 2, r[12], r[13]]);
    }

    // BACK button
    if (backBtns.length) {
      const b = backBtns[0];
      stmt.run([b[0], 'BACK', 'back_home', 0, null, '#fff', '#16a34a', null, null, null, 90, 'grid', page, BACK_POS[0], BACK_POS[1], 2, 2, null, 1]);
    }

    // MORE>> button if needed
    if (needsOverflow) {
      const moreSlot = PRODUCT_SLOTS[mainLimit]; // next slot after last product
      stmt.run([
        `pg${page}-more`, 'MORE >>', 'page_link', 0, null,
        '#fff', '#2563eb', String(cfg.overflowPage), null, null, 89, 'grid',
        page, moreSlot[0], moreSlot[1], 2, 2, null, 1
      ]);
      console.log(`  Added MORE >> at slot ${mainLimit} -> page ${cfg.overflowPage}`);
    }

    // Create overflow page if needed
    if (needsOverflow && overflowBtns.length) {
      // Create/update page record
      db.run("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,13,7)",
        [cfg.overflowPage, cfg.name]);
      // Delete existing overflow buttons
      db.run("DELETE FROM keyboard_buttons WHERE page = ?", [cfg.overflowPage]);

      for (let i = 0; i < overflowBtns.length && i < PRODUCT_SLOTS.length; i++) {
        const [row, col] = PRODUCT_SLOTS[i];
        const r = overflowBtns[i];
        stmt.run([
          r[0].replace(`pg${page}-`, `pg${cfg.overflowPage}-`).replace(`pg${page}-`, `pg${cfg.overflowPage}-`),
          r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9],
          i, 'grid', cfg.overflowPage, row, col, 2, 2, r[12], r[13]
        ]);
      }

      // BACK button on overflow page (goes back to parent page, not home)
      stmt.run([
        `pg${cfg.overflowPage}-back`, 'BACK', 'back_home', 0, null,
        '#fff', '#16a34a', null, null, null, 90, 'grid',
        cfg.overflowPage, BACK_POS[0], BACK_POS[1], 2, 2, null, 1
      ]);

      console.log(`  Created overflow page ${cfg.overflowPage} with ${overflowBtns.length} products`);
      for (const r of overflowBtns) {
        console.log(`    ${String(r[1]).split('\\n')[0]}`);
      }
    }

    stmt.free();
  }

  // Also fix page 3 — no overflow needed but make sure all buttons are 2x2
  {
    const btns = db.exec(
      `SELECT id FROM keyboard_buttons WHERE page = 3 AND active = 1 AND (col_span != 2 OR row_span != 2)`, []);
    if (btns.length && btns[0].values.length) {
      console.log(`\nPage 3: fixing ${btns[0].values.length} buttons to 2x2`);
      db.run("UPDATE keyboard_buttons SET col_span = 2, row_span = 2 WHERE page = 3 AND active = 1");
    }
  }

  // Verify all pages
  console.log('\n--- Verification ---');
  const allPages = db.exec("SELECT DISTINCT page FROM keyboard_buttons WHERE page >= 2 AND active = 1 ORDER BY page");
  for (const [pg] of allPages[0].values) {
    const pageMeta = db.exec('SELECT cols, rows FROM keyboard_pages WHERE page = ?', [pg]);
    const maxCols = pageMeta.length ? pageMeta[0].values[0][0] : 13;
    const maxRows = pageMeta.length ? pageMeta[0].values[0][1] : 7;
    const btns = db.exec('SELECT id, grid_row, grid_col, col_span, row_span FROM keyboard_buttons WHERE page = ? AND active = 1', [pg]);
    if (!btns.length) continue;
    const occupied = new Set();
    let issues = 0;
    for (const [id, row, col, cs, rs] of btns[0].values) {
      if (col + (cs||1) > maxCols || row + (rs||1) > maxRows) { issues++; continue; }
      for (let r = row; r < row + (rs||1); r++) {
        for (let c = col; c < col + (cs||1); c++) {
          if (occupied.has(r+','+c)) issues++;
          occupied.add(r+','+c);
        }
      }
    }
    console.log(`Page ${pg}: ${btns[0].values.length} btns, ${issues === 0 ? 'OK' : issues + ' ISSUES'}`);
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('\nBundled DB also updated');
  }
}

main().catch(console.error);
