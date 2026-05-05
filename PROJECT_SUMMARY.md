# Crisp POS — Project Summary

## What is it?
An Electron-based point-of-sale system built for **Crisp on Creek**, a fruit & veg shop at 1832 Logan Rd, Mt Gravatt QLD. Designed as a white-label SaaS product that can be packaged and sold to other independent shops (butchers, delis, bakeries, etc.).

## Tech Stack
- **Electron v33** (Chromium + Node.js desktop app)
- **sql.js** (SQLite via WebAssembly)
- **Vanilla JS + HTML** — no framework, no build step
- **Supabase** — cloud sync target

## Key Screens

### POS Register (`pos/index.html`)
- PIN login for staff authentication
- Full keyboard grid matching the Profit Track register layout (10 cols × 7 rows)
- 6 keyboard pages: Main, Fruit A-M, Fruit N-Z, Veg A-G, Veg H-Z, Grocery
- Product buttons with images, prices, and unit info (/kg, ea)
- Shopping cart with tax-inclusive pricing (Australian GST)
- Cash & card payment flows with change calculation
- Barcode/PLU scanning support
- Function buttons: void, return, hold/recall, discount, supervisor mode, reprint

### Admin Panel (`pos/admin.html`)
- Dark theme with sidebar navigation and modal dialogs
- **Dashboard** — daily sales summary, top products
- **Products** — CRUD with categories, pricing, stock tracking
- **Staff** — PIN management, roles (cashier/manager/admin)
- **Deals** — multi-buy, buy-x-get-y, % discount, $ discount, combo
- **Keyboard Editor** — drag-and-drop grid layout editor for all register pages
- **Hardware** — USB device probing (printer, scanner, scale, drawer)
- **Import** — JSON and CSV product import
- **Settings** — store details, receipt customisation, Supabase sync config

## Database
SQLite with tables for: categories, products, specials, deals, staff, transactions, payments, cash_drawer, keyboard_buttons, settings, sync_queue. Schema in `db/schema.sql`.

## Architecture
```
main.js          — Electron main process, DB init, IPC handlers, hardware
preload.js       — contextBridge API (window.pos.*)
pos/index.html   — Register screen
pos/admin.html   — Admin panel
pos/js/cart.js   — Cart class (items, totals, tax)
pos/js/sync.js   — Supabase cloud sync engine
pos/js/ui.js     — Shared utilities (money, toast, debounce)
db/schema.sql    — Full schema + seed data
lan-sync.js      — LAN multi-register sync (HTTP + UDP discovery)
```

## Current State
- Register fully functional with keyboard pages matching Profit Track layout
- ~100 product buttons across 5 category pages with Wikimedia images
- Admin panel redesigned with professional dark theme
- LAN multi-register sync implemented (server/client mode)
- Receipt printing via ESC/POS
- Cloud sync via Supabase (edge functions in `/supabase`)

## Planned Features
- Self-checkout mode
- Instagram auto-posting from specials/products
- Smart cash management (float prediction, variance tracking, anomaly alerts)
- Digital scanner/phone app integration
- Linkly payment terminal integration
