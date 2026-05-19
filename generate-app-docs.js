const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, TableLayoutType, ShadingType } = require('docx')
const fs = require('fs')
const path = require('path')

const GREEN = '4FBD77'
const DARK = '1A1D27'
const GRAY = '6B7280'

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: level === HeadingLevel.HEADING_1 ? GREEN : DARK,
      size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 24 })] })
}

function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: opts.noSpace ? 0 : 120 }, alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text, size: opts.size || 22, color: opts.color || '333333', bold: opts.bold, italics: opts.italic })] })
}

function bullet(text, level = 0) {
  return new Paragraph({ bullet: { level }, spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, color: '333333' })] })
}

function richBullet(boldPart, rest, level = 0) {
  return new Paragraph({ bullet: { level }, spacing: { after: 60 },
    children: [new TextRun({ text: boldPart, bold: true, size: 22 }), new TextRun({ text: rest, size: 22, color: '333333' })] })
}

function cell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { type: ShadingType.SOLID, color: DARK } : undefined,
    children: [new Paragraph({ spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, size: 20, bold: opts.header || opts.bold, color: opts.header ? 'FFFFFF' : '333333' })] })]
  })
}

function tableRow(cells, header = false) {
  return new TableRow({ children: cells.map((c, i) => cell(c, { header, width: undefined })) })
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r))
    ]
  })
}

// Load logo
let logoRun = null
const logoPath = path.join(__dirname, 'pos', 'logo-circle.png')
if (fs.existsSync(logoPath)) {
  logoRun = new ImageRun({ data: fs.readFileSync(logoPath), transformation: { width: 100, height: 100 }, type: 'png' })
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } }
    }
  },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    children: [
      // ─── Title Page ───
      new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER,
        children: logoRun ? [logoRun] : [] }),
      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Tillaroo', size: 72, bold: true, color: GREEN })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: 'Point of Sale System', size: 32, color: GRAY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: 'Product Documentation', size: 28, color: GRAY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 },
        children: [new TextRun({ text: `Version 1.0.0  •  ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })}`, size: 22, color: GRAY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 },
        children: [new TextRun({ text: 'by Matthias Campbell', size: 22, color: GRAY, italics: true })] }),

      // ─── Overview ───
      heading('Overview'),
      para('Tillaroo is a modern, full-featured point-of-sale (POS) system built as a desktop application. Designed for Australian retail environments, it handles everything from scanning products and processing payments to managing inventory, running reports, and syncing data to the cloud.'),
      para('The system is built on Electron (Chromium + Node.js), giving it the performance of a native desktop app with the flexibility of web technologies. Data is stored locally in SQLite for fast, offline-first operation, with optional cloud sync via Supabase.'),

      heading('Key Features', HeadingLevel.HEADING_2),
      richBullet('Touch-Optimised Register — ', 'Full POS register with configurable keyboard grid, barcode scanning, numpad, and quick-access department buttons'),
      richBullet('Australian GST Compliance — ', 'Tax-inclusive pricing with GST extracted for reporting. ABN displayed on receipts.'),
      richBullet('Offline-First — ', 'All data stored locally in SQLite. Works without internet; syncs when connectivity is restored.'),
      richBullet('Multi-Display Support — ', 'Customer-facing display on a second monitor showing live cart, deals, and branding.'),
      richBullet('Cloud Sync — ', 'Optional Supabase integration for multi-store data synchronisation and real-time updates.'),
      richBullet('LAN Networking — ', 'Multiple registers can sync over LAN with a server/client architecture.'),
      richBullet('Hardware Integration — ', 'ESC/POS receipt printers, cash drawers, barcode scanners (including OPOS), and RS-232 scales.'),
      richBullet('Comprehensive Admin Panel — ', '13-tab admin interface covering sales, inventory, staff, reports, and system configuration.'),

      // ─── POS Register ───
      heading('POS Register'),
      para('The register is the cashier-facing screen used for day-to-day transactions. It launches in fullscreen/kiosk mode for a distraction-free experience.'),

      heading('Login', HeadingLevel.HEADING_2),
      para('The register is protected by a PIN-based login system. Each staff member has a 4–6 digit PIN. On startup, a full-screen login overlay appears with a numeric keypad. Staff enter their PIN and press OK to authenticate. The system supports three roles: Cashier, Manager, and Admin, each with different permission levels.'),

      heading('Register Layout', HeadingLevel.HEADING_2),
      richBullet('Status Bar — ', 'Top bar showing store name, company logo, search button, staff name, Admin link, and real-time totals display.'),
      richBullet('Cart Panel — ', 'Left sidebar (300px) showing the current sale: item list with name, quantity, unit price, line total, and +/− quantity controls. Subtotal, GST, and total are shown at the bottom along with Pay Cash, Card/EFTPOS, and Park buttons.'),
      richBullet('Keyboard Panel — ', 'Main area with a configurable grid of buttons: function keys (top rows), department buttons, numpad with LED-style display, and product quick-access buttons.'),
      richBullet('Bottom Navigation — ', 'Category navigation buttons (e.g. Fruit A–M, Veg H–Z, Grocery) for browsing products by department.'),

      heading('Scanning & Adding Products', HeadingLevel.HEADING_2),
      para('Products can be added to the cart in several ways:'),
      bullet('Barcode scanning — Scan a barcode/PLU to add directly to cart'),
      bullet('Search — Click the Search button or press F1, type a product name or barcode'),
      bullet('Keyboard buttons — Tap a product button on the register keyboard'),
      bullet('Department navigation — Browse by category, then select a product'),
      bullet('PLU lookup — Type a code on the numpad and press CODE ENTER'),
      bullet('Numpad + open price — Type a price (in cents) on the numpad, then tap an open-price department button'),

      heading('Quantity & Weight', HeadingLevel.HEADING_2),
      para('For "each" items: type a number on the numpad and press QTY X before scanning/tapping. For items sold by weight (kg or 100g): a weight entry modal appears. If a scale is connected, the weight is read automatically; otherwise the cashier enters it manually.'),

      heading('Payment', HeadingLevel.HEADING_2),
      para('Press SUB TOTAL or the Pay Cash button to open the payment modal. Options include:'),
      richBullet('Cash — ', 'Quick buttons for Exact, $5, $10, $20, $50, $100, or type a custom amount. Change is calculated and displayed.'),
      richBullet('Card/EFTPOS — ', 'Records the payment as card. If a Tyro terminal is configured, it integrates directly.'),
      richBullet('Account — ', 'Charge to a customer account.'),
      richBullet('Park Sale — ', 'Hold the current sale and start a new one. Parked sales can be recalled later.'),
      para('On completion, the receipt is printed (if a printer is connected), the cash drawer opens, and a sale-complete animation plays.'),

      heading('Register Functions', HeadingLevel.HEADING_2),
      simpleTable(
        ['Button', 'Function'],
        [
          ['VOID / ERROR CORRECT', 'Remove the last item from the cart'],
          ['HOLD SALE', 'Park the current sale for later recall'],
          ['NO SALE / MOVE DRAWER', 'Open the cash drawer without a sale'],
          ['PRICE CHECK', 'Search for a product and view its price, stock, and details'],
          ['RECALL SALE', 'Retrieve a previously parked/held sale'],
          ['LOCK', 'Lock the register and show the PIN login screen'],
          ['SUPERVISOR', 'Prompt for a manager/admin PIN to enable elevated mode for 60 seconds'],
          ['REPRINT', 'Reprint the last completed receipt'],
          ['RETURN', 'Enter return mode to process refunds (items scan as negative)'],
          ['% DISCOUNT', 'Apply a percentage discount to the whole sale'],
          ['% ONE ITEM', 'Apply a percentage discount to the last item only'],
          ['UBER EATS ADJ', 'Add a 30% markup to the current sale for delivery orders'],
        ]
      ),

      heading('Keyboard Shortcuts', HeadingLevel.HEADING_2),
      simpleTable(
        ['Key', 'Action'],
        [
          ['F1', 'Focus barcode/search input'],
          ['F2', 'Open cash payment modal'],
          ['F3', 'Card/EFTPOS payment'],
          ['F4', 'Clear cart'],
          ['F7', 'Price check'],
          ['F11', 'Toggle fullscreen'],
          ['Escape', 'Close modals / exit kiosk mode'],
          ['Backspace', 'Go back to previous section'],
        ]
      ),

      // ─── Customer Display ───
      heading('Customer Display'),
      para('When a second monitor is connected, Tillaroo automatically opens a customer-facing display. This shows:'),
      bullet('Idle screen with today\'s deals and specials, store branding, and QR code placeholder'),
      bullet('Live cart view during a transaction — items, quantities, prices, and running total'),
      bullet('Sale complete animation with total and change due'),
      para('The display updates in real time as items are scanned and the cart changes.'),

      // ─── Admin Panel ───
      heading('Admin Panel'),
      para('The admin panel is the default landing screen and provides full control over the system. It features a dark-themed sidebar with 13 tabs.'),

      heading('Dashboard', HeadingLevel.HEADING_2),
      para('Overview of today\'s sales performance. Shows four stat cards — Total Sales, Transaction Count, Tax Collected, and Discounts — plus a table of top-selling products by quantity and revenue.'),

      heading('Transactions', HeadingLevel.HEADING_2),
      para('Searchable list of all transactions with date filtering. View transaction details including items, payment method, staff member, and status (completed, voided, refunded, parked). Supports voiding and reprinting past transactions.'),

      heading('Cash Drawer', HeadingLevel.HEADING_2),
      para('Cash management interface for tracking drawer operations. Records float amounts at shift start, pickups during the day, and reconciliation at close. Maintains a full audit trail of all drawer movements.'),

      heading('Z-Report', HeadingLevel.HEADING_2),
      para('End-of-day reporting tool. Generates a comprehensive summary of the day\'s trading including total sales by payment method, transaction counts, average sale value, and cash reconciliation. Can be printed for record-keeping.'),

      heading('Products', HeadingLevel.HEADING_2),
      para('Full product catalogue management. Search, add, edit, and deactivate products. Fields include:'),
      simpleTable(
        ['Field', 'Description'],
        [
          ['Name', 'Product display name'],
          ['Barcode', 'EAN/UPC barcode for scanning'],
          ['PLU', 'Short numeric lookup code'],
          ['Category', 'Product category for organisation and navigation'],
          ['Sell Price', 'Tax-inclusive retail price'],
          ['Cost Price', 'Purchase cost for margin reporting'],
          ['Unit', 'each, kg, 100g, or litre — determines how the product is sold'],
          ['Tax Rate', 'GST rate (default 10%, 0% for fresh produce)'],
          ['Track Stock', 'Enable stock quantity tracking and decrement on sale'],
          ['Image URL', 'Product image for display on buttons and grids'],
        ]
      ),

      heading('Labels', HeadingLevel.HEADING_2),
      para('Generate and print shelf labels and price tags for products. Select products, choose a label format, and print via the receipt printer or export for external printing.'),

      heading('Deals & Promotions', HeadingLevel.HEADING_2),
      para('Create and manage promotional offers. Supported deal types:'),
      simpleTable(
        ['Type', 'Example', 'Configuration'],
        [
          ['Multi-Buy', '3 Apples for $5', 'Quantity + deal price (supports tiered pricing)'],
          ['Buy X Get Y', 'Buy 2 Get 1 Free', 'Buy quantity + free quantity'],
          ['Percentage Discount', '20% off Bananas', 'Discount percentage'],
          ['Dollar Discount', '$2 off Coffee', 'Discount amount'],
          ['Combo', 'Lunch deal: Sandwich + Drink for $10', 'Bundle quantity + price'],
        ]
      ),
      para('Each deal has optional start/end dates and is linked to specific products. Active deals are applied automatically at the register.'),

      heading('Staff', HeadingLevel.HEADING_2),
      para('Manage staff members. Each staff record includes a name, PIN (4–6 digits), and role (Cashier, Manager, or Admin). Staff can be activated or deactivated without deletion. The PIN is used for register login, supervisor mode, and audit tracking.'),

      heading('Keyboard Layout Editor', HeadingLevel.HEADING_2),
      para('Visual drag-and-drop editor for customising the register keyboard layout. Features include:'),
      bullet('Multiple pages — create separate layouts for different departments'),
      bullet('Configurable grid size — 6, 8, 10, or 12 columns; 5, 7, 8, or 10 rows'),
      bullet('Drag-select empty cells to create multi-span buttons'),
      bullet('Drag existing buttons to rearrange them'),
      bullet('Product sidebar — search and click to place products on the grid'),
      bullet('Customise each button: label, function type, colours, image, category filter, price'),
      bullet('Image upload for product buttons (up to 512px, PNG format)'),
      para('Button types include: fixed price, open price, section navigation, category filter, numpad, payment, and all register functions.'),

      heading('Network', HeadingLevel.HEADING_2),
      para('Configure hardware and network settings:'),
      richBullet('LAN Sync — ', 'Set up server/client mode for multi-register environments. The server register hosts the master database; clients sync automatically over the local network.'),
      richBullet('Hardware Status — ', 'Probe and detect connected POS peripherals (receipt printer, cash drawer, barcode scanner, scale) with diagnostic information.'),
      richBullet('OPOS Scanner — ', 'Configuration for OPOS-compatible barcode scanners (e.g. Datalogic Magellan 3200VSi table scanner).'),

      heading('Insights', HeadingLevel.HEADING_2),
      para('Advanced analytics and reporting beyond the daily dashboard. Sales trends, category performance, and product-level analysis to help identify patterns and opportunities.'),

      heading('Audit Log', HeadingLevel.HEADING_2),
      para('Chronological log of all significant system actions: logins, logouts, voids, refunds, price changes, settings modifications, and supervisor mode activations. Each entry records the staff member, timestamp, action, and details.'),

      heading('System Logs', HeadingLevel.HEADING_2),
      para('Technical application logs for troubleshooting. Shows timestamped entries from all subsystems (database, hardware, sync, scanner) with severity levels (info, warn, error, fatal). Logs are stored per day and automatically pruned after 14 days.'),

      heading('Settings', HeadingLevel.HEADING_2),
      para('Global system configuration:'),
      richBullet('Store Details — ', 'Store name, ABN, address, phone, register ID, and company logo upload.'),
      richBullet('Tax — ', 'Tax name (GST) and rate configuration. Prices are tax-inclusive; tax is extracted at the configured rate for reporting.'),
      richBullet('Receipt — ', 'Customisable header and footer text printed on every receipt.'),
      richBullet('Cloud Sync — ', 'Supabase URL and API key for cloud synchronisation.'),
      richBullet('Display — ', 'Fullscreen/kiosk mode preference.'),

      // ─── Hardware ───
      heading('Hardware Support'),
      para('Tillaroo supports the following POS peripherals:'),

      simpleTable(
        ['Device', 'Connection', 'Details'],
        [
          ['Receipt Printer', 'USB (ESC/POS)', 'Epson, Seiko, Star Micronics and compatible thermal printers. Prints transaction receipts, Z-reports, and labels.'],
          ['Cash Drawer', 'Printer DK port', 'Connected via the receipt printer\'s RJ-11 kick connector. Opens automatically on cash sale or manually via NO SALE.'],
          ['Barcode Scanner', 'USB HID / OPOS', 'Any USB barcode scanner in keyboard-emulation mode. Also supports OPOS for table-mount scanners like the Datalogic Magellan 3200VSi.'],
          ['Scale', 'RS-232 Serial', 'Mettler Toledo Ariva-S and compatible scales. Auto-reads stable weight for products sold by kg or 100g.'],
          ['Customer Display', 'Second monitor', 'Any HDMI/DisplayPort secondary display. Automatically detected and used for the customer-facing screen.'],
        ]
      ),

      // ─── Data & Sync ───
      heading('Data & Synchronisation'),

      heading('Local Database', HeadingLevel.HEADING_2),
      para('All data is stored in a local SQLite database via sql.js (WebAssembly). The database file is located in the application data directory. Changes are saved asynchronously with a 3-second debounce to minimise I/O impact. Automatic backups are created on startup and daily, with the last 14 backups retained.'),

      heading('Cloud Sync (Supabase)', HeadingLevel.HEADING_2),
      para('When configured, changes to products, categories, specials, and deals are queued in a sync table and pushed to a Supabase (PostgreSQL) backend. Real-time subscriptions pull remote changes back to the local database automatically. This enables multi-store synchronisation and cloud backup.'),

      heading('LAN Sync', HeadingLevel.HEADING_2),
      para('For multi-register setups within a single store, Tillaroo supports LAN synchronisation. One register is configured as the server (hosts the master database) and others connect as clients. Product, category, deal, and keyboard layout changes propagate automatically over the local network.'),

      // ─── Tax ───
      heading('Australian GST Compliance'),
      para('Tillaroo follows Australian GST rules:'),
      bullet('All prices are tax-inclusive (shelf price = final price)'),
      bullet('GST is extracted from the inclusive price: tax = price × rate ÷ (1 + rate)'),
      bullet('Default rate is 10% GST'),
      bullet('Fresh produce (fruit, vegetables, meat, bread, dairy) is GST-free (0%)'),
      bullet('Snacks, drinks, and non-food items attract the standard 10% rate'),
      bullet('ABN is displayed on all receipts'),
      bullet('Z-Reports include tax collected totals for BAS reporting'),

      // ─── Technical ───
      heading('Technical Overview'),
      simpleTable(
        ['Component', 'Technology'],
        [
          ['Application Framework', 'Electron v33.2.0 (Chromium + Node.js)'],
          ['Database', 'SQLite via sql.js (WebAssembly)'],
          ['Frontend', 'Vanilla JavaScript + HTML/CSS (no framework, no build step)'],
          ['Cloud Backend', 'Supabase (PostgreSQL + real-time subscriptions)'],
          ['Receipt Printing', 'ESC/POS commands via USB or PowerShell raw print'],
          ['Scanner Integration', 'OPOS COM bridge (32-bit) for table-mount scanners'],
          ['Desktop Platforms', 'Windows (portable .exe and NSIS installer)'],
          ['IPC Architecture', 'Electron contextBridge + ipcMain/ipcRenderer'],
        ]
      ),

      heading('System Requirements', HeadingLevel.HEADING_2),
      bullet('Windows 10 or later (64-bit)'),
      bullet('4 GB RAM minimum'),
      bullet('100 MB disk space for application + database'),
      bullet('USB ports for receipt printer, scanner, and scale'),
      bullet('Optional: second display for customer-facing screen'),
      bullet('Optional: internet connection for cloud sync'),

      // ─── Footer ───
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '─────────────────────────────────────', color: 'CCCCCC', size: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
        children: [new TextRun({ text: 'Tillaroo POS  •  tillaroo.com', size: 20, color: GRAY, italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `© ${new Date().getFullYear()} Matthias Campbell. All rights reserved.`, size: 18, color: GRAY })] }),
    ]
  }]
})

Packer.toBuffer(doc).then(buf => {
  const outPath = path.join(__dirname, 'Tillaroo_POS_Documentation.docx')
  fs.writeFileSync(outPath, buf)
  console.log('Generated: ' + outPath)
}).catch(err => { console.error('Error:', err) })
