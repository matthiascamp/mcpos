const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  console.log('DB path:', dbPath);
  console.log('File exists:', fs.existsSync(dbPath));

  const buf = fs.readFileSync(dbPath);
  console.log('File size:', buf.length);
  const db = new SQL.Database(buf);

  // Check before
  let before = db.exec("SELECT image FROM keyboard_buttons WHERE id = 'pg7-pink-lady'");
  console.log('Before update:', before[0].values[0][0]);

  // Try update
  db.run("UPDATE keyboard_buttons SET image = 'https://test.com/test.jpg' WHERE id = 'pg7-pink-lady'");

  // Check after (in memory)
  let after = db.exec("SELECT image FROM keyboard_buttons WHERE id = 'pg7-pink-lady'");
  console.log('After update (in memory):', after[0].values[0][0]);

  // Export and save
  const data = db.export();
  const outBuf = Buffer.from(data);
  console.log('Export size:', outBuf.length);
  fs.writeFileSync(dbPath, outBuf);
  console.log('Written to disk');

  // Re-read and verify
  const buf2 = fs.readFileSync(dbPath);
  const db2 = new SQL.Database(buf2);
  let verify = db2.exec("SELECT image FROM keyboard_buttons WHERE id = 'pg7-pink-lady'");
  console.log('After re-read:', verify[0].values[0][0]);
}

main().catch(console.error);
