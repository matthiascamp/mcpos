const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const origSize = buf.length;
  console.log('Original file size:', origSize);

  const db = new SQL.Database(buf);

  // Check initial state
  let check = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE image IS NOT NULL AND length(image) > 5 AND page = 7");
  console.log('Page 7 with images before:', check[0].values[0][0]);

  // Do a single update
  const url = 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400';
  db.run("UPDATE keyboard_buttons SET image = ? WHERE product_id = ?", [url, 'p-kb-pg7-pink-lady']);

  // Verify in memory
  check = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE image IS NOT NULL AND length(image) > 5 AND page = 7");
  console.log('Page 7 with images after run:', check[0].values[0][0]);

  // Export
  const exported = db.export();
  const exportedBuf = Buffer.from(exported);
  console.log('Exported size:', exportedBuf.length);
  console.log('Buffers differ:', !buf.equals(exportedBuf));

  // Write
  fs.writeFileSync(dbPath, exportedBuf);

  // Re-read fresh
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  check = db2.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE image IS NOT NULL AND length(image) > 5 AND page = 7");
  console.log('Page 7 with images after re-read:', check[0].values[0][0]);

  // Show the actual value
  const val = db2.exec("SELECT image FROM keyboard_buttons WHERE product_id = 'p-kb-pg7-pink-lady'");
  console.log('Pink Lady image:', val[0].values[0][0] ? String(val[0].values[0][0]).substring(0, 50) : 'NULL');
}

main().catch(console.error);
