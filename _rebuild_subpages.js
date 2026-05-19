const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const pxl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`;

// Color constants matching Profit Track
const GREEN = '#65a30d';   // bucket items (green bg in PT)
const PURPLE = '#6b21a8';  // apple bucket items (purple bg in PT)
const YELLOW = '#c4b800';  // outside/pumpkin items (yellow bg in PT)
const DEFAULT = '#1B4332'; // default dark green

// Each page: { page, title, buttons: [{label, plu, bg, image}] }
// PLUs extracted directly from the Profit Track register photos
// Layout: buttons placed left-to-right, 2 cols wide, BACK at r0c10

const pages = [
  // ===== PAGE 7 - APPLES (IMG_7478) =====
  { page: 7, title: 'Apples', buttons: [
    { label: 'BRAVO KG', plu: '4031', bg: DEFAULT, img: 102104 },
    { label: 'SMALL PINK LADY KG\n(SPOTTY)', plu: '4015', bg: DEFAULT, img: 102104 },
    { label: 'SMALL GRANNY SMITH KG', plu: '4075', bg: DEFAULT, img: 6227174 },
    { label: 'SMALL ROYAL GALA KG\n(STRIPY)', plu: '4065', bg: DEFAULT, img: 7333141 },
    { label: 'JAZZ APPLE KG', plu: '3812', bg: DEFAULT, img: 1630588 },
    { label: 'RED APPLE\nBUCKET KG', plu: '4031', bg: PURPLE, img: null },
    { label: 'LARGE PINK LADY KG\n(SPOTTY)', plu: '4011', bg: DEFAULT, img: 102104 },
    { label: 'LARGE GRANNY SMITH KG', plu: '4071', bg: DEFAULT, img: 6227174 },
    { label: 'LARGE ROYAL GALA KG\n(STRIPY)', plu: '4061', bg: DEFAULT, img: 7333141 },
    { label: 'KANZI KG', plu: '4835', bg: DEFAULT, img: 1630588 },
    { label: 'GRANNY SMITH\nBUCKET KG', plu: '40026', bg: PURPLE, img: null },
    { label: 'RED DELICIOUS KG\n(DARK)', plu: '4021', bg: DEFAULT, img: 7333127 },
    { label: 'FUJI APPLE EA', plu: '4041', bg: DEFAULT, img: 89434 },
  ]},

  // ===== PAGE 10 - BANANAS (IMG_7479) =====
  { page: 10, title: 'Bananas', buttons: [
    { label: 'CAVENDISH KG\n(LONG & STRAIGHT)', plu: '4201', bg: DEFAULT, img: 5342631 },
    { label: 'LADY FINGER KG\n(THICK & STUBBY)', plu: '4221', bg: DEFAULT, img: 16214622 },
    { label: 'CAVENDISH\nBUCKET KG', plu: '40024', bg: GREEN, img: null },
    { label: 'LADYFINGER\nBUCKET KG', plu: '40022', bg: GREEN, img: null },
  ]},

  // ===== PAGE 9 - AVOCADOS (IMG_7480) =====
  { page: 9, title: 'Avocados', buttons: [
    { label: 'HASS EA\n(DARK & ROUGH)', plu: '4152', bg: DEFAULT, img: 7156088 },
    { label: 'REED EA\n(ROUND & SMOOTH)', plu: '4157', bg: DEFAULT, img: 19808820 },
    { label: 'SHEPARD EA\n(GREEN & SMOOTH)', plu: '41522', bg: DEFAULT, img: 19808820 },
    { label: 'SMALL AVOCADO EA', plu: '4155', bg: DEFAULT, img: 7156088 },
    { label: 'AVOCADO BAG KG', plu: '5925', bg: DEFAULT, img: 4352098 },
  ]},

  // ===== PAGE 11 - GRAPES (IMG_7481) =====
  { page: 11, title: 'Grapes', buttons: [
    { label: 'WHITE SEEDLESS KG', plu: '4091', bg: DEFAULT, img: 209545 },
    { label: 'RED SEEDLESS KG', plu: '4801', bg: DEFAULT, img: 23042 },
    { label: 'BLACK SEEDLESS KG', plu: '4931', bg: DEFAULT, img: 1098529 },
    { label: 'GRAPES AUTUMN\nKING KG', plu: '4481', bg: DEFAULT, img: 209545 },
    { label: 'BLACK MUSCAT\nGRAPES KG', plu: '5235', bg: DEFAULT, img: 1098529 },
  ]},

  // ===== PAGE 12 - KIWI (IMG_7482) =====
  { page: 12, title: 'Kiwi', buttons: [
    { label: 'REGULAR KIWI KG', plu: '4612', bg: DEFAULT, img: 7156083 },
    { label: 'GOLD KIWI EA\n(ZESPRI STICKER)', plu: '5088', bg: DEFAULT, img: 11755904 },
  ]},

  // ===== PAGE 13 - LEMONS (IMG_7483) =====
  { page: 13, title: 'Lemons', buttons: [
    { label: 'LEMONS KG', plu: '8623', bg: DEFAULT, img: 1367232 },
    { label: 'BAGGED LEMONS KG', plu: '86232', bg: DEFAULT, img: 1576200 },
  ]},

  // ===== PAGE 14 - LIMES (IMG_7484) =====
  { page: 14, title: 'Limes', buttons: [
    { label: 'LIMES EA', plu: '4643', bg: DEFAULT, img: 13427976 },
    { label: 'BAGGED LIMES KG', plu: '46422', bg: DEFAULT, img: 13427978 },
  ]},

  // ===== PAGE 15 - MANDARINS (IMG_7485) =====
  { page: 15, title: 'Mandarins', buttons: [
    { label: 'IMPERIAL KG\n(FLAT & SMALL)', plu: '5821', bg: DEFAULT, img: 14704999 },
    { label: 'HONEY MURCOTT KG\n(LARGE & ROUND)', plu: '4665', bg: DEFAULT, img: 7214584 },
    { label: 'MANDARINES\nGREEN BUCKET', plu: '40049', bg: GREEN, img: null },
    { label: 'EMPRESS KG\n(ROUND & VERY SMALL)', plu: '4661', bg: DEFAULT, img: 14704999 },
    { label: 'DAISY KG\n(ROUND & DARK)', plu: '4457', bg: DEFAULT, img: 2135677 },
    { label: 'AFOURER KG\n(FLAT & MEDIUM)', plu: '5791', bg: DEFAULT, img: 7214584 },
  ]},

  // ===== PAGE 16 - MANGOES (IMG_7486) =====
  { page: 16, title: 'Mangoes', buttons: [
    { label: 'SMALL KP EA', plu: '4705', bg: DEFAULT, img: 28939331 },
    { label: 'R2E2 EA\n(100% SHAPE)', plu: '4735', bg: DEFAULT, img: 28939331 },
    { label: 'PEARL MANGO EA', plu: '1642', bg: DEFAULT, img: 28939331 },
    { label: 'MEDIUM KP EA', plu: '4702', bg: DEFAULT, img: 28939331 },
    { label: 'KEITT EA\n(GREEN/BIG)', plu: '5772', bg: DEFAULT, img: 28939331 },
    { label: 'CALYPSO MANGO EA', plu: '5766', bg: DEFAULT, img: 28939331 },
    { label: 'LARGE KP EA', plu: '4701', bg: DEFAULT, img: 28939331 },
  ]},

  // ===== PAGE 17 - MELONS (IMG_7487) =====
  { page: 17, title: 'Melons', buttons: [
    { label: 'ROCKMELON EA', plu: '4752', bg: DEFAULT, img: 4051441 },
    { label: 'HONEYDEW EA', plu: '4722', bg: DEFAULT, img: 7258396 },
    { label: 'ROUND SEEDLESS\nWATERMELON KG', plu: '4801', bg: DEFAULT, img: 1313267 },
    { label: 'OUTSIDE\nROCKMELON EA', plu: '8717', bg: YELLOW, img: null },
    { label: 'OUTSIDE\nHONEYDEW EA', plu: '4716', bg: YELLOW, img: null },
    { label: 'SANTA CLAUS\nMELON EA', plu: '5992', bg: DEFAULT, img: 4051441 },
    { label: 'LONG SEEDED\nWATERMELON KG', plu: '5541', bg: DEFAULT, img: 1313267 },
  ]},

  // ===== PAGE 18 - NECTARINES (IMG_7488) =====
  { page: 18, title: 'Nectarines', buttons: [
    { label: 'YELLOW\nNECTARINE KG', plu: '4641', bg: DEFAULT, img: 33589129 },
    { label: 'WHITE\nNECTARINE KG', plu: '4651', bg: DEFAULT, img: 4397924 },
    { label: 'NECTARINES\nGREEN BUCKET KG', plu: '4425', bg: GREEN, img: null },
  ]},

  // ===== PAGE 19 - ORANGES (IMG_7489) =====
  { page: 19, title: 'Oranges', buttons: [
    { label: 'NAVEL ORANGE KG\n(DARK HOLE)', plu: '4912', bg: DEFAULT, img: 7156053 },
    { label: 'VALENCIA ORANGE KG\n(GREENISH)', plu: '4921', bg: DEFAULT, img: 2247142 },
    { label: 'BLOOD ORANGE\nBUCKET KG', plu: '83417', bg: YELLOW, img: null },
    { label: 'BLOOD ORANGE KG\n(DARK)', plu: '8392', bg: DEFAULT, img: 7156082 },
    { label: 'CARA CARA ORANGE KG\n(SMALL HOLE)', plu: '8376', bg: DEFAULT, img: 5223989 },
    { label: 'SM ORANGES BAG EA', plu: '4915', bg: DEFAULT, img: 30004660 },
  ]},

  // ===== PAGE 20 - PEACHES (IMG_7490) =====
  { page: 20, title: 'Peaches', buttons: [
    { label: 'YELLOW PEACH KG', plu: '5081', bg: DEFAULT, img: 4397924 },
    { label: 'GOLDEN QUEEN KG', plu: '5037', bg: DEFAULT, img: 4397924 },
    { label: 'PEACH WHITE KG', plu: '5085', bg: DEFAULT, img: 4397924 },
    { label: 'DONUT PEACH KG', plu: '5071', bg: DEFAULT, img: 4397924 },
    { label: 'PEACH BUCKET KG', plu: '5013', bg: GREEN, img: null },
  ]},

  // ===== PAGE 21 - PEARS (IMG_7491) =====
  { page: 21, title: 'Pears', buttons: [
    { label: 'PACKHAM KG', plu: '4991', bg: DEFAULT, img: 31024473 },
    { label: 'NASHI EA\n(ASIAN PEAR)', plu: '5392', bg: DEFAULT, img: 5945765 },
    { label: 'BOSC PEAR KG', plu: '5123', bg: DEFAULT, img: 8856840 },
    { label: 'WILLIAMS KG\n(GREEN & ROUNDED)', plu: '4975', bg: DEFAULT, img: 31024473 },
    { label: 'RUBY BOO KG', plu: '5271', bg: DEFAULT, img: 1656665 },
    { label: 'PEAR BUCKET KG', plu: '40023', bg: GREEN, img: null },
  ]},

  // ===== PAGE 22 - PLUMS (IMG_7492) =====
  { page: 22, title: 'Plums', buttons: [
    { label: 'RED PLUM KG', plu: '5181', bg: DEFAULT, img: 9902970 },
    { label: 'SUGAR PLUM', plu: '5281', bg: DEFAULT, img: 4828495 },
    { label: 'BLACK PLUM KG', plu: '7531', bg: DEFAULT, img: 4828492 },
    { label: 'CANDY PLUM KG', plu: '9875', bg: DEFAULT, img: 4828492 },
    { label: 'PLUMS IN\nBUCKET KG', plu: '44251', bg: GREEN, img: null },
  ]},

  // ===== PAGE 29 - LETTUCE (IMG_7493) =====
  { page: 29, title: 'Lettuce', buttons: [
    { label: 'ICEBERG LETTUCE EA', plu: '3394', bg: DEFAULT, img: 26951809 },
    { label: 'COS LETTUCE EA', plu: '1272', bg: DEFAULT, img: 5202198 },
    { label: 'FANCY LETTUCE EA', plu: '2362', bg: DEFAULT, img: 5588984 },
  ]},

  // ===== PAGE 30 - MUSHROOMS (IMG_7494) =====
  { page: 30, title: 'Mushrooms', buttons: [
    { label: 'BUTTON\nMUSHROOMS KG', plu: '2571', bg: DEFAULT, img: 5950411 },
    { label: 'SWISS BROWN\nMUSHROOM KG', plu: '2575', bg: DEFAULT, img: 5950443 },
    { label: 'FLAT MUSHROOM KG', plu: '2381', bg: DEFAULT, img: 5950416 },
  ]},

  // ===== PAGE 31 - ONIONS (IMG_7495) =====
  { page: 31, title: 'Onions', buttons: [
    { label: '1KG BROWN\nONION BAG', plu: '2451', bg: DEFAULT, img: 12296937 },
    { label: 'BROWN ONION KG', plu: '2411', bg: DEFAULT, img: 12296935 },
    { label: 'ONION RED KG', plu: '2441', bg: DEFAULT, img: 7890164 },
    { label: 'ONION WHITE KG', plu: '2431', bg: DEFAULT, img: 12296936 },
    { label: 'RED ONION BAG', plu: '2453', bg: DEFAULT, img: 7890164 },
    { label: 'SALAD ONION\n(DRIED)', plu: '2462', bg: DEFAULT, img: 12296935 },
    { label: 'PICKLING BAG\n(SMALL ONIONS)', plu: '2424', bg: DEFAULT, img: 12296937 },
    { label: 'SPRING ONION\nBUNCH', plu: '2452', bg: DEFAULT, img: 8599718 },
  ]},

  // ===== PAGE 32 - POTATOES (IMG_7496) =====
  { page: 32, title: 'Potatoes', buttons: [
    { label: 'BRUSHED KG', plu: '2521', bg: DEFAULT, img: 4110456 },
    { label: 'WASHED POTATOES\nWHITE KG', plu: '2511', bg: DEFAULT, img: 35595249 },
    { label: 'CHATS 5KG BAG EA', plu: '2764', bg: DEFAULT, img: 17406378 },
    { label: 'KIPFLER KG', plu: '25221', bg: DEFAULT, img: 4110456 },
    { label: 'WASHED POTATOES\nRED KG', plu: '2513', bg: DEFAULT, img: 4110456 },
    { label: 'DUTCH CREAM\nPOTATOES KG', plu: '2534', bg: DEFAULT, img: 35595249 },
  ]},

  // ===== PAGE 33 - PUMPKINS (IMG_7497) =====
  { page: 33, title: 'Pumpkins', buttons: [
    { label: 'BUTTERNUT KG', plu: '2661', bg: DEFAULT, img: 4187620 },
    { label: 'JAP KG', plu: '2931', bg: DEFAULT, img: 4187620 },
    { label: 'JARRA KG', plu: '2621', bg: DEFAULT, img: 4187620 },
    { label: 'BUTTERNUT CUT', plu: '2671', bg: DEFAULT, img: 4187620 },
    { label: 'JAP CUT', plu: '2941', bg: DEFAULT, img: 4187620 },
    { label: 'JARRA CUT\n(BLUEISH SKIN)', plu: '2631', bg: DEFAULT, img: 4187620 },
    { label: 'BUTTERNUT FROM\nOUTSIDE KG', plu: '3681', bg: YELLOW, img: null },
    { label: 'JAP FROM\nOUTSIDE KG', plu: '2721', bg: YELLOW, img: null },
    { label: 'JARRA FROM\nOUTSIDE KG', plu: '91321', bg: YELLOW, img: null },
  ]},

  // ===== PAGE 34 - SWEET POTATOES (IMG_7498) =====
  { page: 34, title: 'Sweet Potatoes', buttons: [
    { label: 'GOLD KG', plu: '2571', bg: DEFAULT, img: 5199274 },
    { label: 'RED KG', plu: '2551', bg: DEFAULT, img: 13059602 },
    { label: 'WHITE KG', plu: '25081', bg: DEFAULT, img: 5199274 },
    { label: 'GOLD KG\n(FROM OUTSIDE)', plu: '1882', bg: YELLOW, img: null },
  ]},

  // ===== PAGE 36 - ZUCCHINI (IMG_7499) =====
  { page: 36, title: 'Zucchini', buttons: [
    { label: 'ZUCCHINI KG', plu: '2861', bg: DEFAULT, img: 3375263 },
    { label: 'ZUCCHINI\nBUCKET KG', plu: '67337', bg: YELLOW, img: null },
  ]},
];

// Pages that existed in the old layout but have no photos - remove them
const pagesToRemove = [6, 8, 23, 24, 25, 26, 27, 28, 35];

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  // 1. Clear ALL buttons on pages > 5 (sub-pages only, don't touch main register)
  db.run("DELETE FROM keyboard_buttons WHERE page > 5");
  console.log('Cleared all sub-page buttons');

  // 2. Remove keyboard_pages entries for pages without photos
  for (const p of pagesToRemove) {
    db.run("DELETE FROM keyboard_pages WHERE page = ?", [p]);
  }

  // 3. Ensure keyboard_pages entries exist for each page we're creating
  for (const pg of pages) {
    const exists = db.exec(`SELECT page FROM keyboard_pages WHERE page = ${pg.page}`);
    if (!exists.length || !exists[0].values.length) {
      db.run("INSERT INTO keyboard_pages (page, label, grid_cols, grid_rows) VALUES (?, ?, 13, 7)",
        [pg.page, pg.title]);
    }
  }

  // 4. Insert buttons for each page
  let totalButtons = 0;
  const insertStmt = db.prepare(`INSERT INTO keyboard_buttons
    (id, label, type, price, image, color, bg_color, parent_id, category_filter,
     alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span,
     product_id, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`);

  for (const pg of pages) {
    // Place BACK button at r0 c10 spanning 3 cols
    const backId = `pg${pg.page}-back`;
    insertStmt.run([backId, 'BACK', 'back_home', null, null, '#000', '#4ade80',
      null, null, null, 0, 'grid', pg.page, 0, 10, 3, 1, null]);

    // Place product buttons: 2 cols wide, fill left-to-right then top-to-bottom
    // Start at r0c0, max 5 buttons per row (cols 0,2,4,6,8)
    let row = 0, col = 0;
    for (let i = 0; i < pg.buttons.length; i++) {
      const btn = pg.buttons[i];
      const btnId = `pg${pg.page}-btn${i}`;
      const imgUrl = btn.img ? pxl(btn.img) : null;
      const productId = `plu-${btn.plu}`;

      insertStmt.run([btnId, btn.label, 'open_price', null, imgUrl,
        '#fff', btn.bg, null, null, null, i, 'grid',
        pg.page, row, col, 2, 1, productId]);

      col += 2;
      // Wrap to next row if we'd overlap with BACK button area (cols 10-12)
      if (col >= 10) {
        col = 0;
        row++;
      }
      totalButtons++;
    }
  }
  insertStmt.free();

  console.log(`Inserted ${totalButtons} product buttons + ${pages.length} BACK buttons across ${pages.length} pages`);

  // 5. Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  // 6. Verify
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const summary = db2.exec(`SELECT page, COUNT(*) as btns,
    SUM(CASE WHEN image IS NOT NULL AND length(image) > 5 THEN 1 ELSE 0 END) as with_img
    FROM keyboard_buttons WHERE page > 5 GROUP BY page ORDER BY page`);
  console.log('\nPage | Buttons | With Images');
  summary[0].values.forEach(r => console.log(`  ${r.join(' | ')}`));
}

main().catch(console.error);
