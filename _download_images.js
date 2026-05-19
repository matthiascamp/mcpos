const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DEST = path.join(__dirname, 'pos', 'images', 'products');

function extractUrls() {
  const urls = new Set();
  const re = /https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp)/gi;
  for (const f of ['db/keyboard-catpages.js', 'db/keyboard-subpages.js', 'main.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    for (const m of src.matchAll(re)) {
      const url = m[0];
      if (!url.includes('${')) urls.add(url);
    }
  }
  return [...urls].sort();
}

function urlToFilename(url) {
  if (url.includes('shop.coles.com.au')) {
    const m = url.match(/\/(\d+-zm)\.(jpg|png)/);
    return m ? `coles-${m[1]}.${m[2]}` : null;
  }
  if (url.includes('woolworths.media')) {
    const m = url.match(/\/(\d+)\.(jpg|png)/);
    return m ? `woolworths-${m[1]}.${m[2]}` : null;
  }
  if (url.includes('pngimg.com')) {
    const m = url.match(/\/([^/]+)\.(png|jpg)/);
    return m ? `pngimg-${m[1]}.${m[2]}` : null;
  }
  if (url.includes('ubgeneralstore')) {
    return 'gas-bottle.jpg';
  }
  if (url.includes('pexels.com')) {
    const m = url.match(/pexels-photo-(\d+)\.(jpeg|jpg|png)/);
    return m ? `pexels-${m[1]}.${m[2]}` : null;
  }
  const basename = path.basename(new URL(url).pathname);
  return basename || null;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(); });
      ws.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  const urls = extractUrls();
  console.log(`Found ${urls.length} image URLs`);

  let downloaded = 0, skipped = 0, failed = 0;
  const concurrency = 10;
  let i = 0;

  async function worker() {
    while (i < urls.length) {
      const idx = i++;
      const url = urls[idx];
      const fname = urlToFilename(url);
      if (!fname) { console.log(`  SKIP (no filename): ${url}`); skipped++; continue; }
      const dest = path.join(DEST, fname);
      if (fs.existsSync(dest)) { skipped++; continue; }
      try {
        await download(url, dest);
        downloaded++;
        if (downloaded % 20 === 0) console.log(`  ... downloaded ${downloaded}`);
      } catch (e) {
        console.log(`  FAIL: ${fname} - ${e.message}`);
        failed++;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  console.log(`\nDone: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
  console.log(`Images saved to: ${DEST}`);
}

main().catch(console.error);
