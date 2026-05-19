const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // 1. Remove "Vegetable Menu" and "Fruit Menu" and "NEXT KEYBOARD" and "<BACK KEYBOARD"
  //    page_link buttons from pages 2-5 (not page 1)
  const navButtons = db.exec(`SELECT id, page, label, type FROM keyboard_buttons
    WHERE page IN (2,3,4,5) AND type = 'page_link'
    AND (label LIKE '%Vegetable%Menu%' OR label LIKE '%FRUIT%MENU%'
         OR label LIKE '%NEXT%KEYBOARD%' OR label LIKE '%BACK%KEYBOARD%')`);

  if (navButtons.length) {
    console.log('Removing nav buttons from category pages:');
    for (const r of navButtons[0].values) {
      console.log(`  Page ${r[1]}: "${String(r[2]).replace(/\n/g, ' ')}" (${r[3]})`);
      db.run("DELETE FROM keyboard_buttons WHERE id = ?", [r[0]]);
    }
    console.log(`Removed ${navButtons[0].values.length} buttons`);
  }

  // 2. Remove prices from page_link buttons on pages 2-5 (category links like "AVOCADOS $2.50 ea")
  const priceLinks = db.exec(`SELECT id, page, label, price FROM keyboard_buttons
    WHERE page IN (2,3,4,5) AND type = 'page_link' AND price > 0`);

  if (priceLinks.length) {
    console.log('\nRemoving prices from category page_link buttons:');
    for (const r of priceLinks[0].values) {
      const oldLabel = String(r[2]);
      // Strip price line from label (e.g. "AVOCADOS\n$2.50 ea" -> "AVOCADOS")
      const newLabel = oldLabel.replace(/\n\$[\d.]+.*$/, '');
      console.log(`  Page ${r[1]}: "${oldLabel.replace(/\n/g, ' ')}" -> "${newLabel}" (was $${r[3]})`);
      db.run("UPDATE keyboard_buttons SET price = 0, label = ? WHERE id = ?", [newLabel, r[0]]);
    }
    console.log(`Fixed ${priceLinks[0].values.length} buttons`);
  }

  // Also check for labels that have price text but price column is 0
  const labelPrices = db.exec(`SELECT id, page, label FROM keyboard_buttons
    WHERE page IN (2,3,4,5) AND type = 'page_link' AND label LIKE '%$%'`);

  if (labelPrices.length) {
    console.log('\nStripping price text from category labels:');
    for (const r of labelPrices[0].values) {
      const oldLabel = String(r[2]);
      const newLabel = oldLabel.replace(/\n\$[\d.]+.*$/, '');
      if (newLabel !== oldLabel) {
        console.log(`  Page ${r[1]}: "${oldLabel.replace(/\n/g, ' ')}" -> "${newLabel}"`);
        db.run("UPDATE keyboard_buttons SET label = ? WHERE id = ?", [newLabel, r[0]]);
      }
    }
  }

  // Now re-layout pages 2-5 since we removed buttons (fill gaps)
  for (let page = 2; page <= 5; page++) {
    const buttons = db.exec(`SELECT id, label, type FROM keyboard_buttons
      WHERE page = ${page} AND active = 1 ORDER BY grid_row, grid_col`);
    if (!buttons.length) continue;

    const backBtns = [];
    const productBtns = [];

    for (const row of buttons[0].values) {
      if (row[2] === 'back_home') backBtns.push(row[0]);
      else productBtns.push({ id: row[0], label: row[1], type: row[2] });
    }

    // Re-layout: 2x2 buttons, BACK top-right, alphabetical
    const BACK_ROW = 0, BACK_COL = 11;
    const productSlots = [
      [0, 0], [0, 2], [0, 4], [0, 6], [0, 8],
      [2, 0], [2, 2], [2, 4], [2, 6], [2, 8], [2, 10],
      [4, 0], [4, 2], [4, 4], [4, 6], [4, 8], [4, 10],
    ];

    // Sort alphabetically
    productBtns.sort((a, b) => {
      const la = String(a.label).split('\n')[0].toUpperCase();
      const lb = String(b.label).split('\n')[0].toUpperCase();
      return la.localeCompare(lb);
    });

    for (const id of backBtns) {
      db.run("UPDATE keyboard_buttons SET grid_row=?, grid_col=?, col_span=2, row_span=2 WHERE id=?",
        [BACK_ROW, BACK_COL, id]);
    }

    for (let i = 0; i < productBtns.length && i < productSlots.length; i++) {
      const [r, c] = productSlots[i];
      db.run("UPDATE keyboard_buttons SET grid_row=?, grid_col=?, col_span=2, row_span=2 WHERE id=?",
        [r, c, productBtns[i].id]);
    }

    console.log(`\nPage ${page}: re-laid out ${productBtns.length} buttons`);
  }

  // Verify
  console.log('\n--- Verification ---');
  for (let page = 2; page <= 5; page++) {
    const btns = db.exec(`SELECT label, type, price FROM keyboard_buttons
      WHERE page = ${page} AND active = 1 ORDER BY grid_row, grid_col`);
    if (!btns.length) continue;
    console.log(`Page ${page}:`);
    for (const r of btns[0].values) {
      const lbl = String(r[0]).replace(/\n/g, ' ');
      console.log(`  ${lbl} (${r[1]}, price=${r[2]})`);
    }
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
