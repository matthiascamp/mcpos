const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const pxl = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400`;

const imageMap = {
  // Page 7 - Apples
  'p-kb-pg7-pink-lady': 102104,
  'p-apple-gsmith': 6227174,
  'p-kb-pg7-fuji': 89434,
  'p-apple-rg': 7333141,
  'p-kb-pg7-red-delicious': 7333127,
  'p-kb-pg7-jazz': 1630588,
  'p-kb-pg7-braeburn': 102104,
  'p-kb-pg7-golden-del': 67821,
  'p-kb-pg7-apple-bag': 2487443,
  // Page 8 - Apricots
  'p-kb-pg8-apricots-kg': 26973629,
  // Page 9 - Avocados
  'p-avocado': 7156088,
  'p-kb-pg9-avo-sm': 7156088,
  'p-kb-pg9-avo-lg': 19808820,
  'p-kb-pg9-avo-bag': 4352098,
  // Page 10 - Bananas
  'p-banana': 5342631,
  'p-kb-pg10-lady-finger': 16214622,
  'p-kb-pg10-red-banana': 19811296,
  'p-kb-pg10-plantain': 11770742,
  // Page 11 - Grapes
  'p-kb-pg11-green-grapes': 209545,
  'p-kb-pg11-red-grapes': 23042,
  'p-kb-pg11-black-grapes': 1098529,
  'p-kb-pg11-grapes-bag': 760281,
  // Page 12 - Kiwi
  'p-kb-pg12-green-kiwi': 7156083,
  'p-kb-pg12-gold-kiwi': 11755904,
  'p-kb-pg12-kiwi-pack': 6411505,
  // Page 13 - Lemons
  'p-kb-pg13-lemons-kg': 1367232,
  'p-kb-pg13-lemon-bag': 1576200,
  'p-kb-pg13-meyer-lemon': 4197821,
  // Page 14 - Limes
  'p-kb-pg14-limes-ea': 13427976,
  'p-kb-pg14-lime-bag': 13427978,
  'p-kb-pg14-kaffir-lime': 8615395,
  // Page 15 - Mandarins
  'p-kb-pg15-imperial': 14704999,
  'p-kb-pg15-afourer': 7214584,
  'p-kb-pg15-mandarin-bag': 2135677,
  // Page 16 - Mangoes
  'p-kb-pg16-kp-mango': 28939331,
  'p-kb-pg16-r2e2': 28939331,
  'p-kb-pg16-calypso': 28939331,
  'p-kb-pg16-honey-gold': 28939331,
  'p-kb-pg16-mango-tray': 28939331,
  // Page 17 - Melons
  'p-watermelon': 1313267,
  'p-kb-pg17-rockmelon': 4051441,
  'p-kb-pg17-honeydew': 7258396,
  // Page 18 - Nectarines
  'p-kb-pg18-white-nect': 4397924,
  'p-kb-pg18-yellow-nect': 33589129,
  'p-kb-pg18-flat-nect': 4397924,
  // Page 19 - Oranges
  'p-orange-navel': 7156053,
  'p-kb-pg19-valencia': 2247142,
  'p-kb-pg19-blood-orange': 7156082,
  'p-kb-pg19-orange-bag': 30004660,
  'p-kb-pg19-juice-orange': 5223989,
  // Page 20 - Peaches
  'p-kb-pg20-white-peach': 4397924,
  'p-kb-pg20-yellow-peach': 4397924,
  'p-kb-pg20-flat-peach': 4397924,
  // Page 21 - Pears
  'p-kb-pg21-packham': 31024473,
  'p-kb-pg21-bartlett': 1656665,
  'p-kb-pg21-beurre-bosc': 8856840,
  'p-kb-pg21-nashi': 5945765,
  'p-kb-pg21-corella': 31024473,
  // Page 22 - Plums
  'p-kb-pg22-black-plum': 4828492,
  'p-kb-pg22-red-plum': 9902970,
  'p-kb-pg22-sugar-plum': 4828495,
  // Page 23 - Beetroot
  'p-kb-pg23-beetroot-kg': 244394,
  'p-kb-pg23-baby-beet': 5758605,
  // Page 24 - Broccoli
  'p-broccoli': 4564501,
  // Page 25 - Cabbage
  'p-kb-pg25-green-cab': 13796758,
  'p-kb-pg25-red-cab': 22036813,
  'p-kb-pg25-wombok': 13782643,
  'p-kb-pg25-savoy': 13796758,
  // Page 26 - Capsicum
  'p-capsicum-r': 9573478,
  'p-kb-pg26-green-cap': 128536,
  'p-kb-pg26-yellow-cap': 7258137,
  // Page 27 - Chilli
  'p-kb-pg27-red-chilli': 7720573,
  'p-kb-pg27-green-chilli': 16814702,
  'p-kb-pg27-birds-eye': 7264506,
  'p-kb-pg27-jalapeno': 7720537,
  // Page 28 - Garlic
  'p-kb-pg28-garlic-kg': 7091396,
  // Page 29 - Lettuce
  'p-lettuce': 26951809,
  'p-kb-pg29-cos': 5202198,
  'p-butter': 5202194,
  'p-kb-pg29-oakleaf': 5588984,
  'p-kb-pg29-rocket': 5852257,
  'p-kb-pg29-mixed-leaf': 5852257,
  // Page 30 - Mushroom
  'p-mushroom': 5950411,
  'p-kb-pg30-flat-mush': 5950416,
  'p-kb-pg30-swiss-brown': 5950443,
  'p-kb-pg30-oyster': 5950411,
  'p-kb-pg30-button': 5950417,
  'p-kb-pg30-punnet': 5950411,
  // Page 31 - Onion
  'p-onion-brown': 12296935,
  'p-kb-pg31-red-onion': 7890164,
  'p-kb-pg31-white-onion': 12296936,
  'p-kb-pg31-spring-onion': 8599718,
  'p-kb-pg31-onion-bag': 12296937,
  // Page 32 - Potato
  'p-kb-pg32-brushed': 4110456,
  'p-potato': 35595249,
  'p-kb-pg32-kipfler': 4110456,
  'p-kb-pg32-desiree': 4110456,
  'p-kb-pg32-chat': 17406378,
  'p-kb-pg32-potato-bag': 2286776,
  // Page 33 - Pumpkin
  'p-kb-pg33-butternut': 4187620,
  'p-kb-pg33-jap': 4187620,
  'p-kb-pg33-kent': 4187620,
  'p-kb-pg33-qld-blue': 4187620,
  // Page 34 - Sweet Potato
  'p-flat-white': 5199274,
  'p-kb-pg34-purple-sp': 13059602,
  // Page 35 - Tomato
  'p-tomato': 9816726,
  'p-kb-pg35-roma': 9816726,
  'p-kb-pg35-cherry': 11229103,
  'p-kb-pg35-truss': 1327838,
  'p-kb-pg2-grapefruit': 5499239,
  // Page 36 - Zucchini
  'p-kb-pg36-green-zuc': 3375263,
  'p-kb-pg36-yellow-zuc': 26926848,
  'p-kb-pg36-baby-zuc': 26926846,
};

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.env.APPDATA, 'tillaroo', 'crisp-pos.sqlite');
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);

  let updated = 0;
  let notFound = [];

  // Use parameterized queries (? in URLs was being misinterpreted with string interpolation)
  const stmt = db.prepare("UPDATE keyboard_buttons SET image = ? WHERE product_id = ?");

  for (const [productId, photoId] of Object.entries(imageMap)) {
    const url = pxl(photoId);
    stmt.run([url, productId]);
    const changes = db.getRowsModified();
    if (changes > 0) {
      updated += changes;
    } else {
      notFound.push(productId);
    }
  }
  stmt.free();

  // Verify in memory
  const check = db.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND image IS NOT NULL AND length(image) > 10");
  console.log('Buttons with images (pages 6-36):', check[0].values[0][0]);

  // Sample
  const sample = db.exec("SELECT page, label, image FROM keyboard_buttons WHERE page > 5 AND image IS NOT NULL LIMIT 5");
  if (sample.length) {
    sample[0].values.forEach(r => console.log('  pg' + r[0] + ' ' + String(r[1]).split('\n')[0] + ' -> ' + String(r[2]).substring(0, 50)));
  }

  // Save
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  // Also update bundled DB
  const bundledPath = path.join(__dirname, 'db', 'crisp-pos.sqlite');
  if (fs.existsSync(bundledPath)) {
    fs.writeFileSync(bundledPath, Buffer.from(data));
    console.log('Bundled DB also updated');
  }

  console.log(`\nDone: ${updated} buttons updated`);
  if (notFound.length) console.log('Not found:', notFound.join(', '));

  // Final verification from disk
  const db2 = new SQL.Database(fs.readFileSync(dbPath));
  const final = db2.exec("SELECT COUNT(*) FROM keyboard_buttons WHERE page > 5 AND image IS NOT NULL AND length(image) > 10");
  console.log('Verified from disk:', final[0].values[0][0], 'buttons have images');
}

main().catch(console.error);
