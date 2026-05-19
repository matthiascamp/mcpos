const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(localPath));

  const dr = db.exec("SELECT table_name, record_id FROM deleted_records WHERE table_name = 'keyboard_buttons'");
  if (dr.length) {
    console.log('Deleted keyboard_buttons records:', dr[0].values.length);
    dr[0].values.slice(0, 20).forEach(r => console.log(`  ${r[1]}`));
    if (dr[0].values.length > 20) console.log(`  ... and ${dr[0].values.length - 20} more`);
  } else {
    console.log('No deleted keyboard_buttons records');
  }

  // Check settings
  for (const key of ['pages_expanded_v4', 'layout_v5_fix', 'kb_version']) {
    const r = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
    console.log(`${key}: ${r.length ? r[0].values[0][0] : 'NOT SET'}`);
  }
}
main().catch(console.error);
