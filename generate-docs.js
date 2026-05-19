const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType } = require('docx')
const fs = require('fs')
const path = require('path')

const SCREENSHOTS = path.join(__dirname, 'screenshots')

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] })
}

function para(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })] })
}

function bold(text) {
  return new Paragraph({ children: [new TextRun({ text, bold: true })] })
}

function bullet(text) {
  return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(text)] })
}

function subBullet(text) {
  return new Paragraph({ bullet: { level: 1 }, children: [new TextRun(text)] })
}

function spacer() {
  return new Paragraph({ children: [] })
}

function tableRow(cells, header = false) {
  return new TableRow({
    children: cells.map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 20 })] })],
      width: { size: Math.floor(10000 / cells.length), type: WidthType.DXA },
    }))
  })
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r))
    ]
  })
}

function screenshot(filename, caption) {
  const filePath = path.join(SCREENSHOTS, filename)
  if (!fs.existsSync(filePath)) {
    return [para(`[Screenshot not available: ${filename}]`, { italics: true, color: '999999' }), spacer()]
  }
  const imgData = fs.readFileSync(filePath)
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: imgData,
          transformation: { width: 620, height: 398 },
          type: 'png',
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: caption, italics: true, size: 18, color: '666666' })]
    }),
    spacer(),
  ]
}

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      // Title Page
      heading('Crisp POS — Application Documentation'),
      para('Comprehensive guide to the Crisp POS system', { italics: true, color: '666666' }),
      para(`Generated: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`),
      spacer(),

      // Overview
      heading('1. Application Overview'),
      para('Crisp POS is an Electron-based point-of-sale system designed for retail shops. It runs as a desktop application on Windows, with a local SQLite database, optional cloud sync via Supabase, and LAN multi-register support.'),
      spacer(),
      bold('Key Features:'),
      bullet('Full POS register with barcode scanning, weighted products, and multi-payment support'),
      bullet('Admin panel with 8+ management tabs'),
      bullet('Offline-first architecture — works without internet'),
      bullet('LAN sync for multi-register deployments (server/client model)'),
      bullet('Cloud sync via Supabase for backup and remote management'),
      bullet('ESC/POS receipt printing and cash drawer control'),
      bullet('Price tag / label designer and printer'),
      bullet('Linkly EFTPOS terminal integration'),
      spacer(),
      bold('Tech Stack:'),
      bullet('Electron v33.2.0 (Chromium + Node.js desktop app)'),
      bullet('sql.js v1.11+ (SQLite via WebAssembly)'),
      bullet('Vanilla JS + HTML — no build step, no framework'),
      bullet('IPC bridge via contextBridge/ipcRenderer'),
      spacer(),

      // POS Register
      heading('2. POS Register Screen'),
      para('The main register screen (pos/index.html) is the cashier-facing interface used during daily operations. It occupies the full screen in kiosk mode.'),
      spacer(),
      ...screenshot('pos-register.png', 'Figure 1: POS Register — Login screen with PIN pad'),
      spacer(),

      heading('2.1 Layout', HeadingLevel.HEADING_2),
      bullet('Login Overlay — Full-screen PIN login (visible until staff authenticates)'),
      bullet('Status Bar — Store name, barcode input field, staff badge, sync indicator, health dots'),
      bullet('Cart Panel (300px sidebar) — Current sale items, totals, Pay Cash / Card / Park buttons'),
      bullet('Keyboard Panel — Register function buttons, department buttons, numpad with LED display'),
      bullet('Bottom Bar — Navigation buttons loaded from database'),
      bullet('Footer — Lane ID and clerk name'),
      spacer(),

      heading('2.2 Transaction Flow', HeadingLevel.HEADING_2),
      bullet('1. Staff logs in via PIN pad'),
      bullet('2. Items added via barcode scan, PLU code, or keyboard buttons'),
      bullet('3. Weighted products (kg/100g) trigger a weight entry modal'),
      bullet('4. Quantity multiplier via numpad: type number, press QTY X'),
      bullet('5. Open-price items: cashier enters price in cents'),
      bullet('6. Subtotal → Cash modal with quick-tender buttons ($5/$10/$20/$50/$100)'),
      bullet('7. Payment confirmed → receipt prints, drawer opens, sale completes'),
      spacer(),

      heading('2.3 Register Functions', HeadingLevel.HEADING_2),
      simpleTable(['Button', 'Function'], [
        ['VOID / ERROR CORRECT', 'Remove last item from cart'],
        ['HOLD SALE', 'Park current cart (retrieve later with RECALL)'],
        ['NO SALE / MOVE DRAWER', 'Open cash drawer without a sale'],
        ['PRICE CHECK', 'View/change price of last item'],
        ['RECALL SALE', 'Restore a previously parked transaction'],
        ['LOCK', 'Lock register, show PIN login overlay'],
        ['SUPERVISOR', 'Prompt for manager PIN, enables elevated access for 60s'],
        ['REPRINT', 'Reprint last completed receipt'],
        ['RETURN', 'Toggle return mode (items scan as negative)'],
        ['% DISCOUNT', 'Percentage off whole sale'],
        ['% ONE ITEM', 'Percentage off last item only'],
        ['UBER EATS ADJ', 'Add 30% markup to current sale'],
      ]),
      spacer(),

      heading('2.4 Keyboard Shortcuts', HeadingLevel.HEADING_2),
      bullet('F1 — Focus barcode input'),
      bullet('F2 — Open cash payment modal'),
      bullet('F3 — Card/EFTPOS payment'),
      bullet('F4 — Clear cart'),
      bullet('F11 — Toggle fullscreen/kiosk mode'),
      bullet('Escape — Close modals or pop section'),
      spacer(),

      // Admin Panel
      heading('3. Admin Panel'),
      para('The admin panel (pos/admin.html) provides management tools organized into a sidebar-navigated interface with a dark theme. It includes Dashboard, Products, Deals, Price Tags, Transactions, Cash & Close, Staff, Keyboard, and Settings tabs.'),
      spacer(),

      // Dashboard
      heading('3.1 Dashboard', HeadingLevel.HEADING_2),
      para('Displays daily sales summary with date navigation including prev/next/today buttons, date picker, and quick presets (Yesterday, This Week).'),
      ...screenshot('admin-dashboard.png', 'Figure 2: Admin Dashboard — Daily sales summary with charts'),
      bullet('6 stat cards: Sales, Transactions, Avg Transaction, GST Collected, Discounts, Voids/Refunds'),
      bullet('Sales by Hour — bar chart showing hourly transaction volume'),
      bullet('Payment Methods — breakdown with percentage bars (cash, card, eftpos, account)'),
      bullet('Sales by Category — top 10 categories by revenue'),
      bullet('Top Products — table of top 20 products by quantity sold'),
      spacer(),

      // Products
      heading('3.2 Products', HeadingLevel.HEADING_2),
      para('Three sub-tabs: Categories, All Products, and Stock.'),
      ...screenshot('admin-products.png', 'Figure 3: Admin Products — Category management view'),
      spacer(),
      bold('Categories Sub-tab:'),
      bullet('Card-based grid view showing all categories with product counts'),
      bullet('Click a category to drill into its products'),
      bullet('Inline category editor for name, colour, and sort order'),
      spacer(),
      bold('All Products Sub-tab:'),
      ...screenshot('admin-products-list.png', 'Figure 4: Admin Products — All Products list with search and filters'),
      bullet('Searchable table with filters: category, unit type, sort order'),
      bullet('Columns: Name, Barcode, Category, Price, Unit, Stock'),
      bullet('Click to edit — modal with all product fields including margin calculator'),
      bullet('Duplicate button to clone products'),
      bullet('Soft-delete (sets active=0)'),
      spacer(),
      bold('Stock Sub-tab:'),
      bullet('Low stock alerts for products with stock tracking enabled'),
      bullet('Quick adjust buttons: +10, +25, +50'),
      spacer(),

      // Deals
      heading('3.3 Deals', HeadingLevel.HEADING_2),
      para('Multi-buy pricing management (e.g., "2 for $4", "3 for $10") with status filtering and quick toggle.'),
      ...screenshot('admin-deals.png', 'Figure 5: Admin Deals — Promotion management'),
      bullet('Table listing all deals with name, pricing tiers, products, dates, status'),
      bullet('Status filter: All, Active Only, Inactive Only, Expired'),
      bullet('Quick toggle button to activate/deactivate deals inline'),
      bullet('Modal editor with: deal name, price tiers, date range, product picker'),
      bullet('Product picker: search and add products as badge chips'),
      spacer(),

      // Price Tags
      heading('3.4 Price Tags', HeadingLevel.HEADING_2),
      para('WYSIWYG label designer for printing price tags on label sheets.'),
      bullet('Tag Designer — drag elements (name, price, barcode, unit, category) on a scaled canvas'),
      bullet('Sheet Preview — see how labels will print on a sheet (configurable cols x rows)'),
      bullet('Print Queue — add products with quantities, then print a full sheet'),
      bullet('Product Search — find and add products to the print queue'),
      spacer(),

      // Transactions
      heading('3.5 Transactions', HeadingLevel.HEADING_2),
      para('Transaction history browser with search, export, and quick date range presets.'),
      ...screenshot('admin-transactions.png', 'Figure 6: Admin Transactions — History browser with filters'),
      bullet('Summary stats: Total Sales, Transactions, Avg Sale, Voided, Refunded'),
      bullet('Quick date presets: Today, Yesterday, This Week, This Month, Last 30 Days'),
      bullet('Filters: date range, status (completed/voided/refunded/parked)'),
      bullet('View detail: item breakdown with quantities, prices, discounts, payments'),
      bullet('Actions: Void or Refund completed transactions'),
      bullet('CSV Export for the filtered date range'),
      spacer(),

      // Cash & Close
      heading('3.6 Cash & Close', HeadingLevel.HEADING_2),
      para('Two sub-tabs: Cash Drawer and End-of-Day Report (Z Report).'),
      ...screenshot('admin-cashclose.png', 'Figure 7: Admin Cash & Close — Drawer management and Z Report'),
      spacer(),
      bold('Cash Drawer:'),
      bullet('Stats: Current Float, Cash Sales Today, Expected in Drawer'),
      bullet('Quick Actions: Set Float, Cash Pickup, Cash Drop, Close Day'),
      bullet('Enhanced Close Day with counted cash entry and variance calculation'),
      bullet('Drawer log table showing all actions with timestamps'),
      spacer(),
      bold('End-of-Day Report (Z Report):'),
      bullet('Generates comprehensive end-of-day summary for any date'),
      bullet('Stats: Net Sales, Transactions, Average, GST, Discounts, Voids, Refunds'),
      bullet('Payment Methods breakdown with totals'),
      bullet('Cash Drawer reconciliation (float, sales, drops, pickups, expected)'),
      bullet('Sales by Category and Sales by Hour'),
      bullet('Print button opens printable version in new window'),
      spacer(),

      // Staff
      heading('3.7 Staff', HeadingLevel.HEADING_2),
      para('Staff management with PIN-based access control, role descriptions, and staff count display.'),
      ...screenshot('admin-staff.png', 'Figure 8: Admin Staff — Staff management with role-based access'),
      bullet('Table: Name, Role (with icon), Active/Inactive status'),
      bullet('Roles: Cashier, Manager, Admin — each with description tooltip'),
      bullet('Modal editor: Name, PIN (masked with toggle visibility), Role'),
      bullet('Activate/Deactivate toggle for soft disabling staff'),
      spacer(),

      // Keyboard
      heading('3.8 Keyboard Layout Editor', HeadingLevel.HEADING_2),
      para('Visual grid editor for the POS register keyboard. Supports multiple pages with a tree-based page navigator.'),
      bullet('Page tree with sub-pages, drag-to-reorder, rename, duplicate, delete'),
      bullet('Grid with configurable columns x rows per page'),
      bullet('Click empty cells to add buttons, drag across cells for multi-span'),
      bullet('Drag-and-drop to move buttons between cells'),
      bullet('Product sidebar: search products, click to select, then click empty cell to place'),
      bullet('Auto-fill: Reflow buttons to uniform size (1x1, 2x2, 3x3)'),
      bullet('Alphabetical sort, select all, bulk color/move/delete'),
      bullet('Undo (Ctrl+Z) with 30-level undo stack'),
      bullet('Export/Import as JSON, Reset to factory default'),
      spacer(),

      // Settings
      heading('3.9 Settings', HeadingLevel.HEADING_2),
      para('Five sub-tabs under Settings with enhanced save feedback:'),
      ...screenshot('admin-settings.png', 'Figure 9: Admin Settings — Store configuration'),
      spacer(),
      bold('Store & Config:'),
      bullet('Store Details: Name, ABN, Address, Phone, Register ID'),
      bullet('Tax: Tax Name (GST) and Rate (inclusive pricing)'),
      bullet('Receipt: Header and Footer text'),
      bullet('Database & Backups: Create manual backups, restore from previous, relative timestamps'),
      bullet('Cloud Sync (Supabase): URL + Anon Key, pull/push'),
      bullet('Application: Fullscreen/kiosk mode toggle'),
      bullet('Software Update: Pull latest from GitHub with one click'),
      spacer(),
      bold('Network (LAN Multi-Register):'),
      ...screenshot('admin-settings-network.png', 'Figure 10: Admin Settings — Network / LAN Multi-Register'),
      bullet('Server/Client role selection'),
      bullet('Network topology diagram with animated data flow'),
      bullet('Connected registers list with status'),
      bullet('Auto-discovery for client registers'),
      bullet('Network diagnostic tool (subnet scan, firewall check, UDP test)'),
      spacer(),
      bold('Reports & Insights:'),
      ...screenshot('admin-settings-insights.png', 'Figure 11: Admin Settings — Reports & Insights'),
      bullet('30-day sales trend chart'),
      bullet('Sales heatmap (day x hour)'),
      bullet('Demand forecast (4-week moving average by day of week)'),
      bullet('Frequently Bought Together product pairs'),
      bullet('Accounting Export (CSV for Xero/MYOB)'),
      bullet('Instagram Showcase settings'),
      spacer(),
      bold('Audit Log:'),
      bullet('Searchable audit trail: voids, no-sales, discounts, price changes, refunds'),
      bullet('Filter by date and action type'),
      spacer(),
      bold('Health & Logs:'),
      bullet('System health: Last DB Save, Last Backup, Last Error, Uptime'),
      bullet('Application logs viewer with severity filter and text search'),
      bullet('Export, Copy, Clear log actions'),
      spacer(),

      // Database
      heading('4. Database Schema'),
      para('SQLite database stored at ~/AppData/Roaming/crisp-pos/crisp-pos.sqlite. Schema defined in db/schema.sql.'),
      spacer(),
      heading('4.1 Core Tables', HeadingLevel.HEADING_2),
      simpleTable(['Table', 'Purpose', 'Key Fields'], [
        ['categories', 'Product categories', 'id, name, colour, sort_order, active'],
        ['products', 'All products', 'id, barcode, plu, name, category_id, price, unit, tax_rate, stock_qty'],
        ['specials', 'Price overrides (date-ranged)', 'id, product_id, special_price, start_date, end_date'],
        ['deals', 'Multi-buy promotions', 'id, name, type, config (JSON), start_date, end_date'],
        ['deal_products', 'Deal-Product linking', 'deal_id, product_id, role'],
        ['staff', 'Staff members', 'id, name, pin, role, active'],
        ['transactions', 'Sale records', 'id, register_id, staff_id, total, status, created_at'],
        ['transaction_items', 'Line items per transaction', 'id, transaction_id, product_id, qty, unit_price, line_total'],
        ['payments', 'Payment records', 'id, transaction_id, method, amount, reference'],
        ['cash_drawer', 'Drawer actions log', 'id, register_id, staff_id, action, amount, note'],
        ['settings', 'Key-value store', 'key, value'],
        ['keyboard_buttons', 'POS grid layout', 'id, label, type, price, page, grid_row, grid_col, col_span, row_span'],
        ['sync_queue', 'Offline sync queue', 'id, table_name, record_id, action, payload, synced'],
      ]),
      spacer(),

      heading('4.2 Write Path', HeadingLevel.HEADING_2),
      bullet('1. Renderer calls window.pos.someMethod(args) via preload bridge'),
      bullet('2. Main process IPC handler executes SQL via sql.js'),
      bullet('3. scheduleSave() — 1-second debounced write to disk'),
      bullet('4. queueSync() — appends to sync_queue for cloud push'),
      spacer(),

      // Hardware
      heading('5. Hardware Integration'),
      simpleTable(['Device', 'Protocol', 'Status'], [
        ['Receipt Printer', 'ESC/POS via USB, Windows print queue, or Network (TCP)', 'Auto-detected'],
        ['Cash Drawer', 'ESC/POS pulse via printer DK port', 'Auto-detected via printer'],
        ['Barcode Scanner', 'HID keyboard mode (USB)', 'Auto-detected'],
        ['Scale', 'RS-232 serial (Mettler Toledo Ariva-S)', 'COM port auto-scan'],
        ['EFTPOS Terminal', 'Linkly Cloud API', 'Configured in Settings'],
      ]),
      spacer(),

      // Sync
      heading('6. Sync Architecture'),
      para('Three layers of data synchronization:'),
      bullet('1. Local SQLite — all reads/writes go here first (offline-first)'),
      bullet('2. LAN Sync — server broadcasts to client registers over TCP/UDP on port 5555'),
      bullet('3. Cloud Sync — Supabase push/pull with 30-second auto-sync interval'),
      spacer(),
      para('LAN sync uses a server/client model. The server holds the master database. Clients auto-discover via UDP broadcast and pull products, categories, deals, and keyboard layout from the server.'),
      spacer(),

      // Running
      heading('7. Running the Application'),
      bold('Commands:'),
      bullet('npm start — Production mode (fullscreen/kiosk)'),
      bullet('npm run dev — Dev mode (windowed + DevTools)'),
      bullet('npm run build — Build Windows portable executable'),
      spacer(),
      bold('Keyboard Shortcuts (Global):'),
      bullet('F11 — Toggle fullscreen/kiosk'),
      bullet('Escape — Exit kiosk mode'),
    ]
  }]
})

async function generate() {
  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(__dirname, 'Crisp_POS_Documentation.docx')
  fs.writeFileSync(outPath, buffer)
  console.log(`Documentation generated: ${outPath}`)
}

generate().catch(err => { console.error(err); process.exit(1) })
