const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'crisp-pos', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  console.log('=== KEYBOARD BUTTONS WITH CATEGORY FILTERS ===');
  const r = db.exec("SELECT id, label, type, category_filter FROM keyboard_buttons WHERE category_filter IS NOT NULL AND category_filter != '' ORDER BY label");
  if (r.length) r[0].values.forEach(v => console.log(v[1], '|type:' + v[2], '|cat:' + v[3]));

  console.log('\n=== DUPLICATE CATEGORY NAMES ===');
  const dupes = db.exec("SELECT name, COUNT(*) as cnt FROM categories GROUP BY name HAVING cnt > 1");
  if (dupes.length) dupes[0].values.forEach(v => console.log(v[0], 'x' + v[1]));

  console.log('\n=== PRODUCT COUNT PER CATEGORY ===');
  const counts = db.exec("SELECT c.name, COUNT(p.id) as cnt FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.active = 1 WHERE c.active = 1 GROUP BY c.id ORDER BY cnt DESC");
  if (counts.length) counts[0].values.forEach(v => console.log(v[0] + ': ' + v[1]));

  db.close();
})();
