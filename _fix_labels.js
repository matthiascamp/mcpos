const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Strip price text from page_link labels on pages 2-5
  // Labels use literal \n (two chars: \ and n), not real newlines
  const links = db.exec(`SELECT id, page, label FROM keyboard_buttons
    WHERE page IN (2,3,4,5) AND type = 'page_link'`);

  if (links.length) {
    let fixed = 0;
    for (const r of links[0].values) {
      const oldLabel = String(r[2]);
      // Strip everything after \n that starts with $ (price info)
      const newLabel = oldLabel.replace(/\\n\$.*$/, '');
      if (newLabel !== oldLabel) {
        db.run("UPDATE keyboard_buttons SET label = ? WHERE id = ?", [newLabel, r[0]]);
        console.log(`Page ${r[1]}: "${oldLabel}" -> "${newLabel}"`);
        fixed++;
      }
    }
    console.log(`Fixed ${fixed} labels`);
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // Now re-export keyboard-subpages.js with updated version
  // (pages 2-5 aren't in the subpages module, but bump version anyway)
  // Actually we need to re-export the FULL state for pages > 5 too
  const db2 = new SQL.Database(fs.readFileSync(dbPath));

  // Verify page_link labels
  const verify = db2.exec(`SELECT page, label, price FROM keyboard_buttons
    WHERE page IN (2,3,4,5) AND type = 'page_link' ORDER BY page, grid_row, grid_col`);
  if (verify.length) {
    console.log('\nVerification - page_link buttons:');
    verify[0].values.forEach(r => console.log(`  Page ${r[0]}: "${r[1]}" price=${r[2]}`));
  }
}
main().catch(console.error);
