const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();

  for (const label of ['LOCAL', 'BUNDLED']) {
    const dbPath = label === 'LOCAL'
      ? path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite')
      : path.join(__dirname, 'db', 'crisp-pos.sqlite');
    const db = new SQL.Database(fs.readFileSync(dbPath));

    // Pages that don't have sub-pages — convert their page_link buttons to open_price
    const brokenPages = [6, 8, 23, 24, 25, 26, 27, 28, 35];

    let fixed = 0;
    for (const targetPage of brokenPages) {
      const result = db.exec(`SELECT id, label FROM keyboard_buttons WHERE type = 'page_link' AND parent_id = '${targetPage}'`);
      if (result.length) {
        for (const row of result[0].values) {
          db.run("UPDATE keyboard_buttons SET type = 'open_price', parent_id = NULL WHERE id = ?1", [row[0]]);
          console.log(`  ${label}: Fixed "${String(row[1]).replace(/\n/g, ' ')}" (was page_link to page ${targetPage} -> now open_price)`);
          fixed++;
        }
      }
    }

    // Also remove the GROCERY page_link on page 1 (page 6 doesn't exist)
    // Convert to open_price so the button still works

    console.log(`${label}: Fixed ${fixed} broken page_link buttons`);
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
    db.close();
  }
}
main().catch(console.error);
