const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const W = 'https://cdn0.woolworths.media/content/wowproductimages/large/';
const fixes = {
  'pg17-btn4': W + '114835.jpg',  // Outside Honeydew → Honeydew melon
  'pg18-btn2': W + '143494.jpg',  // Nectarines Green Bucket → Yellow Nectarine
  'pg32-btn4': W + '135463.jpg',  // Washed Potatoes Red → Potato
  'pg34-btn3': W + '329965.jpg',  // Gold KG from outside → Gold Sweet Potato
  'pg36-btn1': W + '148257.jpg',  // Zucchini Bucket → Zucchini
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  for (const [id, url] of Object.entries(fixes)) {
    db.run("UPDATE keyboard_buttons SET image = ? WHERE id = ?", [url, id]);
    console.log('Fixed: ' + id);
  }

  const remaining = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 1 AND active = 1 AND image IS NOT NULL AND image NOT LIKE '%woolworths%'");
  console.log('Non-Woolworths remaining: ' + remaining[0].values[0][0]);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) fs.writeFileSync(bundledPath, Buffer.from(data));
  console.log('Done');
  db.close();
}
main().catch(console.error);
