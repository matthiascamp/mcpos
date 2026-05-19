const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR)

const TABS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'products', name: 'Products' },
  { id: 'deals', name: 'Deals' },
  { id: 'staff', name: 'Staff' },
  { id: 'transactions', name: 'Transactions' },
  { id: 'cashclose', name: 'Cash & Close' },
  { id: 'settings', name: 'Settings' },
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  })

  // Load the main page first for POS register screenshot
  win.loadFile(path.join(__dirname, 'pos', 'index.html'))
  await new Promise(r => win.webContents.once('did-finish-load', r))
  await sleep(2000)
  win.show()
  await sleep(500)

  // Capture POS register (login screen)
  let img = await win.capturePage()
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'pos-register.png'), img.toPNG())
  console.log('Captured: pos-register.png')

  // Now load admin page
  win.loadFile(path.join(__dirname, 'pos', 'admin.html'))
  await new Promise(r => win.webContents.once('did-finish-load', r))
  await sleep(2500)

  // Capture each tab
  for (const tab of TABS) {
    await win.webContents.executeJavaScript(`
      (function() {
        document.querySelectorAll('.sidebar a').forEach(n => n.classList.remove('active'));
        const link = document.querySelector('.sidebar a[data-tab="${tab.id}"]');
        if (link) { link.classList.add('active'); link.click(); }
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-sub-panel').forEach(t => t.classList.remove('active'));
        const el = document.getElementById('tab-${tab.id}');
        if (el) el.classList.add('active');
      })()
    `)
    await sleep(1500)

    img = await win.capturePage()
    fs.writeFileSync(path.join(SCREENSHOT_DIR, `admin-${tab.id}.png`), img.toPNG())
    console.log(`Captured: admin-${tab.id}.png`)
  }

  // Capture the Products > All Products sub-tab
  await win.webContents.executeJavaScript(`
    (function() {
      const btn = document.querySelector('#tab-products .settings-nav button[data-prod-sub="list"]');
      if (btn) btn.click();
    })()
  `)
  await sleep(1000)
  img = await win.capturePage()
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'admin-products-list.png'), img.toPNG())
  console.log('Captured: admin-products-list.png')

  // Capture Settings > Network sub-tab
  await win.webContents.executeJavaScript(`
    (function() {
      const link = document.querySelector('.sidebar a[data-tab="settings"]');
      if (link) link.click();
      setTimeout(() => {
        const btn = document.querySelector('#tab-settings .settings-nav button[data-settings-sub="network"]');
        if (btn) btn.click();
      }, 300);
    })()
  `)
  await sleep(2000)
  img = await win.capturePage()
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'admin-settings-network.png'), img.toPNG())
  console.log('Captured: admin-settings-network.png')

  // Capture Settings > Insights sub-tab
  await win.webContents.executeJavaScript(`
    (function() {
      const btn = document.querySelector('#tab-settings .settings-nav button[data-settings-sub="insights"]');
      if (btn) btn.click();
    })()
  `)
  await sleep(2000)
  img = await win.capturePage()
  fs.writeFileSync(path.join(SCREENSHOT_DIR, 'admin-settings-insights.png'), img.toPNG())
  console.log('Captured: admin-settings-insights.png')

  console.log(`\nAll screenshots saved to: ${SCREENSHOT_DIR}`)
  app.quit()
})
