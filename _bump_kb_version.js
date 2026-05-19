const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const version = '2026-05-17b';

  for (const label of ['LOCAL', 'BUNDLED']) {
    const dbPath = label === 'LOCAL'
      ? path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite')
      : path.join(__dirname, 'db', 'crisp-pos.sqlite');
    const db = new SQL.Database(fs.readFileSync(dbPath));
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_version', ?)", [version]);
    fs.writeFileSync(dbPath, Buffer.from(db.export()));
    console.log(`${label} kb_version set to ${version}`);
    db.close();
  }
}
main().catch(console.error);
