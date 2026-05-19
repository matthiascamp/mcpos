const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const W = 'https://cdn0.woolworths.media/content/wowproductimages/large/';

const imageMap = {
  // === Apple varieties (page 7) ===
  'pg7-btn0':  W + '625158.jpg',  // Bravo - dark maroon
  'pg7-btn12': W + '120044.jpg',  // Fuji - red/yellow striped
  'pg7-btn10': W + '130935.jpg',  // Granny Smith - green
  'pg7-btn7':  W + '130935.jpg',  // Large Granny Smith
  'pg7-btn2':  W + '130935.jpg',  // Small Granny Smith
  'pg7-btn4':  W + '306343.jpg',  // Jazz - red/yellow patches
  'pg7-btn9':  W + '381923.jpg',  // Kanzi - red/green
  'pg7-btn6':  W + '105919.jpg',  // Large Pink Lady
  'pg7-btn1':  W + '105919.jpg',  // Small Pink Lady
  'pg7-btn8':  W + '155003.jpg',  // Large Royal Gala
  'pg7-btn3':  W + '155003.jpg',  // Small Royal Gala
  'pg7-btn5':  W + '131489.jpg',  // Red Apple
  'pg7-btn11': W + '131489.jpg',  // Red Delicious

  // === Avocado varieties (page 9) ===
  'pg9-btn0':  W + '130925.jpg',  // Hass
  'pg9-btn1':  W + '166994.jpg',  // Reed
  'pg9-btn2':  W + '135718.jpg',  // Shepard
  'pg9-btn3':  W + '130925.jpg',  // Small Avocado
  'pg9-btn4':  W + '130925.jpg',  // Avocado Bag

  // === Banana varieties (page 10) ===
  'pg10-btn0': W + '133211.jpg',  // Cavendish KG
  'pg10-btn2': W + '133211.jpg',  // Cavendish
  'pg10-btn1': W + '169498.jpg',  // Lady Finger
  'pg10-btn3': W + '169498.jpg',  // Ladyfinger

  // === Grape varieties (page 11) ===
  'pg11-btn4': W + '774553.jpg',  // Black Muscat
  'pg11-btn2': W + '774553.jpg',  // Black Seedless
  'pg11-btn3': W + '855246.jpg',  // Autumn (red)
  'pg11-btn1': W + '855246.jpg',  // Red Seedless
  'pg11-btn0': W + '855186.jpg',  // White/Green Seedless

  // === Kiwi varieties (page 12) ===
  'pg12-btn1': W + '267084.jpg',  // Gold Kiwi
  'pg12-btn0': W + '139238.jpg',  // Green Kiwi

  // === Lemon varieties (page 13) ===
  'pg13-btn0': W + '587498.jpg',  // Lemons
  'pg13-btn1': W + '587498.jpg',  // Bagged Lemons

  // === Lime varieties (page 14) ===
  'pg14-btn0': W + '142186.jpg',  // Limes
  'pg14-btn1': W + '142186.jpg',  // Bagged Limes

  // === Mandarin varieties (page 15) ===
  'pg15-btn5': W + '314075.jpg',  // Afourer
  'pg15-btn0': W + '141410.jpg',  // Imperial
  'pg15-btn1': W + '144899.jpg',  // Honey Murcott
  'pg15-btn4': W + '141410.jpg',  // Daisy (use Imperial)
  'pg15-btn3': W + '141410.jpg',  // Empress (use Imperial)
  'pg15-btn2': W + '141410.jpg',  // Generic Mandarines

  // === Mango varieties (page 16) ===
  'pg16-btn5': W + '143679.jpg',  // Calypso
  'pg16-btn4': W + '143737.jpg',  // Keitt
  'pg16-btn6': W + '139428.jpg',  // Large KP
  'pg16-btn3': W + '139428.jpg',  // Medium KP
  'pg16-btn0': W + '139428.jpg',  // Small KP
  'pg16-btn2': W + '184093.jpg',  // Pearl
  'pg16-btn1': W + '143168.jpg',  // R2E2

  // === Melon varieties (page 17) ===
  'pg17-btn0': W + '114850.jpg',  // Rockmelon
  'pg17-btn1': W + '114835.jpg',  // Honeydew
  'pg17-btn2': W + '345050.jpg',  // Round Seedless watermelon
  'pg17-btn6': W + '345050.jpg',  // Long Seeded watermelon
  'pg17-btn3': W + '114850.jpg',  // Outside (rockmelon)
  'pg17-btn5': W + '114835.jpg',  // Santa Claus (honeydew-like)

  // === Nectarine varieties (page 18) ===
  'pg18-btn0': W + '143494.jpg',  // Yellow
  'pg18-btn1': W + '185785.jpg',  // White

  // === Orange varieties (page 19) ===
  'pg19-btn0': W + '259450.jpg',  // Navel
  'pg19-btn1': W + '144708.jpg',  // Valencia
  'pg19-btn2': W + '178403.jpg',  // Blood Orange
  'pg19-btn3': W + '178403.jpg',  // Blood Orange KG
  'pg19-btn4': W + '767560.jpg',  // Cara Cara
  'pg19-btn5': W + '259450.jpg',  // Orange Bag

  // === Peach varieties (page 20) ===
  'pg20-btn0': W + '144848.jpg',  // Yellow
  'pg20-btn1': W + '144848.jpg',  // Golden Queen
  'pg20-btn2': W + '144926.jpg',  // White
  'pg20-btn3': W + '713836.jpg',  // Donut/Flat
  'pg20-btn4': W + '144848.jpg',  // Peach Bucket

  // === Pear varieties (page 21) ===
  'pg21-btn0': W + '115330.jpg',  // Packham
  'pg21-btn1': W + '145289.jpg',  // Nashi
  'pg21-btn2': W + '145111.jpg',  // Bosc
  'pg21-btn3': W + '145762.jpg',  // Williams
  'pg21-btn4': W + '145111.jpg',  // Ruby Boo (use Bosc)
  'pg21-btn5': W + '115330.jpg',  // Pear Bucket (use Packham)

  // === Plum varieties (page 22) ===
  'pg22-btn0': W + '145525.jpg',  // Red Plum
  'pg22-btn2': W + '143061.jpg',  // Black Plum
  'pg22-btn1': W + '145525.jpg',  // Sugar Plum (use red)
  'pg22-btn3': W + '145525.jpg',  // Candy Plum (use red)
  'pg22-btn4': W + '145525.jpg',  // Plums In

  // === Category page images (pages 2-5) - use representative variety ===
  'pg2-apples':    W + '105919.jpg',  // Pink Lady (most popular Aus apple)
  'pg2-apricots':  W + '140124.jpg',  // Apricots
  'pg2-avocados':  W + '130925.jpg',  // Hass Avocado
  'pg2-bananas':   W + '133211.jpg',  // Cavendish Banana
  'pg2-cherries':  W + '140253.jpg',  // Cherries
  'pg2-coconut':   W + '149296.jpg',  // Coconut
  'pg2-custard-apple': W + '199757.jpg', // Custard Apple
  'pg2-dragon-fruit':  W + '424918.jpg', // Dragon Fruit
  'pg2-figs':      W + '149982.jpg',  // Figs
  'pg2-grapefruit': W + '150044.jpg', // Grapefruit
  'pg2-grapes':    W + '855186.jpg',  // Green Grapes
  'pg2-guava':     W + '150121.jpg',  // Guava
  'pg2-kiwi':      W + '139238.jpg',  // Green Kiwi
  'pg2-lemons':    W + '587498.jpg',  // Lemons
  'pg2-limes':     W + '142186.jpg',  // Limes
  'pg2-longan':    W + '168610.jpg',  // Longan
  'pg2-lychee':    W + '142280.jpg',  // Lychee

  'pg3-nectarines':   W + '143494.jpg',  // Yellow Nectarine
  'pg3-oranges':      W + '259450.jpg',  // Navel Orange
  'pg3-papaya':       W + '145080.jpg',  // Papaya
  'pg3-passion-fruit': W + '289456.jpg', // Passion Fruit
  'pg3-pawpaw':       W + '145080.jpg',  // Pawpaw (papaya)
  'pg3-peaches':      W + '144848.jpg',  // Yellow Peach
  'pg3-pears':        W + '115330.jpg',  // Packham Pear
  'pg3-persimmons':   W + '145919.jpg',  // Persimmon
  'pg3-plums':        W + '145525.jpg',  // Red Plum
  'pg3-pomegranate':  W + '146218.jpg',  // Pomegranate
  'pg3-pommelo':      W + '146344.jpg',  // Pomelo
  'pg3-quince':       W + '147315.jpg',  // Quince
  'pg3-pineapple-md': W + '145177.jpg',  // Pineapple
  'pg3-pineapple-sm': W + '145177.jpg',  // Pineapple
  'pg3-pineapple-xl': W + '145177.jpg',  // Pineapple
  'pg3-tangello':     W + '262398.jpg',  // Tangelo

  // Overflow page 37 (Fruit A-M more)
  'pg37-lychee':     W + '142280.jpg',
  'pg37-mandarins':  W + '141410.jpg',
  'pg37-mangoes':    W + '139428.jpg',
  'pg37-melons':     W + '114850.jpg',

  // === Lettuce varieties (page 29) ===
  'pg29-btn0': W + '140673.jpg',  // Iceberg
  'pg29-btn1': W + '141844.jpg',  // Cos
  'pg29-btn2': W + '258498.jpg',  // Fancy/Butter

  // === Mushroom varieties (page 30) ===
  'pg30-btn0': W + '154375.jpg',  // Button
  'pg30-btn1': W + '169475.jpg',  // Swiss Brown
  'pg30-btn2': W + '169482.jpg',  // Flat

  // === Onion varieties (page 31) ===
  'pg31-btn0': W + '135373.jpg',  // Brown 1kg
  'pg31-btn1': W + '135373.jpg',  // Brown
  'pg31-btn2': W + '148192.jpg',  // Red
  'pg31-btn3': W + '148196.jpg',  // White
  'pg31-btn4': W + '148192.jpg',  // Red Bag
  'pg31-btn5': W + '148211.jpg',  // Salad/Spring
  'pg31-btn6': W + '135373.jpg',  // Pickling
  'pg31-btn7': W + '148211.jpg',  // Spring

  // === Potato varieties (page 32) ===
  'pg32-btn0': W + '135463.jpg',  // Brushed
  'pg32-btn1': W + '135463.jpg',  // Washed
  'pg32-btn2': W + '135463.jpg',  // Chats Bag
  'pg32-btn3': W + '145457.jpg',  // Kipfler
  'pg32-btn5': W + '170485.jpg',  // Dutch Cream

  // === Pumpkin varieties (page 33) ===
  'pg33-btn0': W + '146987.jpg',  // Butternut KG
  'pg33-btn3': W + '146987.jpg',  // Butternut Cut
  'pg33-btn6': W + '146987.jpg',  // Butternut From
  'pg33-btn1': W + '120299.jpg',  // Jap KG
  'pg33-btn4': W + '120299.jpg',  // Jap Cut
  'pg33-btn7': W + '120299.jpg',  // Jap From
  'pg33-btn2': W + '120299.jpg',  // Jarra KG (use Jap as fallback)
  'pg33-btn5': W + '120299.jpg',  // Jarra Cut
  'pg33-btn8': W + '120299.jpg',  // Jarra From

  // === Sweet Potato varieties (page 34) ===
  'pg34-btn0': W + '329965.jpg',  // Gold
  'pg34-btn1': W + '148329.jpg',  // Red/Purple
  'pg34-btn2': W + '329965.jpg',  // White (use Gold)
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(dbPath));

  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ?1 WHERE id = ?2");
  let updated = 0, missing = 0;

  for (const [id, url] of Object.entries(imageMap)) {
    const exists = db.exec("SELECT id FROM keyboard_buttons WHERE id = ?1", [id]);
    if (exists.length && exists[0].values.length) {
      stmt.run([url, id]);
      updated++;
    } else {
      console.log(`MISSING: ${id}`);
      missing++;
    }
  }
  stmt.free();
  console.log(`Updated ${updated} images (${missing} missing)`);

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB updated');
  }

  // Re-export catpages (pages 2-5, 37-39)
  const catPages = db.exec('SELECT page, name, cols, rows FROM keyboard_pages WHERE page IN (2,3,4,5,37,38,39) ORDER BY page');
  const catBtns = db.exec('SELECT id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active FROM keyboard_buttons WHERE page IN (2,3,4,5,37,38,39) ORDER BY page, grid_row, grid_col');
  const cp = catPages[0].values.map(r => ({page:r[0],name:r[1],cols:r[2],rows:r[3]}));
  const cb = catBtns[0].values.map(r => ({id:r[0],label:r[1],type:r[2],price:r[3],image:r[4],color:r[5],bg_color:r[6],parent_id:r[7],category_filter:r[8],alpha_range:r[9],sort_order:r[10],position:r[11],page:r[12],grid_row:r[13],grid_col:r[14],col_span:r[15],row_span:r[16],product_id:r[17],active:r[18]}));

  let catOut = '// Keyboard category pages (pages 2-5, 37-39) - fruit/veg category navigation\\n// Auto-generated, do not edit manually\\n';
  catOut += "const VERSION = '2026-05-18-e'\\n\\n";
  catOut += 'const pages = ' + JSON.stringify(cp, null, 2) + '\\n\\n';
  catOut += 'const buttons = ' + JSON.stringify(cb, null, 2) + '\\n\\n';
  catOut += 'function apply(db) {\\n';
  catOut += "  const localVer = (() => { try { const r = db.exec(\"SELECT value FROM settings WHERE key = 'kb_catpages_ver'\"); return r.length && r[0].values.length ? r[0].values[0][0] : '0' } catch (_) { return '0' } })()\\n";
  catOut += "  if (localVer >= VERSION) return 0\\n\\n";
  catOut += '  db.run("DELETE FROM keyboard_buttons WHERE page IN (2,3,4,5,37,38,39)")\\n';
  catOut += '  db.run("DELETE FROM keyboard_pages WHERE page IN (2,3,4,5,37,38,39)")\\n\\n';
  catOut += '  const pgStmt = db.prepare("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)")\\n';
  catOut += '  for (const p of pages) { pgStmt.run([p.page, p.name, p.cols, p.rows]); }\\n';
  catOut += '  pgStmt.free()\\n\\n';
  catOut += '  const btnStmt = db.prepare("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")\\n';
  catOut += '  for (const b of buttons) {\\n';
  catOut += '    btnStmt.run([b.id, b.label, b.type, b.price, b.image, b.color, b.bg_color, b.parent_id, b.category_filter, b.alpha_range, b.sort_order, b.position, b.page, b.grid_row, b.grid_col, b.col_span, b.row_span, b.product_id, b.active])\\n';
  catOut += '  }\\n  btnStmt.free()\\n\\n';
  catOut += "  db.run(\"INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_catpages_ver', ?)\", [VERSION])\\n";
  catOut += '  return buttons.length\\n}\\n\\nmodule.exports = { apply, VERSION }\\n';
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-catpages.js'), catOut, 'utf-8');
  console.log('Re-exported keyboard-catpages.js');

  // Re-export subpages (pages > 5, not 37-39)
  const subPages = db.exec('SELECT page, name, cols, rows FROM keyboard_pages WHERE page > 5 AND page NOT IN (37,38,39) ORDER BY page');
  const subBtns = db.exec('SELECT id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active FROM keyboard_buttons WHERE page > 5 AND page NOT IN (37,38,39) ORDER BY page, grid_row, grid_col');
  const sp = subPages[0].values.map(r => ({page:r[0],name:r[1],cols:r[2],rows:r[3]}));
  const sb = subBtns[0].values.map(r => ({id:r[0],label:r[1],type:r[2],price:r[3],image:r[4],color:r[5],bg_color:r[6],parent_id:r[7],category_filter:r[8],alpha_range:r[9],sort_order:r[10],position:r[11],page:r[12],grid_row:r[13],grid_col:r[14],col_span:r[15],row_span:r[16],product_id:r[17],active:r[18]}));

  let subOut = '// Keyboard sub-pages (pages 7-36) - extracted from Profit Track register photos\\n// Auto-generated, do not edit manually\\n';
  subOut += "const VERSION = '2026-05-18-e'\\n\\n";
  subOut += 'const pages = ' + JSON.stringify(sp, null, 2) + '\\n\\n';
  subOut += 'const buttons = ' + JSON.stringify(sb, null, 2) + '\\n\\n';
  subOut += 'function apply(db) {\\n';
  subOut += "  const localVer = (() => { try { const r = db.exec(\"SELECT value FROM settings WHERE key = 'kb_subpages_ver'\"); return r.length && r[0].values.length ? r[0].values[0][0] : '0' } catch (_) { return '0' } })()\\n";
  subOut += "  if (localVer >= VERSION) return 0\\n\\n";
  subOut += '  db.run("DELETE FROM keyboard_buttons WHERE page > 5 AND page NOT IN (37,38,39)")\\n';
  subOut += '  db.run("DELETE FROM keyboard_pages WHERE page > 5 AND page NOT IN (37,38,39)")\\n\\n';
  subOut += '  const pgStmt = db.prepare("INSERT OR REPLACE INTO keyboard_pages (page, name, cols, rows) VALUES (?,?,?,?)")\\n';
  subOut += '  for (const p of pages) { pgStmt.run([p.page, p.name, p.cols, p.rows]); }\\n';
  subOut += '  pgStmt.free()\\n\\n';
  subOut += '  const btnStmt = db.prepare("INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, product_id, active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")\\n';
  subOut += '  for (const b of buttons) {\\n';
  subOut += '    btnStmt.run([b.id, b.label, b.type, b.price, b.image, b.color, b.bg_color, b.parent_id, b.category_filter, b.alpha_range, b.sort_order, b.position, b.page, b.grid_row, b.grid_col, b.col_span, b.row_span, b.product_id, b.active])\\n';
  subOut += '  }\\n  btnStmt.free()\\n\\n';
  subOut += "  db.run(\"INSERT OR REPLACE INTO settings (key, value) VALUES ('kb_subpages_ver', ?)\", [VERSION])\\n";
  subOut += '  return buttons.length\\n}\\n\\nmodule.exports = { apply, VERSION }\\n';
  fs.writeFileSync(path.join(__dirname, 'db', 'keyboard-subpages.js'), subOut, 'utf-8');
  console.log('Re-exported keyboard-subpages.js');
}

main().catch(console.error);
