const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

async function main() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const DB_PATH = path.join(process.env.APPDATA || '', 'tillaroo', 'crisp-pos.sqlite');
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const run = (sql, params) => db.run(sql, params);
  const get = (sql, params) => { const r = db.exec(sql, params); return r.length ? Object.fromEntries(r[0].columns.map((c,i) => [c, r[0].values[0][i]])) : null; };
  const all = (sql, params) => { const r = db.exec(sql, params); return r.length ? r[0].values.map(v => Object.fromEntries(r[0].columns.map((c,i) => [c, v[i]]))) : []; };

  function findProduct(name) {
    const rows = all("SELECT id, name, price, unit FROM products WHERE name = ? AND active = 1", [name]);
    return rows[0] || null;
  }

  function updateProduct(name, updates) {
    const p = findProduct(name);
    if (!p) { console.log(`  WARN: product "${name}" not found`); return null; }
    const sets = [];
    const params = [];
    for (const [k, v] of Object.entries(updates)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
    sets.push("updated_at = datetime('now')");
    params.push(p.id);
    run(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params);
    console.log(`  Updated "${name}": ${JSON.stringify(updates)}`);
    return p.id;
  }

  function addProduct(name, catId, price, unit, plu) {
    const existing = findProduct(name);
    if (existing) {
      console.log(`  EXISTS: "${name}" — updating price/unit`);
      updateProduct(name, { price, unit });
      return existing.id;
    }
    const id = uuid();
    run(`INSERT INTO products (id, name, category_id, price, unit, tax_rate, active, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1, datetime('now'))`, [id, name, catId, price, unit]);
    if (plu) run(`UPDATE products SET plu = ? WHERE id = ?`, [plu, id]);
    console.log(`  Added "${name}" @ $${price} ${unit} (cat: ${catId})`);
    return id;
  }

  function createDeal(name, type, config, productIds) {
    const dealId = uuid();
    run(`INSERT INTO deals (id, name, type, config, active) VALUES (?, ?, ?, ?, 1)`,
        [dealId, name, type, JSON.stringify(config)]);
    for (const pid of productIds) {
      if (pid) run(`INSERT INTO deal_products (deal_id, product_id, role) VALUES (?, ?, 'trigger')`, [dealId, pid]);
    }
    console.log(`  Deal: "${name}" (${type}) → ${productIds.length} products`);
    return dealId;
  }

  // Add missing categories
  const catIds = {};
  const cats = all("SELECT id, name FROM categories WHERE active = 1");
  for (const c of cats) catIds[c.name] = c.id;

  function ensureCategory(name, sortOrder) {
    if (catIds[name]) return catIds[name];
    const id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    run("INSERT OR IGNORE INTO categories (id, name, sort_order, active) VALUES (?, ?, ?, 1)", [id, name, sortOrder]);
    catIds[name] = id;
    console.log(`  Category: "${name}" (${id})`);
    return id;
  }

  const catBerries = ensureCategory('Berries', 130);
  const catBucket = ensureCategory('Bucket Specials', 140);
  const catTropical = ensureCategory('Tropical', 131);

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== VEGETABLES / GREENS ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Herbs', { price: 3.89 });
  updateProduct('Asian Vege', { price: 2.99 });
  updateProduct('Shallots', { price: 1.99 }); // Eschalots
  updateProduct('Leeks', { price: 3.49 });
  // Silverbeet $3.99 each — already correct
  updateProduct('Whole Celery', { price: 2.99 });
  updateProduct('Wombok', { price: 1.99 });
  updateProduct('Red Cabbage', { price: 3.99 });
  // Green Cabbage $3.99 each — already correct
  updateProduct('Jap', { price: 2.49 }); // Whole jap pumpkin
  updateProduct('Butternut', { price: 2.49 }); // Whole butternut
  updateProduct('Carrot Bag', { price: 2.69 });
  updateProduct('Carrots', { price: 3.69 });
  updateProduct('Beans', { price: 12.99 });
  updateProduct('Red Capsicum', { price: 5.99 });
  updateProduct('Yellow Capsicum', { price: 8.99 });
  updateProduct('Green Capsicum', { price: 7.99 });
  updateProduct('Green Zucchini', { price: 6.99 });
  updateProduct('Swiss Brown', { price: 16.90 });
  updateProduct('Flat Mushroom', { price: 14.90 });
  updateProduct('Button Mush', { price: 14.90 });
  updateProduct('Fennel', { price: 2.69 });
  updateProduct('Corn', { price: 1.49 });
  updateProduct('Peas', { price: 24.99 }); // Snow peas
  updateProduct('Red Chilli', { price: 12.90 });
  // Brussels Sprouts $12.99/kg — already correct
  updateProduct('Broccoli', { price: 4.59 });
  updateProduct('Chokos', { price: 6.99 });
  updateProduct('Parsnip', { price: 12.99 });
  updateProduct('Ginger', { price: 34.99 });
  updateProduct('Swedes', { price: 5.89 });
  updateProduct('Turnip', { price: 5.89 });

  // New veg products
  const snackCarrots = addProduct('Snacking Carrots', catIds['Vegetables'], 3.99, 'each', '20200');
  const babyCucumber = addProduct('Baby Cucumbers', catIds['Vegetables'], 3.99, 'each', '20201');
  const lebEggplant = addProduct('Lebanese Eggplant', catIds['Vegetables'], 9.99, 'kg', '20202');
  const broccolini = addProduct('Broccolini', catIds['Vegetables'], 3.99, 'each', '20203');
  const thaiEggplant = addProduct('Thai Eggplant', catIds['Vegetables'], 9.89, 'kg', '20204');
  const bitterGourd = addProduct('Bitter Gourd', catIds['Vegetables'], 5.99, 'kg', '20205');
  const japCut = addProduct('Jap Cut', catIds['Pumpkins'], 2.69, 'kg', '20206');
  const butternutCut = addProduct('Butternut Cut', catIds['Pumpkins'], 2.99, 'kg', '20207');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== POTATOES / ONIONS / GARLIC ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Potato Bag', { price: 5.99 });
  // Onion Bag $3.99 — already correct
  updateProduct('Garlic', { price: 29.89 });
  // Brown Onions $2.99/kg — already correct
  updateProduct('White Onion', { price: 7.99 });
  // Red Onion $4.99/kg — already correct
  updateProduct('Brushed', { price: 2.99 });
  updateProduct('Chat', { price: 4.89, unit: 'each' }); // Was kg, now per bag
  updateProduct('Potatoes Washed', { price: 5.59 });

  // New potato/onion products
  const redOnionBag = addProduct('Red Onion Bag', catIds['Onions'], 2.99, 'each', '20208');
  const pickOnionBag = addProduct('Pickling Onion Bag', catIds['Onions'], 3.49, 'each', '20209');
  const garlicBag = addProduct('Garlic Bag', catIds['Garlic'], 5.99, 'each', '20210');
  const sweetPotato = addProduct('Sweet Potato', catIds['Sweet Potatoes'], 3.99, 'kg', '20211');
  const whiteSweetPotato = addProduct('White Sweet Potato', catIds['Sweet Potatoes'], 6.99, 'kg', '20212');
  const dutchCream = addProduct('Dutch Cream', catIds['Potatoes'], 7.99, 'kg', '20213');
  const whiteWashBag = addProduct('Washed Potato Bag', catIds['Potatoes'], 2.89, 'each', '20214');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== SALAD / LETTUCE / TOMATOES ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Cauliflower', { price: 1.99 });
  // Kale $3.99 — already correct
  updateProduct('Iceberg Lettuce', { price: 1.99 });
  updateProduct('Cos', { price: 4.99 });
  updateProduct('Tomatoes', { price: 6.89 }); // Gourmet tomatoes
  updateProduct('Cucumbers', { price: 1.99 }); // Continental
  updateProduct('Roma', { price: 7.89 });
  // Truss $7.99/kg — already correct

  // New salad products
  const sugarloaf = addProduct('Sugarloaf Cabbage', catIds['Cabbage'], 2.99, 'each', '20215');
  const fancyLettuce = addProduct('Fancy Lettuce', catIds['Lettuces'], 3.99, 'each', '20216');
  const twinCos = addProduct('Twin Cos', catIds['Lettuces'], 3.99, 'each', '20217');
  const lebCucumber = addProduct('Lebanese Cucumber', catIds['Vegetables'], 5.89, 'kg', '20218');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== APPLES / CITRUS / PEARS / AVOCADO ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Navel Oranges', { price: 6.99 });
  updateProduct('Pink Lady', { price: 8.99 });
  updateProduct('Lemons', { price: 5.99 });
  updateProduct('Royal Gala Apples', { price: 6.89 });
  updateProduct('Granny Smith Apples', { price: 5.99 });
  updateProduct('Packham', { price: 5.89 });
  updateProduct('Red Delicious', { price: 5.89 });
  updateProduct('Imperial', { price: 4.89 });
  updateProduct('Jazz', { price: 6.89 });
  updateProduct('Avocado Hass', { price: 2.99 });
  updateProduct('Afourer', { price: 4.99 });
  updateProduct('Nashi', { price: 1.99, unit: 'each' }); // Was kg
  updateProduct('Grapefruit', { price: 3.99 });
  updateProduct('Lemon Bag', { price: 1.99 });
  // Rename Bartlett to William
  const bartlett = findProduct('Bartlett');
  if (bartlett) {
    run("UPDATE products SET name = 'William', price = 5.89, updated_at = datetime('now') WHERE id = ?", [bartlett.id]);
    console.log('  Renamed "Bartlett" → "William" @ $5.89');
  }
  updateProduct('Valencia', { price: 3.89 });
  updateProduct('Avo Bag', { price: 1.49, unit: 'kg' }); // Was each
  updateProduct('Custard Apple', { price: 12.99 });
  updateProduct('Persimmons', { price: 12.99 });
  updateProduct('Pomegranate', { price: 4.89 });
  updateProduct('Limes', { price: 1.99 });
  updateProduct('Passion Fruit', { price: 1.99 });
  updateProduct('Green Kiwi', { price: 14.89, unit: 'kg' }); // Was each
  updateProduct('Gold Kiwi', { price: 2.89 });
  updateProduct('Lady Finger', { price: 6.99 });
  updateProduct('Orange Bag', { price: 6.99 });
  updateProduct('Bananas', { price: 4.99 });

  // New apple/citrus products
  const kanzi = addProduct('Kanzi', catIds['Apples'], 7.99, 'kg', '20219');
  const sassy = addProduct('Sassy', catIds['Apples'], 6.49, 'kg', '20220');
  const caraCara = addProduct('Cara Cara', catIds['Oranges'], 5.89, 'kg', '20221');
  const missile = addProduct('Missile', catIds['Apples'], 4.99, 'kg', '20222');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== MELONS / TROPICAL ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Xl Pineapple', { price: 7.99 });
  // Sm Pineapple $3.99 — already correct
  updateProduct('Rockmelon', { price: 5.99, unit: 'each' }); // Was kg
  updateProduct('Honeydew', { price: 5.89, unit: 'each' }); // Was kg
  // Papaya Red $5.99/kg — already correct
  updateProduct('Coconut', { price: 4.49 });
  updateProduct('Dragon Fruit', { price: 15.99 });

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== BERRIES / GRAPES ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Strawberries Punnet', { price: 5.99 });
  updateProduct('Green Grapes', { price: 7.89 });
  updateProduct('Red Grapes', { price: 5.99 });
  updateProduct('Black Grapes', { price: 5.99 });

  // New berry products
  const blackberries = addProduct('Blackberries', catBerries, 2.99, 'each', '20223');
  const blueberries = addProduct('Blueberries', catBerries, 8.99, 'each', '20224');
  const farmStrawberries = addProduct('Farm Strawberries', catBerries, 5.89, 'each', '20225');
  const raspberries = addProduct('Raspberries', catBerries, 5.99, 'each', '20226');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== BUCKET / OUTSIDE SPECIALS ===');
  // ═══════════════════════════════════════════════════════════════
  updateProduct('Watermelon', { price: 0.99 }); // Whole seedless watermelon

  const bktEggplant = addProduct('Eggplant Bucket', catBucket, 2.89, 'kg', '20230');
  const bktGranny = addProduct('Granny Smith Bucket', catBucket, 1.99, 'kg', '20231');
  const bktLebCuc = addProduct('Leb Cucumber Bucket', catBucket, 2.89, 'kg', '20232');
  const bktBanana = addProduct('Bananas Bucket', catBucket, 1.99, 'kg', '20233');
  const bktLimes = addProduct('Limes Bucket', catBucket, 2.99, 'kg', '20234');
  const bktLemons = addProduct('Lemons Bucket', catBucket, 1.99, 'kg', '20235');
  const bktTomatoes = addProduct('Round Tomatoes Bucket', catBucket, 1.49, 'kg', '20236');
  const bktImperial = addProduct('Imperial Bucket', catBucket, 1.99, 'kg', '20237');
  const bktPinkLady = addProduct('Pink Lady Bucket', catBucket, 2.89, 'kg', '20238');
  const bktJap = addProduct('Jap Pumpkin Bucket', catBucket, 1.99, 'kg', '20239');
  const bktCauli = addProduct('Cauliflower Outside', catBucket, 1.99, 'each', '20240');
  const bktSweetPotato = addProduct('Sweet Potato Outside', catBucket, 1.49, 'kg', '20241');
  const redOnion10kg = addProduct('Red Onion 10kg', catBucket, 18.00, 'each', '20242');
  const brownOnion10kg = addProduct('Brown Onion 10kg', catBucket, 12.90, 'each', '20243');

  // Extra front / outside repeats
  const capsicumBag = addProduct('Red Capsicum Bag', catBucket, 2.49, 'kg', '20244');
  const twinCosBag = addProduct('Twin Cos Bag', catBucket, 0.79, 'each', '20245');
  const redPawPawCut = addProduct('Red Paw Paw Cut', catTropical, 6.49, 'kg', '20246');
  const watermelonCut = addProduct('Watermelon Cut', catIds['Melons'], 1.49, 'kg', '20247');

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== DEALS ===');
  // ═══════════════════════════════════════════════════════════════

  // Clear existing deals
  run("DELETE FROM deal_products");
  run("DELETE FROM deals");

  // Helper to find product ID by name
  function pid(name) {
    const p = findProduct(name);
    if (!p) { console.log(`  WARN: deal product "${name}" not found`); return null; }
    return p.id;
  }

  createDeal('Carrot Bags 2 for $5', 'multi_buy', { qty: 2, price: 5 }, [pid('Carrot Bag')]);
  createDeal('Fennel 2 for $4', 'multi_buy', { qty: 2, price: 4 }, [pid('Fennel')]);
  createDeal('Sweet Corn 2 for $2', 'multi_buy', { qty: 2, price: 2 }, [pid('Corn')]);
  createDeal('Hass Avocado 2 for $5', 'multi_buy', { qty: 2, price: 5 }, [pid('Avocado Hass')]);
  createDeal('Limes 3 for $5', 'multi_buy', { qty: 3, price: 5 }, [pid('Limes')]);
  createDeal('Gold Kiwi 2 for $5', 'multi_buy', { qty: 2, price: 5 }, [pid('Gold Kiwi')]);
  createDeal('Blackberries 2 for $5', 'multi_buy', { qty: 2, price: 5 }, [pid('Blackberries')]);
  createDeal('Twin Cos Bags 2 for $1', 'multi_buy', { qty: 2, price: 1 }, [pid('Twin Cos Bag')]);

  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== SUMMARY ===');
  // ═══════════════════════════════════════════════════════════════

  // Count products by unit
  const unitCounts = all("SELECT unit, COUNT(*) as cnt FROM products WHERE active = 1 GROUP BY unit ORDER BY unit");
  for (const r of unitCounts) console.log(`  ${r.unit}: ${r.cnt} products`);

  const totalProducts = all("SELECT COUNT(*) as cnt FROM products WHERE active = 1");
  console.log(`  Total active products: ${totalProducts[0].cnt}`);

  const totalDeals = all("SELECT COUNT(*) as cnt FROM deals WHERE active = 1");
  console.log(`  Total active deals: ${totalDeals[0].cnt}`);

  // Save
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('\nDatabase saved to', DB_PATH);
}

main().catch(e => { console.error(e); process.exit(1); });
