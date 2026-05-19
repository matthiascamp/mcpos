const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  const rows = db.exec(`SELECT page, COUNT(*) as total,
    SUM(CASE WHEN image IS NOT NULL AND length(image) > 0 THEN 1 ELSE 0 END) as with_img
    FROM keyboard_buttons WHERE page > 1 GROUP BY page ORDER BY page`);

  if (rows.length) {
    console.log('Page | Total | With Img');
    rows[0].values.forEach(r => console.log('  ' + r.join(' | ')));
  }

  // Summary
  const summary = db.exec(`SELECT
    COUNT(*) as total,
    SUM(CASE WHEN image IS NOT NULL AND length(image) > 0 THEN 1 ELSE 0 END) as with_img
    FROM keyboard_buttons WHERE page > 5`);
  console.log('\nPages 6-36 summary:', summary[0].values[0][1], 'of', summary[0].values[0][0], 'buttons have images');
}

main();
