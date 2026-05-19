const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));
  const rows = db.exec(`SELECT page, label, product_id FROM keyboard_buttons
    WHERE page > 5 AND (image IS NULL OR length(image) < 5) AND type != 'back_home'
    ORDER BY page, grid_row, grid_col`);
  if (rows.length) {
    rows[0].values.forEach(r => {
      console.log(`pg${r[0]}: ${String(r[1]).replace(/\n/g,' ')} [${r[2]}]`);
    });
    console.log(`\nTotal missing: ${rows[0].values.length}`);
  } else {
    console.log('All buttons have images!');
  }
}
main().catch(console.error);
