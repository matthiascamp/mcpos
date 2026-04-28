# mcpos

Electron-based point-of-sale system for **Crisp on Creek** — a fruit & veg shop at 1832 Logan Rd, Mt Gravatt QLD 4122. Replaces the legacy Profit Track (Delphi) register.

## Stack

- **Electron v33.2.0** — Chromium + Node desktop app
- **sql.js (WASM)** — SQLite via WebAssembly, offline-first
- **Vanilla JS + HTML** — no build step, no framework, ES modules
- **Supabase** — optional cloud sync

## Running

```bash
npm install
npm start          # fullscreen/kiosk mode
npm run dev        # windowed + DevTools
```

## Structure

```
main.js            — Electron main process, DB, IPC handlers, hardware
preload.js         — contextBridge API (window.pos.*)
db/schema.sql      — SQLite schema + seed data
pos/index.html     — POS register screen (cashier-facing)
pos/admin.html     — Admin panel (dashboard, products, staff, deals, keyboard, hardware, import, settings)
pos/js/cart.js     — Shopping cart class
pos/js/ui.js       — Shared UI helpers
pos/js/sync.js     — Supabase sync engine
migrate-from-pt.js — One-shot Profit Track product import
supabase/          — Edge functions + Postgres schema
docs/              — Profit Track reference (legacy system notes)
```

## Hardware

- **Receipt printer**: ESC/POS over USB (Epson, Star, Seiko)
- **Cash drawer**: DK port via printer, ESC/POS pulse command
- **Barcode scanner**: HID keyboard mode (no driver needed)
- **Scale**: USB detection only (CAS, Mettler-Toledo, Ohaus) — weight reading not yet implemented

## Legacy System

This replaces Profit Track by Independent Solutions (Delphi-based POS). See [`docs/profit-track-reference.md`](docs/profit-track-reference.md) for export formats, department mappings, and data migration notes.
