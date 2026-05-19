const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();

  // Simulate what happens at the shop: local DB without kb_version
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(localPath));

  // Reset kb_version to simulate shop state
  db.run("DELETE FROM settings WHERE key = 'kb_version'");

  // Check table schema
  const schema = db.exec("PRAGMA table_info(keyboard_buttons)");
  console.log('keyboard_buttons columns:');
  schema[0].values.forEach(r => console.log(`  ${r[1]} ${r[2]} ${r[3] ? 'NOT NULL' : 'nullable'} default=${r[4]}`));

  // Now simulate the merge
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  const bundledDb = new SQL.Database(fs.readFileSync(bundledPath));

  const bundledKbVersion = bundledDb.exec("SELECT value FROM settings WHERE key = 'kb_version'");
  const bundledKbVer = bundledKbVersion.length && bundledKbVersion[0].values.length ? bundledKbVersion[0].values[0][0] : '0';
  const localKbVersion = db.exec("SELECT value FROM settings WHERE key = 'kb_version'");
  const localKbVer = localKbVersion.length && localKbVersion[0].values.length ? localKbVersion[0].values[0][0] : '0';

  console.log(`\nbundledKbVer: "${bundledKbVer}", localKbVer: "${localKbVer}"`);
  console.log(`bundledKbVer > localKbVer: ${bundledKbVer > localKbVer}`);

  if (bundledKbVer > localKbVer) {
    console.log('Merge would trigger!');
    db.run("DELETE FROM keyboard_buttons WHERE page > 5");
    db.run("DELETE FROM keyboard_pages WHERE page > 5");

    const bPages = bundledDb.exec("SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5");
    console.log(`Bundled pages > 5: ${bPages.length ? bPages[0].values.length : 0}`);
    if (bPages.length) {
      for (const row of bPages[0].values) {
        try {
          db.run("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?1,?2,?3,?4)", row);
        } catch (e) {
          console.log(`  FAILED inserting page ${row[0]}: ${e.message}`);
        }
      }
    }

    const bButtons = bundledDb.exec("SELECT id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active FROM keyboard_buttons WHERE page > 5");
    console.log(`Bundled buttons > 5: ${bButtons.length ? bButtons[0].values.length : 0}`);
    let kbMerged = 0;
    let kbFailed = 0;
    if (bButtons.length) {
      for (const row of bButtons[0].values) {
        try {
          db.run("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)", row);
          kbMerged++;
        } catch (e) {
          kbFailed++;
          if (kbFailed <= 3) console.log(`  FAILED: ${row[0]} - ${e.message}`);
        }
      }
    }
    console.log(`\nMerge result: ${kbMerged} succeeded, ${kbFailed} failed`);

    // Verify
    const check = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5");
    console.log(`Buttons on pages > 5 after merge: ${check[0].values[0][0]}`);
  } else {
    console.log('Merge would NOT trigger');
  }
}
main().catch(console.error);
