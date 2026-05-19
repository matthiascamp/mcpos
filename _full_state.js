const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(localPath));

  const byPage = db.exec("SELECT page, COUNT(*), SUM(CASE WHEN active=1 THEN 1 ELSE 0 END) as act FROM keyboard_buttons GROUP BY page ORDER BY page");
  console.log('Buttons per page (total / active):');
  if (byPage.length) byPage[0].values.forEach(r => console.log(`  Page ${r[0]}: ${r[1]} total, ${r[2]} active`));

  const total = db.exec("SELECT COUNT(*) FROM keyboard_buttons");
  console.log(`\nTotal: ${total[0].values[0][0]}`);

  // Check if any buttons on page 1 reference missing products
  const p1Missing = db.exec(`SELECT kb.label, kb.type, kb.product_id
    FROM keyboard_buttons kb
    WHERE kb.page = 1 AND kb.product_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = kb.product_id)`);
  if (p1Missing.length) {
    console.log('\nPage 1 buttons with missing products:');
    p1Missing[0].values.forEach(r => console.log(`  "${String(r[0]).replace(/\n/g,' ')}" type=${r[1]} product=${r[2]}`));
  }
}
main().catch(console.error);
