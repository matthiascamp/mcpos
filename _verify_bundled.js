const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();

  // Check bundled DB
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(bundledPath));

  const pages = db.exec(`SELECT page, COUNT(*) as cnt FROM keyboard_buttons WHERE page > 5 GROUP BY page ORDER BY page`);
  if (pages.length) {
    console.log('BUNDLED DB - Sub-pages:');
    pages[0].values.forEach(r => console.log(`  Page ${r[0]}: ${r[1]} buttons`));
  } else {
    console.log('BUNDLED DB - NO sub-page buttons found!');
  }

  const total = db.exec(`SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5`);
  console.log('Total sub-page buttons:', total[0].values[0][0]);

  const withImg = db.exec(`SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND image IS NOT NULL AND length(image) > 5`);
  console.log('With images:', withImg[0].values[0][0]);

  // Also check local DB
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db2 = new SQL.Database(fs.readFileSync(localPath));
  const total2 = db2.exec(`SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5`);
  console.log('\nLOCAL DB - Total sub-page buttons:', total2[0].values[0][0]);
}
main().catch(console.error);
