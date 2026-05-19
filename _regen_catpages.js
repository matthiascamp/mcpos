const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const COLS = ['id','label','type','price','image','color','bg_color','parent_id','category_filter','alpha_range','sort_order','position','page','grid_row','grid_col','col_span','row_span','product_id','active'];

function buildModule(version, settingsKey, pageFilter, deleteFilter, pages, btns) {
  const lines = [];
  lines.push('// Auto-generated keyboard data, do not edit manually');
  lines.push('const VERSION = "' + version + '"');
  lines.push('');

  lines.push('const pages = [');
  for (const r of pages[0].values) {
    lines.push('  ' + JSON.stringify({page: r[0], name: r[1], cols: r[2], rows: r[3]}) + ',');
  }
  lines.push(']');
  lines.push('');

  lines.push('const buttons = [');
  for (const r of btns[0].values) {
    const obj = {};
    for (let i = 0; i < COLS.length; i++) obj[COLS[i]] = r[i];
    lines.push('  ' + JSON.stringify(obj) + ',');
  }
  lines.push(']');
  lines.push('');

  lines.push('function apply(db) {');
  lines.push("  const cur = db.exec(\"SELECT value FROM settings WHERE key = '" + settingsKey + "'\");");
  lines.push('  const ver = cur.length ? cur[0].values[0][0] : null;');
  lines.push('  if (ver >= VERSION) return 0;');
  lines.push('  for (const p of pages) {');
  lines.push('    db.run("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)",');
  lines.push('      [p.page, p.name, p.cols, p.rows]);');
  lines.push('  }');
  lines.push('  db.run("DELETE FROM keyboard_buttons WHERE ' + deleteFilter + '");');
  lines.push('  const stmt = db.prepare("INSERT INTO keyboard_buttons (' + COLS.join(',') + ') VALUES (' + COLS.map(() => '?').join(',') + ')");');
  lines.push('  for (const b of buttons) {');
  lines.push('    stmt.run([' + COLS.map(c => 'b.' + c).join(',') + ']);');
  lines.push('  }');
  lines.push('  stmt.free();');
  lines.push("  db.run(\"INSERT OR REPLACE INTO settings (key, value) VALUES ('" + settingsKey + "', ?)\", [VERSION]);");
  lines.push('  return buttons.length;');
  lines.push('}');
  lines.push('');
  lines.push('module.exports = { VERSION, pages, buttons, apply };');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  // Catpages (2-5)
  const catPages = db.exec('SELECT page, name, cols, rows FROM keyboard_pages WHERE page BETWEEN 2 AND 5 ORDER BY page');
  const catBtns = db.exec('SELECT ' + COLS.join(',') + ' FROM keyboard_buttons WHERE page BETWEEN 2 AND 5 AND active = 1 ORDER BY page, grid_row, grid_col');
  const catOut = buildModule('2026-05-18-h', 'kb_catpages_ver', 'page BETWEEN 2 AND 5', 'page BETWEEN 2 AND 5', catPages, catBtns);
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-catpages.js'), catOut, 'utf8');
  console.log('keyboard-catpages.js: ' + catBtns[0].values.length + ' buttons (v2026-05-18-h)');

  // Subpages (>5)
  const subPages = db.exec('SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5 ORDER BY page');
  const subBtns = db.exec('SELECT ' + COLS.join(',') + ' FROM keyboard_buttons WHERE page > 5 AND active = 1 ORDER BY page, grid_row, grid_col');
  const subOut = buildModule('2026-05-18-h', 'kb_subpages_ver', 'page > 5', 'page > 5', subPages, subBtns);
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-subpages.js'), subOut, 'utf8');
  console.log('keyboard-subpages.js: ' + subBtns[0].values.length + ' buttons (v2026-05-18-h)');

  db.close();
}
main().catch(console.error);
