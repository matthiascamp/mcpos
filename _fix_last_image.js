const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Fix remaining coles URL
  db.run("UPDATE keyboard_buttons SET image = ? WHERE id = ?",
    ['https://cdn0.woolworths.media/content/wowproductimages/large/148257.jpg', 'pg36-btn0']);

  // Check for any remaining non-woolworths images on pages > 1
  const remaining = db.exec("SELECT id, image FROM keyboard_buttons WHERE page > 1 AND active = 1 AND image IS NOT NULL AND image NOT LIKE '%woolworths%'");
  if (remaining.length && remaining[0].values.length) {
    console.log('Still non-Woolworths:');
    for (const [id, img] of remaining[0].values) console.log('  ' + id + ': ' + img.substring(0, 60));
  } else {
    console.log('All images are now Woolworths CDN');
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
  }
  console.log('DB updated');
  db.close();
}
main().catch(console.error);
