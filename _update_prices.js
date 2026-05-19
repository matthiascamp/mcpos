const fs = require('fs');

const updates = {
  'pg5-herbs':        3.89,
  'pg4-asian-vege':   2.99,
  'pg4-beans':       12.99,
  'pg4-broccoli':     4.59,
  'pg4-capsicum':     5.99,
  'pg4-carrot-bag':   2.69,
  'pg4-carrots':      3.69,
  'pg4-cauliflower':  1.99,
  'pg4-chillies':    12.90,
  'pg4-chokos':       6.99,
  'pg4-corn':         1.49,
  'pg4-cucumbers':    3.99,
  'pg4-fennel':       2.69,
  'pg4-garlic':      29.89,
  'pg4-ginger':      34.99,
  'pg4-leb-eggplant': 9.99,
  'pg4-celery':       2.99,
  'pg5-leeks':        3.49,
  'pg5-parsnip':     12.99,
  'pg5-shallots':     1.99,
  'pg5-snow-peas':   24.99,
  'pg5-swedes':       5.89,
  'pg5-tomatoes':     6.89,
  'pg5-turnip':       5.89,
  'pg2-coconut':      4.49,
  'pg2-custard-apple':12.99,
  'pg2-dragon-fruit': 15.99,
  'pg2-grapefruit':   3.99,
  'pg3-passion-fruit':1.99,
  'pg3-persimmons':  12.99,
  'pg3-pomegranate':  4.89,
  'pg3-pineapple-md': 3.99,
  'pg3-pineapple-xl': 7.99,
};

let content = fs.readFileSync('db/keyboard-catpages.js', 'utf8');
let changed = 0;

for (const [id, newPrice] of Object.entries(updates)) {
  // Find the button block and its price line
  const escaped = id.replace(/[-]/g, '\\-');
  const blockRe = new RegExp(`("id": "${id}"[\\s\\S]*?"price": )(\\d+\\.?\\d*)`);
  const m = content.match(blockRe);
  if (m) {
    const old = parseFloat(m[2]);
    if (Math.abs(old - newPrice) > 0.001) {
      content = content.replace(blockRe, `$1${newPrice}`);
      console.log(`  ${id.padEnd(25)} $${old.toFixed(2)} -> $${newPrice.toFixed(2)}`);
      changed++;
    }
  } else {
    console.log(`  NOT FOUND: ${id}`);
  }
}

// Bump version
content = content.replace(/const VERSION = "[^"]+"/, 'const VERSION = "2026-05-18-p"');

fs.writeFileSync('db/keyboard-catpages.js', content, 'utf8');
console.log(`\nUpdated ${changed} prices, version bumped to 2026-05-18-p`);
