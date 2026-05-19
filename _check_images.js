const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const rows = db.exec(`SELECT label, image FROM keyboard_buttons
    WHERE page BETWEEN 2 AND 5 AND image IS NOT NULL AND image != ''
    ORDER BY page, grid_row, grid_col`);

  if (rows.length) {
    rows[0].values.forEach(r => {
      const label = r[0].replace(/\n/g, ' ');
      const img = r[1].substring(0, 90);
      console.log(`${label} => ${img}`);
    });
  }
}
main();
