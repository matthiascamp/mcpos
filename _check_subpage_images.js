const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const r1 = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND active = 1 AND image LIKE '%woolworths%'");
  const r2 = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND active = 1 AND image LIKE '%pngimg%'");
  const r3 = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND active = 1 AND image LIKE '%coles%'");
  const r4 = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND active = 1 AND image IS NOT NULL");
  console.log('Woolworths:', r1[0].values[0][0]);
  console.log('pngimg:', r2[0].values[0][0]);
  console.log('coles:', r3[0].values[0][0]);
  console.log('Total with image:', r4[0].values[0][0]);
  db.close();
}
main().catch(console.error);
