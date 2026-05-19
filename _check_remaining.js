const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  // Buttons WITHOUT images on pages 6+
  const rows = db.exec(`SELECT page, label, type, product_id FROM keyboard_buttons
    WHERE page > 5 AND (image IS NULL OR length(image) < 5)
    ORDER BY page, grid_row, grid_col`);

  if (rows.length) {
    console.log('Buttons still without images:');
    rows[0].values.forEach(r => {
      const label = String(r[1]).split('\n')[0];
      console.log(`  Page ${r[0]}: ${label} (${r[2]}) [${r[3] || 'no product_id'}]`);
    });
    console.log(`\nTotal without images: ${rows[0].values.length}`);
  }

  // Per-page summary
  const summary = db.exec(`SELECT page, COUNT(*) as total,
    SUM(CASE WHEN image IS NOT NULL AND length(image) > 5 THEN 1 ELSE 0 END) as with_img
    FROM keyboard_buttons WHERE page > 5 GROUP BY page ORDER BY page`);
  console.log('\nPer-page summary:');
  summary[0].values.forEach(r => console.log(`  Page ${r[0]}: ${r[2]}/${r[1]} have images`));
}

main();
