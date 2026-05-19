const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const pxl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`;

const groceryImages = {
  'p-kb-pg6-chips':        479628,   // crispy wavy potato chips on white
  'p-kb-pg6-pies':         7368042,  // homemade meat pie with herbs
  'p-kb-pg6-water':        2479095,  // three clear water bottles
  'p-kb-pg6-salmon':       3296417,  // fresh salmon fillet
  'p-kb-pg6-salmon-fillet': 676560,  // grilled salmon on white plate
  'p-kb-pg6-fresh-juice':  26791690, // glass bottle of orange juice on white
  'p-kb-pg6-juice-1l':     26791698, // orange juice bottle on white surface
  'p-kb-pg6-lemon-juice':  1367232,  // lemons on white (for lemon juice)
  'p-kb-pg6-spices':       11882648, // four glass jars of spices
  'p-kb-pg6-pickles':      8599633,  // glass jar pickled cucumbers on white
  'p-kb-pg6-alt-milk':     4187717,  // glass of oat milk
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  let updated = 0;
  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ? WHERE product_id = ?");

  for (const [productId, photoId] of Object.entries(groceryImages)) {
    const url = pxl(photoId);
    stmt.run([url, productId]);
    const changes = db.getRowsModified();
    updated += changes;
    if (changes === 0) console.log('  Not found:', productId);
  }
  stmt.free();

  console.log(`Updated ${updated} grocery buttons`);

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // Verify
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const check = db2.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page = 6 AND image IS NOT NULL AND length(image) > 10");
  console.log('Page 6 buttons with images:', check[0].values[0][0]);

  // Full summary
  const total = db2.exec(`SELECT
    SUM(CASE WHEN page BETWEEN 2 AND 5 THEN 1 ELSE 0 END) as main_total,
    SUM(CASE WHEN page BETWEEN 2 AND 5 AND image IS NOT NULL AND length(image) > 5 THEN 1 ELSE 0 END) as main_img,
    SUM(CASE WHEN page > 5 THEN 1 ELSE 0 END) as sub_total,
    SUM(CASE WHEN page > 5 AND image IS NOT NULL AND length(image) > 5 THEN 1 ELSE 0 END) as sub_img
    FROM keyboard_buttons`);
  const v = total[0].values[0];
  console.log(`Main pages (2-5): ${v[1]}/${v[0]} have images`);
  console.log(`Sub-pages (6-36): ${v[3]}/${v[2]} have images`);
}

main().catch(console.error);
