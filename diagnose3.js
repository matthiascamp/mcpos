// Run: node diagnose3.js
// Tests the EXACT same code paths the POS app uses for printing and scale reading.
// Must be run WHILE the app is NOT running (so ports aren't held).

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ESC = 0x1B, GS = 0x1D

function ps(cmd, timeout = 15000) {
  return execSync(`powershell -NoProfile -NonInteractive -Command "${cmd.replace(/"/g, '\\"')}"`, {
    timeout, encoding: 'utf-8'
  }).trim()
}

function section(n, title) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${n}. ${title}`)
  console.log('='.repeat(60))
}

async function main() {
  console.log('=== CRISP POS HARDWARE TEST v3 ===')
  console.log(`Platform: ${process.platform} ${process.arch} | Node: ${process.version}`)
  console.log(`Date: ${new Date().toLocaleString('en-AU')}`)

  // ── 1. PRINTER QUEUE STATUS ──
  section(1, 'PRINTER QUEUE STATUS')
  let receiptPrinter = null
  try {
    const raw = ps("Get-Printer | Select-Object Name,PortName,DriverName,PrinterStatus | ConvertTo-Json")
    const printers = JSON.parse(raw)
    const list = Array.isArray(printers) ? printers : [printers]
    for (const p of list) {
      const isReceipt = /80mm|58mm|epson|thermal|receipt|pos/i.test(p.Name + ' ' + p.DriverName)
      const mark = isReceipt ? ' <<<' : ''
      console.log(`  [${p.PrinterStatus === 0 ? 'OK' : 'ERR:' + p.PrinterStatus}] "${p.Name}" on ${p.PortName} (${p.DriverName})${mark}`)
      if (isReceipt && !receiptPrinter) receiptPrinter = p.Name
    }
    if (!receiptPrinter) console.log('\n  !! No receipt printer queue found')
    else console.log(`\n  >>> Will test: "${receiptPrinter}"`)
  } catch (e) {
    console.log('  FAILED:', e.message)
  }

  // ── 2. WMI PRINTER HEALTH CHECK ──
  section(2, 'WMI PRINTER HEALTH')
  if (receiptPrinter) {
    try {
      const raw = ps(`Get-WmiObject Win32_Printer -Filter "Name='${receiptPrinter.replace(/'/g, "''")}'" | Select-Object Name,PrinterStatus,PrinterState,WorkOffline,SpoolEnabled | ConvertTo-Json`)
      const p = JSON.parse(raw)
      console.log(`  Status: ${p.PrinterStatus} (0=Other, 1=Unknown, 2=Idle, 3=Printing, 4=Warmup, 5=Stopped, 6=Offline, 7=Error)`)
      console.log(`  State: ${p.PrinterState}`)
      console.log(`  Offline: ${p.WorkOffline}`)
      console.log(`  Spool Enabled: ${p.SpoolEnabled}`)

      // Try to resume it
      console.log('\n  Resuming queue (CancelAllJobs + Resume)...')
      ps(`$p = Get-WmiObject Win32_Printer -Filter "Name='${receiptPrinter.replace(/'/g, "''")}'" ; $p.CancelAllJobs() | Out-Null; $p.Resume() | Out-Null`)
      console.log('  Resume sent OK')
    } catch (e) {
      console.log('  FAILED:', e.message)
    }
  }

  // ── 3. P/INVOKE RAW PRINT TEST (exact same method as the app) ──
  section(3, 'P/INVOKE RAW PRINT TEST')
  if (receiptPrinter) {
    // Build a small ESC/POS test receipt
    const testBuf = Buffer.concat([
      Buffer.from([ESC, 0x40]),                       // INIT
      Buffer.from([ESC, 0x74, 0x00]),                 // Codepage PC437
      Buffer.from([ESC, 0x61, 0x01]),                 // Center
      Buffer.from([ESC, 0x45, 0x01]),                 // Bold ON
      Buffer.from([GS, 0x21, 0x11]),                  // Double size
      Buffer.from('HARDWARE TEST\n', 'latin1'),
      Buffer.from([GS, 0x21, 0x00]),                  // Normal size
      Buffer.from([ESC, 0x45, 0x00]),                 // Bold OFF
      Buffer.from('\n', 'latin1'),
      Buffer.from(`${new Date().toLocaleString('en-AU')}\n`, 'latin1'),
      Buffer.from('If you see this, printing works!\n', 'latin1'),
      Buffer.from('\n', 'latin1'),
      Buffer.from([ESC, 0x61, 0x00]),                 // Left align
      Buffer.from('-'.repeat(42) + '\n', 'latin1'),
      Buffer.from('Bananas              x2     $3.50\n', 'latin1'),
      Buffer.from('Milk 2L                     $4.00\n', 'latin1'),
      Buffer.from('-'.repeat(42) + '\n', 'latin1'),
      Buffer.from([ESC, 0x61, 0x02]),                 // Right align
      Buffer.from([ESC, 0x45, 0x01]),
      Buffer.from('TOTAL: $7.50\n', 'latin1'),
      Buffer.from([ESC, 0x45, 0x00]),
      Buffer.from('\nCASH: $10.00\n', 'latin1'),
      Buffer.from('Change: $2.50\n', 'latin1'),
      Buffer.from([ESC, 0x61, 0x01]),                 // Center
      Buffer.from('\nThank you!\n', 'latin1'),
      Buffer.from([ESC, 0x64, 0x04]),                 // Feed 4 lines
      Buffer.from([GS, 0x56, 0x01]),                  // Partial cut
    ])

    const tmpFile = path.join(os.tmpdir(), `crisp-test-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, testBuf)
    console.log(`  Wrote ${testBuf.length} bytes to ${tmpFile}`)
    console.log(`  Sending to "${receiptPrinter}" via winspool.drv P/Invoke...`)

    const psScript = `
$PrinterName = '${receiptPrinter.replace(/'/g, "''")}'
$FilePath = '${tmpFile.replace(/\\/g, '\\\\')}'
$bytes = [System.IO.File]::ReadAllBytes($FilePath)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class RawPrint {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFOW {
        public string pDocName;
        public string pOutputFile;
        public string pDatatype;
    }
    [DllImport("winspool.Drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOW di);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", SetLastError = true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    public static string SendRaw(string printerName, byte[] data) {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
            int err = Marshal.GetLastWin32Error();
            return "FAIL:OpenPrinter failed, Win32 error " + err;
        }
        var di = new DOCINFOW { pDocName = "Crisp Test", pDatatype = "RAW" };
        if (!StartDocPrinter(hPrinter, 1, ref di)) {
            int err = Marshal.GetLastWin32Error();
            ClosePrinter(hPrinter);
            return "FAIL:StartDocPrinter failed, Win32 error " + err;
        }
        if (!StartPagePrinter(hPrinter)) {
            int err = Marshal.GetLastWin32Error();
            EndDocPrinter(hPrinter);
            ClosePrinter(hPrinter);
            return "FAIL:StartPagePrinter failed, Win32 error " + err;
        }
        IntPtr pBuf = Marshal.AllocHGlobal(data.Length);
        Marshal.Copy(data, 0, pBuf, data.Length);
        int written;
        bool ok = WritePrinter(hPrinter, pBuf, data.Length, out written);
        int writeErr = Marshal.GetLastWin32Error();
        Marshal.FreeHGlobal(pBuf);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        if (!ok) return "FAIL:WritePrinter returned false, Win32 error " + writeErr;
        if (written != data.Length) return "FAIL:WritePrinter wrote " + written + "/" + data.Length + " bytes";
        return "OK:" + written + " bytes written";
    }
}
'@ -ErrorAction Stop

$result = [RawPrint]::SendRaw($PrinterName, $bytes)
Write-Output $result
`
    try {
      const result = execSync(
        `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`,
        { timeout: 20000, encoding: 'utf-8' }
      ).trim()
      console.log(`\n  >>> RESULT: ${result}`)
      if (result.includes('OK')) {
        console.log('  *** PRINTER WORKS! Check if test receipt printed. ***')
      } else {
        console.log('  *** PRINTER FAILED ***')
        // Decode common Win32 errors
        const errMatch = result.match(/error (\d+)/)
        if (errMatch) {
          const code = parseInt(errMatch[1])
          const errors = {
            5: 'Access denied — run as Administrator?',
            6: 'Invalid handle — printer queue broken',
            1722: 'RPC server unavailable — Print Spooler service not running',
            1801: 'Printer name invalid — queue may have been deleted',
            3019: 'Printer not found — check queue name',
            1804: 'Datatype not supported — driver rejects RAW data',
          }
          console.log(`  Win32 Error ${code}: ${errors[code] || 'Unknown — google "Win32 error ' + code + '"'}`)
        }
      }
    } catch (e) {
      console.log(`  >>> EXCEPTION: ${(e.stderr || e.message).split('\n').slice(0, 5).join('\n  ')}`)
    }
    try { fs.unlinkSync(tmpFile) } catch (_) {}
  } else {
    console.log('  Skipped — no receipt printer found')
  }

  // ── 4. CASH DRAWER KICK TEST ──
  section(4, 'CASH DRAWER KICK TEST')
  if (receiptPrinter) {
    const drawerBuf = Buffer.concat([
      Buffer.from([ESC, 0x40]),                   // INIT
      Buffer.from([ESC, 0x70, 0x00, 0x37, 0x79]), // Drawer kick pin 2
      Buffer.from([ESC, 0x70, 0x01, 0x37, 0x79]), // Drawer kick pin 5 (some drawers use this)
    ])
    const tmpFile = path.join(os.tmpdir(), `crisp-drawer-${Date.now()}.bin`)
    fs.writeFileSync(tmpFile, drawerBuf)
    console.log(`  Sending drawer kick to "${receiptPrinter}"...`)

    const psScript = `
$PrinterName = '${receiptPrinter.replace(/'/g, "''")}'
$bytes = [System.IO.File]::ReadAllBytes('${tmpFile.replace(/\\/g, '\\\\')}')
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public class DK{
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]public struct DI{public string n;public string o;public string d;}
  [DllImport("winspool.Drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool OpenPrinter(string s,out IntPtr h,IntPtr p);
  [DllImport("winspool.Drv",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool StartDocPrinter(IntPtr h,int l,ref DI d);
  [DllImport("winspool.Drv",SetLastError=true)]public static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv",SetLastError=true)]public static extern bool WritePrinter(IntPtr h,IntPtr p,int c,out int w);
  [DllImport("winspool.Drv",SetLastError=true)]public static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv",SetLastError=true)]public static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv",SetLastError=true)]public static extern bool ClosePrinter(IntPtr h);
  public static string Go(string n,byte[] d){IntPtr h;if(!OpenPrinter(n,out h,IntPtr.Zero))return "FAIL:Open "+Marshal.GetLastWin32Error();var i=new DI{n="Drawer",o=null,d="RAW"};if(!StartDocPrinter(h,1,ref i)){ClosePrinter(h);return "FAIL:StartDoc "+Marshal.GetLastWin32Error();}StartPagePrinter(h);IntPtr b=Marshal.AllocHGlobal(d.Length);Marshal.Copy(d,0,b,d.Length);int w;WritePrinter(h,b,d.Length,out w);Marshal.FreeHGlobal(b);EndPagePrinter(h);EndDocPrinter(h);ClosePrinter(h);return w==d.Length?"OK:drawer kick sent":"FAIL:wrote "+w+"/"+d.Length;}
}
'@ -ErrorAction Stop
Write-Output ([DK]::Go($PrinterName,$bytes))
`
    try {
      const result = execSync(
        `powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`,
        { timeout: 15000, encoding: 'utf-8' }
      ).trim()
      console.log(`  >>> RESULT: ${result}`)
      if (result.includes('OK')) console.log('  *** Did the cash drawer open? ***')
    } catch (e) {
      console.log(`  >>> EXCEPTION: ${(e.stderr || e.message).split('\n')[0]}`)
    }
    try { fs.unlinkSync(tmpFile) } catch (_) {}
  }

  // ── 5. PRINT SPOOLER SERVICE ──
  section(5, 'PRINT SPOOLER SERVICE')
  try {
    const raw = ps("Get-Service Spooler | Select-Object Status,StartType | ConvertTo-Json")
    const svc = JSON.parse(raw)
    console.log(`  Spooler Status: ${svc.Status === 4 ? 'Running' : svc.Status} | StartType: ${svc.StartType}`)
    if (svc.Status !== 4) console.log('  !! Spooler is NOT running — printing will fail!')
  } catch (e) {
    console.log('  FAILED:', e.message)
  }

  // ── 6. PRINT JOB QUEUE (stuck jobs?) ──
  section(6, 'STUCK PRINT JOBS')
  if (receiptPrinter) {
    try {
      const raw = ps(`Get-PrintJob -PrinterName '${receiptPrinter.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Select-Object Id,DocumentName,JobStatus,Size | ConvertTo-Json`)
      if (raw) {
        const jobs = JSON.parse(raw)
        const list = Array.isArray(jobs) ? jobs : [jobs]
        console.log(`  ${list.length} jobs in queue:`)
        for (const j of list) console.log(`    Job ${j.Id}: "${j.DocumentName}" Status=${j.JobStatus} Size=${j.Size}`)
        console.log('  !! Stuck jobs can block printing. The test above cancels them first.')
      } else {
        console.log('  Queue is empty (good)')
      }
    } catch (e) {
      console.log('  Queue is empty (good)')
    }
  }

  // ── 7. SCALE TEST (COM3, mt8217 protocol) ──
  section(7, 'SCALE TEST (serial)')
  console.log('  Looking for serialport module...')
  let SerialPort = null
  try {
    SerialPort = require('serialport').SerialPort
    console.log('  serialport module loaded OK')
  } catch (e) {
    console.log(`  serialport not available: ${e.message}`)
    console.log('  Trying PowerShell serial test instead...')
  }

  // Try each likely COM port
  const scalePorts = ['COM3', 'COM9', 'COM4', 'COM1']
  const scaleProtocols = [
    { name: 'mt8217', baud: 9600, dataBits: 7, parity: 'even', stopBits: 1, cmd: 'W\r\n', desc: 'MT8217 retail (7-E-1)' },
    { name: 'sics', baud: 9600, dataBits: 8, parity: 'none', stopBits: 1, cmd: 'S\r\n', desc: 'MT-SICS lab (8-N-1)' },
  ]

  if (SerialPort) {
    // List available ports
    try {
      const { SerialPort: SP } = require('serialport')
      const ports = await SP.list()
      console.log(`  Available serial ports: ${ports.map(p => `${p.path} (${p.manufacturer || 'unknown'})`).join(', ') || 'none'}`)
    } catch (e) {
      console.log(`  Port list failed: ${e.message}`)
    }

    for (const portName of scalePorts) {
      for (const proto of scaleProtocols) {
        console.log(`\n  Testing ${portName} @ ${proto.baud} ${proto.desc}...`)
        try {
          const result = await new Promise((resolve, reject) => {
            const port = new SerialPort({
              path: portName,
              baudRate: proto.baud,
              dataBits: proto.dataBits,
              parity: proto.parity,
              stopBits: proto.stopBits,
              autoOpen: false,
            })
            const timer = setTimeout(() => {
              try { port.close() } catch (_) {}
              resolve({ error: `Timeout — no response to "${proto.cmd.trim()}"` })
            }, 3000)

            port.open(err => {
              if (err) {
                clearTimeout(timer)
                return resolve({ error: `Open failed: ${err.message}` })
              }
              let buf = ''
              port.on('data', chunk => {
                buf += chunk.toString('ascii')
                if (buf.includes('\r') || buf.includes('\n')) {
                  clearTimeout(timer)
                  port.close(() => {})
                  resolve({ data: buf.trim() })
                }
              })
              port.write(proto.cmd, 'ascii', () => port.drain(() => {}))
            })
          })
          if (result.error) {
            console.log(`    ${result.error}`)
          } else {
            console.log(`    >>> RESPONSE: "${result.data}"`)
            console.log(`    *** SCALE WORKS on ${portName} with ${proto.name} ***`)
            // Parse weight if possible
            const match = result.data.match(/([\d.]+)\s*(kg|g|lb|oz)?/i)
            if (match) console.log(`    Weight: ${match[1]} ${match[2] || 'units'}`)
          }
        } catch (e) {
          console.log(`    Exception: ${e.message}`)
        }
      }
    }
  } else {
    // PowerShell fallback for serial
    console.log('  Using PowerShell [System.IO.Ports.SerialPort] fallback...')
    for (const portName of scalePorts) {
      for (const proto of scaleProtocols) {
        console.log(`\n  Testing ${portName} @ ${proto.baud} ${proto.desc}...`)
        const psCmd = `
try {
  $port = New-Object System.IO.Ports.SerialPort '${portName}',${proto.baud},([System.IO.Ports.Parity]::${proto.parity === 'even' ? 'Even' : 'None'}),${proto.dataBits},([System.IO.Ports.StopBits]::One)
  $port.ReadTimeout = 3000
  $port.WriteTimeout = 1000
  $port.Open()
  $port.Write('${proto.cmd.replace('\r', '`r').replace('\n', '`n')}')
  Start-Sleep -Milliseconds 500
  $resp = $port.ReadExisting()
  $port.Close()
  if ($resp) { Write-Output "DATA:$resp" } else { Write-Output "EMPTY:no response" }
} catch {
  Write-Output "ERR:$($_.Exception.Message)"
}
`
        try {
          const result = ps(psCmd, 8000)
          if (result.startsWith('DATA:')) {
            console.log(`    >>> RESPONSE: "${result.substring(5).trim()}"`)
            console.log(`    *** SCALE WORKS on ${portName} with ${proto.name} ***`)
          } else if (result.startsWith('EMPTY:')) {
            console.log(`    No response (timeout)`)
          } else {
            console.log(`    ${result}`)
          }
        } catch (e) {
          console.log(`    Failed: ${(e.stderr || e.message).split('\n')[0]}`)
        }
      }
    }
  }

  // ── 8. BARCODE SCANNER ──
  section(8, 'BARCODE SCANNER')
  try {
    const HID = require('node-hid')
    const devices = HID.devices()
    const scannerVids = [0x05E0, 0x05F9, 0x0C2E, 0x1EAB, 0x2DD6, 0x1A86, 0x045B, 0x065A, 0x0C2F]
    const scanners = devices.filter(d => scannerVids.includes(d.vendorId))
    if (scanners.length) {
      for (const s of scanners) {
        console.log(`  *** SCANNER FOUND: VID:0x${s.vendorId.toString(16)} PID:0x${s.productId.toString(16)} "${s.product || s.manufacturer || 'unknown'}" ***`)
      }
    } else {
      // Check for keyboard-mode scanners
      const keyboards = devices.filter(d => d.usagePage === 1 && d.usage === 6)
      console.log(`  No dedicated scanner VID matched.`)
      console.log(`  Found ${keyboards.length} HID keyboard devices (scanner may be in keyboard-emulation mode)`)
      console.log('  If you have a scanner, it likely works as a keyboard — just scan into the barcode input field.')
    }
  } catch (e) {
    console.log(`  node-hid not available: ${e.message}`)
    console.log('  Scanner detection requires Electron (node-hid). In the app, the scanner works as keyboard input.')
    console.log('  If scanning works when you type in Notepad, it will work in the POS.')
  }

  // ── 9. USB DEVICE TREE (all devices) ──
  section(9, 'USB DEVICE TREE')
  try {
    const raw = ps("Get-PnpDevice -Class USB -Status OK -ErrorAction SilentlyContinue | Select-Object FriendlyName,InstanceId,Status | ConvertTo-Json", 10000)
    const devices = JSON.parse(raw)
    const list = Array.isArray(devices) ? devices : [devices]
    for (const d of list) {
      const id = d.InstanceId || ''
      const isEpson = id.includes('04B8')
      const isScale = /0B67|0922|1446|0EB8|2474/i.test(id)
      const isScanner = /05E0|05F9|0C2E|1EAB|2DD6|1A86/i.test(id)
      const tag = isEpson ? ' <<< EPSON PRINTER' : isScale ? ' <<< SCALE' : isScanner ? ' <<< SCANNER' : ''
      if (tag || !id.includes('\\ROOT_HUB')) {
        console.log(`  ${d.FriendlyName}${tag}`)
        if (tag) console.log(`    ${id}`)
      }
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }

  // ── SUMMARY ──
  console.log(`\n${'='.repeat(60)}`)
  console.log('  SUMMARY — CHECK THESE:')
  console.log('='.repeat(60))
  console.log('  1. Did a test receipt print on the 80mm printer?')
  console.log('  2. Did the cash drawer pop open?')
  console.log('  3. Did any COM port return scale weight data?')
  console.log('  4. Can you scan a barcode into Notepad? (keyboard mode)')
  console.log('')
  console.log('  Copy ALL output above and paste it back.')
  console.log('='.repeat(60))
}

main().catch(e => console.error('DIAGNOSTIC CRASHED:', e))
