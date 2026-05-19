const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();

  for (const label of ['LOCAL', 'BUNDLED']) {
    const dbPath = label === 'LOCAL'
      ? path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite')
      : path.join(__dirname, 'db', 'crisp-pos.sqlite');
    const db = new SQL.Database(fs.readFileSync(dbPath));

    console.log(`\n=== ${label} DB ===`);

    // Check all page_link buttons and whether their target pages have buttons
    const links = db.exec(`SELECT kb.page, kb.label, kb.parent_id,
      (SELECT COUNT(*) FROM keyboard_buttons kb2 WHERE kb2.page = CAST(kb.parent_id AS INTEGER) AND kb2.active = 1) as target_count,
      (SELECT COUNT(*) FROM keyboard_pages kp WHERE kp.page = CAST(kb.parent_id AS INTEGER)) as page_exists
      FROM keyboard_buttons kb WHERE kb.type = 'page_link' ORDER BY kb.page`);

    if (links.length) {
      let broken = 0;
      for (const r of links[0].values) {
        const ok = r[3] > 0 && r[4] > 0;
        if (!ok) {
          console.log(`  BROKEN: Page ${r[0]} "${String(r[1]).replace(/\n/g,' ')}" -> page ${r[2]} (${r[3]} buttons, page_exists=${r[4]})`);
          broken++;
        }
      }
      if (broken === 0) console.log('  All page_link buttons point to valid pages');
      else console.log(`  ${broken} broken page_link buttons`);
    }

    db.close();
  }
}
main().catch(console.error);
