const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const version = '2026-05-17';

  // Set in bundled DB
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(bundledPath));
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_version', ?)", [version]);
  fs.writeFileSync(bundledPath, Buffer.from(db.export()));
  console.log('Bundled DB kb_version set to', version);

  // Set in local DB too (so it won't re-apply on this machine)
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db2 = new SQL.Database(fs.readFileSync(localPath));
  db2.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_version', ?)", [version]);
  fs.writeFileSync(localPath, Buffer.from(db2.export()));
  console.log('Local DB kb_version set to', version);
}
main().catch(console.error);
