# Hardware setup log — POSLANE02

Session notes for getting receipt printer, cash drawer, and scale working on this lane, and what was changed in the codebase.

## Symptoms going in

- Receipt printer didn't print.
- Cash drawer didn't open.
- Scale was talking but never gave a "stable" weight.
- README claimed "weight reading not yet implemented" — that note is stale; the in-app reader exists in `main.js`.

## What was actually plugged in vs. what Windows knew about

`Get-PnpDevice` showed the Epson `EPSONTM-T82II` claiming port **USB002**, and `Get-PrinterPort` confirmed `USB002 / EPSONTM-T82II`. But `Get-Printer` showed **no print queue pointing to USB002** — only Brother, HP, Fax, and Microsoft Print to PDF queues. The Epson driver itself was **not installed** — only `Generic / Text Only` was available.

The earlier "test pass" from `diagnose-hardware.ps1` was a false positive: the spooler accepted ESC/POS bytes into the Brother queue and the job cleared, but nothing physical happened (the Brother is an inkjet that silently dropped the unknown raw bytes, and three jobs ultimately got stuck in error state on it).

## Fix: create a print queue for the Epson

```powershell
Add-Printer -Name "Crisp Receipt" -DriverName "Generic / Text Only" -PortName "USB002"
```

`Generic / Text Only` doesn't transform data — ESC/POS bytes pass through to whatever device is on the port. That's what we want for a receipt printer.

### Confirming print works

```powershell
# ESC @ (init) + text + GS V 0 (cut)
$bytes = [byte[]]@(0x1B,0x40) + [System.Text.Encoding]::ASCII.GetBytes("`n  CRISP ON CREEK`n  test`n`n`n") + [byte[]]@(0x1D,0x56,0x00)
[System.IO.File]::WriteAllBytes("$env:TEMP\rcpt.bin", $bytes)
powershell -ExecutionPolicy Bypass -File rawprint.ps1 -PrinterName "Crisp Receipt" -FilePath "$env:TEMP\rcpt.bin"
```

→ Paper printed.

### Confirming drawer kick works

```powershell
# ESC p 0 50 250 — fire drawer 1, 50ms on / 250ms off
[System.IO.File]::WriteAllBytes("$env:TEMP\kick.bin", [byte[]]@(0x1B,0x70,0x00,0x32,0xFA))
powershell -ExecutionPolicy Bypass -File rawprint.ps1 -PrinterName "Crisp Receipt" -FilePath "$env:TEMP\kick.bin"
```

→ Drawer fully opened.

The drawer wires into the Epson's DK port, so the same queue handles both.

## Persisting into the app

The app reads `hw_printer_name`, `hw_printer_interface`, `hw_printer_port` from the `settings` table in `C:\Users\PTUser\AppData\Roaming\crisp-pos\crisp-pos.sqlite`.

Helper script: [`set-printer-config.js`](./set-printer-config.js). Run with `node set-printer-config.js`. It writes:

```
hw_printer_name      = Crisp Receipt
hw_printer_interface = windows
hw_printer_port      = USB002
```

The scale settings were already auto-saved by the app's detection routine:

```
hw_scale_type     = serial
hw_scale_port     = COM2
hw_scale_protocol = mt8217
hw_scale_baud     = 9600
```

## Scale notes

Connected on COM2, Mettler Toledo 8217 protocol (7-E-1, 9600 baud). The Viva replies with `STX ? <status byte> CR` when it can't give a weight, and a digit frame when it can. Status byte bits (from `scale_reader.py`):

| Bit | Mask | Meaning |
|----:|-----:|--------|
| 0   | 0x01 | NET (tare set) |
| 1   | 0x02 | Negative |
| 2   | 0x04 | Over/under range |
| 3   | 0x08 | In motion |
| 4   | 0x10 | KG (vs lb) |
| 5   | 0x20 | Fixed |
| 6   | 0x40 | Powering up |

If the scale stays stuck on "in motion + powerup" (status 0x48/0x49), it hasn't completed its initial zero. Remove anything from the platter → press Zero → wait for the display to read `0.000` steady. After that the POWERUP flag clears and weight frames flow.

The repo also has a standalone Python reference at [`scale_reader.py`](./scale_reader.py) — useful as a sanity check when the in-app reader is misbehaving:

```
python scale_reader.py COM2
python scale_reader.py --scan
```

## Code changes — weight modal

`pos/index.html` now waits for a *stable* reading before letting the cashier confirm, and shows a "Getting reading…" progress bar while it waits.

- New CSS: `@keyframes weightBarSlide`.
- New HTML inside `#weightModal`: `#weightReadStatus` block (status text + animated bar).
- New JS state: `awaitingStableScale`, `scaleReadTimeout`, `cancelScaleAwait()` helper.
- `showWeightModal(p)` now branches three ways:
  - Stable reading already on the scale → fill instantly.
  - Scale alive but not stable → show progress bar, disable Confirm, wait for `data.stable === true && data.weight > 0`, time out after 6s.
  - No scale connection → straight to manual entry.
- The `onScaleWeight` handler locks in the value on the first stable frame and updates the progress text ("Place item on scale…" / "Stabilising… 0.42 kg") otherwise.
- Tapping any numpad key cancels the auto-read and switches to manual.

No protocol changes in `main.js`. The accuracy gain comes from only ever locking in readings where the scale itself flags `stable: true`.

## UI-freeze fix (main.js)

While the app was sitting idle the renderer would freeze. Cause: a periodic
30-second reprobe in `main.js` chained several **synchronous** PowerShell calls
(`execSync`) via `Get-Printer`, `Get-WmiObject Win32_Printer`,
`Get-PrintJob | Remove-PrintJob`, etc. On a slow WMI box each of these can take
many seconds (the log showed `WMI Resume failed ... spawnSync ETIMEDOUT`). While
Node sat blocked on the child process, every IPC from the renderer stalled and
the UI looked frozen.

Three targeted edits:

1. `resumePrinterQueue()` — changed from `execSync` to async `spawn` (fire-and-forget). Result wasn't used, just side effects, so this is safe.
2. `clearPrinterQueue()` — same change.
3. The 30s auto-reprobe `setInterval` now returns immediately when both `hwPrinter` and the scale serial port are already healthy. Reprobing only runs when something is missing or the user triggers it from Admin > Hardware.

Verified by relaunching the app: log now shows `WMI Resume dispatched for "Crisp Receipt"` (instead of "failed ETIMEDOUT"), and no second reprobe is logged at the 30/60s mark.

## Reusable setup script for new lanes

[`setup-hardware.ps1`](./setup-hardware.ps1) is idempotent — safe to run on a
fresh lane to bring it up to the same state as POSLANE02:

```powershell
powershell -ExecutionPolicy Bypass -File setup-hardware.ps1
```

It:

1. Verifies the print spooler is running.
2. Auto-detects which USB port the TM-T82 (or similar) is on by looking for ports with descriptions matching `EPSONTM-T82|TM-T82|TM-T20|TM-T88|Receipt|POS`. Falls back to any unused `USBxxx` port.
3. Creates the `Crisp Receipt` queue using the `Generic / Text Only` driver if it doesn't exist. If it exists on the wrong port, re-points it.
4. Sends a small ESC/POS test print + drawer kick via `rawprint.ps1`.
5. Tells the user to then run `node set-printer-config.js` to write the queue name into the app DB.

Flags:
- `-QueueName <name>` if you want a different queue name (default: "Crisp Receipt")
- `-Port <USBxxx>` to override port auto-detection
- `-NoTest` to skip the test print/drawer kick

## Loose ends

- **Brother MFC-J4440DW** has 3 stuck print jobs from earlier ESC/POS-into-wrong-driver tests. `Remove-PrintJob` without admin couldn't shift them. To clear: right-click the queue in Windows → Cancel All Documents, or run as admin:
  ```powershell
  Stop-Service Spooler
  Remove-Item "$env:SystemRoot\System32\spool\PRINTERS\*" -Force
  Start-Service Spooler
  ```
- README's "weight reading not yet implemented" line is stale; main.js already does it.
- Other lanes (POSLANE03, POSLANE04, …) likely need the same `Add-Printer` on USB002 if they're set up identically. Same `set-printer-config.js` will persist the settings.

## End-to-end verification

After saving the config, `npm run dev` shows in the log:

```
[hardware] Saved printer verified: Crisp Receipt (queue exists)
[hardware] USB printer detected: Epson TM-T82 (VID:4b8 PID:e11)
[hardware] Saved scale verified: COM2 (mt8217 @ 9600)
[hardware] Scale serial port opened: COM2 @ 9600 baud (mt8217, 7-E-1)
[hardware] Starting scale polling (mt8217)
```

The printer integration flow in the renderer (no changes needed — already wired):

| Renderer call site (`pos/index.html`) | Triggers |
|---|---|
| Cash payment confirm | `printReceipt()` + `openDrawer()` |
| Card payment confirm | `printReceipt()` |
| `REPRINT` function button | `printReceipt(lastCompletedTxn)` |
| `NO SALE` / `MOVE DRAWER` buttons | `openDrawer()` |
| Return processing | `printReceipt(returnReceipt)` |

All of those land in `main.js` IPC handlers (`hardware:printReceipt` line 4245, `hardware:openDrawer` line 4282) which try OPOS first then fall back to raw spooler write via `Crisp Receipt`.

## Python scale bridge

The in-house JS 8217 parser at `main.js:3058` only recognises the classic
binary 8217 frame (`STX STA STB W5..W1 BCC ETX` — 5 digit bytes, no decimal
point, position encoded in the status byte). The Viva ECR firmware sends a
different format: `STX <ASCII digits with literal "."> CR` (e.g.
`02 30 30 2E 34 30 35 0D` = `"00.405"`). The JS code drops these frames as
"status-only" because the byte slice `[2:7]` isn't all digits.

The standalone Python at `scale_reader.py` handles both formats. Wiring it
into the app:

1. `scale_reader.py --json` was added — emits one JSON object per poll on
   stdout, banner/log to stderr. Weight events:
   `{"type":"weight","weight":0.405,"unit":"kg","stable":true,"inMotion":false,...}`.
   Status events: `{"type":"status","inMotion":true,...}`.
2. `WEIGHT_CMD = b"w"` (lowercase) — uppercase has been observed to silently
   stop responding after a few polls on this Viva firmware revision.
3. `main.js` gained `startPythonScaleBridge()` / `stopPythonScaleBridge()`.
   `startScalePolling()` now spawns the Python bridge for `mt8217` scales
   instead of the in-house JS poller. Auto-restarts after a 2s delay if Python
   ever exits.
4. Disable via the `hw_scale_use_python = 'false'` setting if you ever need
   to fall back to the JS path.
5. The bridge preserves the last good weight during scale status frames so the
   status bar doesn't flicker to zero when the platter momentarily isn't
   stable.

The renderer side (`pos/index.html`) was already wired for the same
`scale:weight` IPC event stream — no renderer changes needed.

## Async hardware I/O fixes

After the Python bridge landed, the renderer was still freezing during cash
transactions because `sendViaSpooler()` used `execSync` for the
`rawprint.ps1` call (15s timeout) — every print blocked the main process for
up to 15s. Also fixed:

- `sendViaSpooler` — switched to async `spawn`, returns Promise. No more print-time freezes.
- `resumePrinterQueue` — async fire-and-forget (was 3s timeout, often blocked the full 10s+ on slow WMI).
- `clearPrinterQueue` — async fire-and-forget.
- 30s auto-reprobe `setInterval` — early-returns when both `hwPrinter` and the scale (JS port open OR Python bridge running) are healthy. Reprobing only runs when something is actually missing.

## Useful reference paths

- App DB: `C:\Users\PTUser\AppData\Roaming\crisp-pos\crisp-pos.sqlite`
- Repo root: `C:\Users\PTUser\Downloads\mcpos`
- Diagnostic: `diagnose-hardware.ps1` (saves report to Desktop)
- Print: `rawprint.ps1 -PrinterName <queue> -FilePath <bytes file>`
- Scale tests: `test-scale.ps1`, `test-scale.js`, `scale_reader.py`
