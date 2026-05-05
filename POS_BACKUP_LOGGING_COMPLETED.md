# POS Backup, Logging & Crash Safety — Implementation Complete

## Summary

Added robust backup management, application-level error logging, crash safety handlers, and health monitoring to the Crisp POS Electron app.

---

## What Was Done

### 1. Backup System (main.js)

- **Automatic startup backup**: `createBackup()` called during `initDatabase()`
- **Daily backup timer**: 24-hour interval, runs `createBackup()` automatically
- **Manual backup**: "Create Backup Now" button in Admin → Settings
- **Open Backup Folder**: button in Admin → Settings opens OS file manager via `shell.openPath()`
- **14-day retention**: oldest backups pruned when count exceeds 14
- **Timestamped filenames**: `crisp-pos-YYYY-MM-DDTHH-mm-ss.sqlite`
- **Backup folder**: `{userData}/backups/`
- **Restore**: click "Restore" on any listed backup (with confirmation)

### 2. Error Logging (main.js)

`appLog(level, source, message, detail)` writes to daily log files at `{userData}/logs/app-YYYY-MM-DD.log`.

**Sources covered:**
1. App startup — logged in `initDatabase()`
2. DB load/save — try/catch in `saveDB()` and DB init
3. IPC handlers — `dbAll()` and `dbRun()` catch blocks
4. Backup errors — try/catch in `createBackup()`
5. Print errors — receipt print handler
6. Drawer errors — cash drawer handler
7. LAN server/client errors — `lan-sync.js` startup logged in main.js
8. Import/export errors — keyboard import/export handlers
9. Unhandled rejections — `process.on('unhandledRejection')`
10. Uncaught exceptions — `process.on('uncaughtException')` with emergency DB save
11. App shutdown — logged on `will-quit`

**Log format:** `[ISO_TIMESTAMP] [LEVEL] [SOURCE] message | detail`

**Retention:** 14 daily log files, oldest auto-pruned on each write.

### 3. Admin Logs Tab (pos/admin.html)

New "Logs" tab in admin sidebar (between Audit Log and Settings):

- **Health indicators section**: Last DB Save, Last Backup, Last Error, DB Path, Backup Folder, Uptime Since
- **Log viewer**: table with Timestamp, Level, Source, Message, Details columns
- **Date selector**: dropdown populated from available log dates
- **Severity filter**: All / Fatal / Error / Warn / Info
- **Text search**: filters log lines by keyword
- **Refresh**: reloads health + dates + log lines
- **Export**: saves log file to desktop via IPC
- **Copy**: copies filtered lines to clipboard
- **Clear**: deletes log file for selected date (with admin confirmation)
- **Limit**: renders up to 500 lines to prevent UI lag
- **Color coding**: Fatal/Error = red, Warn = amber, Info = dim

### 4. Crash Safety (main.js)

- `process.on('uncaughtException')` — logs fatal error, attempts emergency `saveDB()`
- `process.on('unhandledRejection')` — logs error with stack trace
- Both handlers run before the process terminates

### 5. Health State (main.js)

`appHealth` object tracks:
- `lastDbSave` — updated on every successful `saveDB()`
- `lastBackup` — updated on every successful `createBackup()`
- `lastError` — updated on any error/fatal log
- `dbPath` — path to SQLite file
- `backupDir` — path to backup directory
- `logDir` — path to log directory
- `startedAt` — app launch timestamp

Exposed via `app:health` IPC handler → `window.pos.getHealth()`.

---

## Files Modified

| File | Changes |
|---|---|
| `main.js` | Added `appLog()`, `appHealth`, crash handlers, daily backup timer, backup/log/health IPC handlers, `shell` import, error logging in save/load/IPC/print/drawer paths |
| `preload.js` | Added bridge methods: `openBackupFolder`, `getLogs`, `getLogDates`, `clearLogs`, `exportLogs`, `getHealth` |
| `pos/admin.html` | Added Logs tab (HTML + JS): health grid, log table with filters, export/copy/clear buttons, Open Backup Folder button in Settings |

---

## IPC Channels Added

| Channel | Bridge Method | Description |
|---|---|---|
| `db:backup:openFolder` | `openBackupFolder()` | Opens backup directory in OS file manager |
| `app:logs:get` | `getLogs({date})` | Returns `{lines: string[]}` for a date |
| `app:logs:dates` | `getLogDates()` | Returns array of available date strings |
| `app:logs:clear` | `clearLogs(date)` | Deletes log file for date |
| `app:logs:export` | `exportLogs(date)` | Copies log file to Desktop |
| `app:health` | `getHealth()` | Returns appHealth snapshot |

---

## Testing Checklist

- [ ] App starts without errors — check DevTools console
- [ ] Startup backup created in `{userData}/backups/`
- [ ] Log file created at `{userData}/logs/app-YYYY-MM-DD.log`
- [ ] Admin → Logs tab shows health indicators with correct values
- [ ] Admin → Logs tab shows today's log entries
- [ ] Severity filter works (e.g., show only errors)
- [ ] Text search filters log lines
- [ ] Copy button copies filtered lines to clipboard
- [ ] Export button saves log file
- [ ] Clear button removes log file (with confirmation)
- [ ] Admin → Settings → "Open Backup Folder" opens the folder
- [ ] Admin → Settings → "Create Backup Now" creates a new backup
- [ ] Force an error (e.g., bad IPC call) and verify it appears in logs
- [ ] Close and reopen app — previous logs still available by date
