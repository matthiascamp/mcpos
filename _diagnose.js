const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(localPath));

  const total = db.exec("SELECT COUNT(*) FROM keyboard_buttons");
  console.log('Total keyboard buttons:', total[0].values[0][0]);

  const byPage = db.exec("SELECT page, COUNT(*) FROM keyboard_buttons GROUP BY page ORDER BY page");
  if (byPage.length) {
    console.log('\nButtons per page:');
    byPage[0].values.forEach(r => console.log(`  Page ${r[0]}: ${r[1]} buttons`));
  }

  const pages = db.exec("SELECT * FROM keyboard_pages ORDER BY page");
  if (pages.length) {
    console.log('\nKeyboard pages:');
    pages[0].values.forEach(r => console.log(`  Page ${r[0]}: ${r[1]} (${r[2]}x${r[3]})`));
  } else {
    console.log('\nNo keyboard_pages entries!');
  }

  const kbVer = db.exec("SELECT value FROM settings WHERE key = 'kb_version'");
  console.log('\nLocal kb_version:', kbVer.length ? kbVer[0].values[0][0] : 'NOT SET');

  // Check bundled too
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  const db2 = new SQL.Database(fs.readFileSync(bundledPath));
  const total2 = db2.exec("SELECT COUNT(*) FROM keyboard_buttons");
  console.log('\nBundled total buttons:', total2[0].values[0][0]);
  const kbVer2 = db2.exec("SELECT value FROM settings WHERE key = 'kb_version'");
  console.log('Bundled kb_version:', kbVer2.length ? kbVer2[0].values[0][0] : 'NOT SET');
}
main().catch(console.error);
