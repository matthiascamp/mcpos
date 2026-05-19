const fs = require('fs');
let c = fs.readFileSync('db/keyboard-catpages.js', 'utf8');

// Fix dangling backslash from previous incomplete strip: "LABEL\" → "LABEL"
c = c.replace(/"label": "([^"\\]+)\\",/g, '"label": "$1",');

fs.writeFileSync('db/keyboard-catpages.js', c, 'utf8');

// Verify
const remaining = c.match(/"label": "[^"]*\\"/g);
console.log('Remaining backslash labels:', remaining ? remaining.length : 0);
const priceLabels = c.match(/\$\d+\.\d+/g);
console.log('Remaining price refs:', priceLabels ? priceLabels.length : 0);
