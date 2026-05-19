const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Reset version to simulate fresh install
  db.run("DELETE FROM settings WHERE key IN ('kb_subpages_ver', 'kb_version')");
  // Delete sub-page buttons to simulate empty state
  db.run("DELETE FROM keyboard_buttons WHERE page > 5");
  db.run("DELETE FROM keyboard_pages WHERE page > 5");

  const check = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5");
  console.log('Sub-page buttons after reset:', check[0].values[0][0]);

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  console.log('Local DB reset — sub-pages wiped');

  // Now test the apply function
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const kbSubpages = require('./db/keyboard-subpages');
  const applied = kbSubpages.apply(db2);
  console.log(`apply() returned: ${applied} buttons`);

  const check2 = db2.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5");
  console.log('Sub-page buttons after apply:', check2[0].values[0][0]);

  const pages = db2.exec("SELECT page, name FROM keyboard_pages WHERE page > 5 ORDER BY page");
  if (pages.length) console.log('Pages:', pages[0].values.map(r => `${r[0]}:${r[1]}`).join(', '));

  // Save the applied state
  fs.writeFileSync(dbPath, Buffer.from(db2.export()));
  console.log('Saved');
}
main().catch(console.error);
