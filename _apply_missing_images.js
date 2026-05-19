const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const pxl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`;

const missingImages = {
  'plu-4031':   220911,    // Red apple bucket
  'plu-40026':  6344943,   // Granny smith bucket
  'plu-40024':  2238309,   // Cavendish bucket
  'plu-40022':  2238316,   // Ladyfinger bucket (different banana shot)
  'plu-40049':  29286844,  // Mandarines green bucket
  'plu-8717':   18979311,  // Outside rockmelon
  'plu-4716':   5945779,   // Outside honeydew
  'plu-4425':   18398732,  // Nectarines bucket
  'plu-83417':  13203513,  // Blood orange bucket
  'plu-5013':   2255965,   // Peach bucket
  'plu-40023':  10039792,  // Pear bucket
  'plu-44251':  14378615,  // Plums in bucket
  'plu-3681':   4187617,   // Butternut from outside
  'plu-2721':   34200021,  // Jap from outside
  'plu-91321':  14145335,  // Jarra from outside
  'plu-1882':   2889366,   // Gold sweet potato outside
  'plu-67337':  30893265,  // Zucchini bucket
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  let updated = 0;
  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ? WHERE product_id = ?");

  for (const [productId, photoId] of Object.entries(missingImages)) {
    const url = pxl(photoId);
    stmt.run([url, productId]);
    const changes = db.getRowsModified();
    updated += changes;
    if (changes === 0) console.log('  Not found:', productId);
  }
  stmt.free();

  console.log(`Updated ${updated} buttons with images`);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // Verify - count remaining without images
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const remaining = db2.exec(`SELECT COUNT(*) FROM keyboard_buttons
    WHERE page > 5 AND (image IS NULL OR length(image) < 5) AND type != 'back_home'`);
  console.log('Buttons still without images:', remaining[0].values[0][0]);

  const total = db2.exec(`SELECT COUNT(*) FROM keyboard_buttons
    WHERE page > 5 AND image IS NOT NULL AND length(image) > 5 AND type != 'back_home'`);
  console.log('Total buttons with images:', total[0].values[0][0]);
}

main().catch(console.error);
