const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const localPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(localPath));

  // Check page_link buttons on pages 2-5
  const links = db.exec(`SELECT page, label, parent_id, type, active FROM keyboard_buttons
    WHERE type = 'page_link' ORDER BY page, grid_row, grid_col`);
  if (links.length) {
    console.log('Page link buttons:');
    links[0].values.forEach(r => console.log(`  Page ${r[0]}: "${String(r[1]).replace(/\n/g,' ')}" -> page ${r[2]} (active=${r[4]})`));
  }

  // Check what pages exist
  console.log('\nExisting keyboard_pages:');
  const pages = db.exec("SELECT page, name FROM keyboard_pages ORDER BY page");
  if (pages.length) pages[0].values.forEach(r => console.log(`  ${r[0]}: ${r[1]}`));

  // Check page 1 buttons
  const p1 = db.exec("SELECT label, type, active FROM keyboard_buttons WHERE page = 1 ORDER BY grid_row, grid_col");
  console.log('\nPage 1 buttons:', p1.length ? p1[0].values.length : 0);

  // Check page 2 buttons
  const p2 = db.exec("SELECT label, type, parent_id, active FROM keyboard_buttons WHERE page = 2 ORDER BY grid_row, grid_col");
  console.log('\nPage 2 buttons:');
  if (p2.length) p2[0].values.forEach(r => console.log(`  "${String(r[0]).replace(/\n/g,' ')}" type=${r[1]} parent=${r[2]} active=${r[3]}`));

  // Check if any back_home buttons exist
  const backs = db.exec("SELECT page, label FROM keyboard_buttons WHERE type = 'back_home'");
  console.log('\nBack buttons:', backs.length ? backs[0].values.length : 0);

  // Check for page 6 - was it deleted?
  const p6 = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page = 6");
  console.log('Page 6 buttons:', p6[0].values[0][0]);
  const p6page = db.exec("SELECT * FROM keyboard_pages WHERE page = 6");
  console.log('Page 6 in keyboard_pages:', p6page.length ? 'yes' : 'no');
}
main().catch(console.error);
