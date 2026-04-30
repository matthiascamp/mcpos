// Run: node diagnose2.js
// Full hardware diagnostic v2.1 — tests EVERY possible way to reach the printer

const { execSync } = require('child_process')
const fs = require('fs')
const net = require('net')

async function main() {
  console.log('=== CRISP POS FULL DIAGNOSTIC v2.1 ===\n')
  console.log('Platform:', process.platform, process.arch)
  console.log('Node:', process.version)
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 1. USB MODULE DEVICE LIST
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 1. USB MODULE DEVICE LIST ---')
  let epsonDevice = null
  try {
    const usb = require('usb')
    const devices = usb.getDeviceList()
    console.log(`  Found ${devices.length} USB devices`)
    for (const d of devices) {
      const desc = d.deviceDescriptor
      const vid = desc.idVendor
      const pid = desc.idProduct
      const tag = vid === 0x04b8 ? ' *** EPSON PRINTER ***'
               : vid === 0x05f9 ? ' *** SCANNER ***'
               : vid === 0x11ca ? ' *** VERIFONE ***'
               : ''
      console.log(`    VID:0x${vid.toString(16).padStart(4,'0')} PID:0x${pid.toString(16).padStart(4,'0')} Class:${desc.bDeviceClass}${tag}`)
      if (vid === 0x04b8) epsonDevice = d
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 2. RAW USB OPEN TEST (libusb) — expect this to fail on Windows
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 2. RAW USB OPEN TEST (libusb) ---')
  if (epsonDevice) {
    try {
      epsonDevice.open()
      console.log('  device.open() SUCCESS')
      const iface = epsonDevice.interfaces[0]
      console.log(`  Interface 0: ${iface.endpoints.length} endpoints`)
      for (const ep of iface.endpoints) {
        console.log(`    Endpoint addr:0x${ep.address.toString(16)} dir:${ep.direction} type:${ep.transferType}`)
      }
      try {
        iface.claim()
        console.log('  iface.claim() SUCCESS')
        const outEp = iface.endpoints.find(e => e.direction === 'out')
        if (outEp) {
          console.log('  Found OUT endpoint, attempting ESC @ init...')
          await new Promise((resolve, reject) => {
            outEp.transfer(Buffer.from([0x1b, 0x40]), (err) => {
              if (err) reject(err); else resolve()
            })
          })
          console.log('  *** RAW USB WRITE SUCCESS ***')
        }
        iface.release(() => {})
      } catch (ce) {
        console.log('  iface.claim() FAILED:', ce.message)
      }
      try { epsonDevice.close() } catch (_) {}
    } catch (oe) {
      console.log('  FAILED:', oe.message)
    }
  } else {
    console.log('  No Epson device found via usb module')
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 3. WINDOWS PRINTERS (Get-Printer)
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 3. WINDOWS PRINTERS ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus,Shared | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    const printers = JSON.parse(raw)
    const list = Array.isArray(printers) ? printers : [printers]
    for (const p of list) {
      console.log(`  "${p.Name}"`)
      console.log(`    Driver: ${p.DriverName}`)
      console.log(`    Port: ${p.PortName}`)
      console.log(`    Status: ${p.PrinterStatus}`)
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 4. ALL PRINTER PORTS
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 4. ALL PRINTER PORTS ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-PrinterPort | Select-Object Name,Description,PortMonitor,PrinterHostAddress | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    const ports = JSON.parse(raw)
    const list = Array.isArray(ports) ? ports : [ports]
    for (const p of list) {
      console.log(`  Port: ${p.Name}`)
      console.log(`    Monitor: ${p.PortMonitor || 'N/A'}, Desc: ${p.Description || ''}, Host: ${p.PrinterHostAddress || ''}`)
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 5. EPSON IN DEVICE MANAGER
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 5. EPSON IN DEVICE MANAGER ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-PnpDevice | Where-Object { $_.InstanceId -like \'*04B8*\' } | Select-Object FriendlyName,InstanceId,Class,Status | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    if (raw.trim()) {
      const devices = JSON.parse(raw)
      const list = Array.isArray(devices) ? devices : [devices]
      for (const d of list) {
        console.log(`  ${d.FriendlyName} [${d.Status}]`)
        console.log(`    Class: ${d.Class}, ID: ${d.InstanceId}`)
      }
    } else {
      console.log('  No Epson devices found')
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 6. DIRECT PORT WRITE TEST — \\.\USB001 through USB010
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 6. DIRECT PORT WRITE (USB001-USB010) ---')
  const initCmd = Buffer.from([0x1b, 0x40]) // ESC @
  for (let i = 1; i <= 10; i++) {
    const portName = `USB${i.toString().padStart(3, '0')}`
    const portPath = `\\\\.\\${portName}`
    try {
      const fd = fs.openSync(portPath, 'w')
      console.log(`  ${portPath}: OPENED`)
      try {
        fs.writeSync(fd, initCmd)
        console.log(`  ${portPath}: *** WRITE SUCCESS *** — THIS PORT WORKS`)
      } catch (we) {
        console.log(`  ${portPath}: write failed: ${we.message}`)
      }
      fs.closeSync(fd)
    } catch (e) {
      console.log(`  ${portPath}: ${e.code || e.message}`)
    }
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 7. DIRECT PORT WRITE TEST — COM1-COM9
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 7. DIRECT PORT WRITE (COM1-COM9) ---')
  for (let i = 1; i <= 9; i++) {
    const portPath = `\\\\.\\COM${i}`
    try {
      const fd = fs.openSync(portPath, 'w')
      console.log(`  COM${i}: OPENED`)
      try {
        fs.writeSync(fd, initCmd)
        console.log(`  COM${i}: *** WRITE SUCCESS ***`)
      } catch (we) {
        console.log(`  COM${i}: write failed: ${we.message}`)
      }
      fs.closeSync(fd)
    } catch (e) {
      console.log(`  COM${i}: ${e.code || e.message}`)
    }
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 8. DIRECT PORT WRITE TEST — LPT1-LPT3
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 8. DIRECT PORT WRITE (LPT1-LPT3) ---')
  for (let i = 1; i <= 3; i++) {
    const portPath = `\\\\.\\LPT${i}`
    try {
      const fd = fs.openSync(portPath, 'w')
      console.log(`  LPT${i}: OPENED`)
      fs.closeSync(fd)
    } catch (e) {
      console.log(`  LPT${i}: ${e.code || e.message}`)
    }
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 9. POWERSHELL RAW PRINT TEST via .NET
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 9. POWERSHELL RAW PRINT TEST ---')
  try {
    // Find USB-connected printers
    const raw = execSync('powershell -NoProfile -Command "Get-Printer | Where-Object { $_.PortName -like \'USB*\' -or $_.DriverName -like \'*EPSON*\' -or $_.DriverName -like \'*Generic*\' -or $_.DriverName -like \'*Thermal*\' -or $_.DriverName -like \'*POS*\' -or $_.DriverName -like \'*Receipt*\' } | Select-Object Name,PortName,DriverName | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    if (raw.trim()) {
      const printers = JSON.parse(raw)
      const list = Array.isArray(printers) ? printers : [printers]
      console.log('  Candidate receipt printers:')
      for (const p of list) {
        console.log(`    "${p.Name}" on ${p.PortName} (${p.DriverName})`)
      }
    } else {
      console.log('  No USB/receipt printers found via Get-Printer filter')
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 10. WMI PRINTER DETAIL (Win32_Printer)
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 10. WMI PRINTER DETAIL ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-WmiObject Win32_Printer | Select-Object Name,PortName,DriverName,DeviceID,Local,Network,PrinterStatus,WorkOffline | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    const printers = JSON.parse(raw)
    const list = Array.isArray(printers) ? printers : [printers]
    for (const p of list) {
      console.log(`  "${p.Name}"`)
      console.log(`    Port: ${p.PortName}, Driver: ${p.DriverName}`)
      console.log(`    Local: ${p.Local}, Network: ${p.Network}, Status: ${p.PrinterStatus}, Offline: ${p.WorkOffline}`)
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 11. INSTALLED PRINTER DRIVERS
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 11. INSTALLED PRINTER DRIVERS ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-PrinterDriver | Select-Object Name,Manufacturer,PrinterEnvironment | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    const drivers = JSON.parse(raw)
    const list = Array.isArray(drivers) ? drivers : [drivers]
    for (const d of list) {
      console.log(`  ${d.Name} (${d.Manufacturer || 'unknown'}) [${d.PrinterEnvironment}]`)
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 12. NETWORK PRINTER PORTS (TCP/IP printers on LAN)
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 12. TCP/IP PRINTER PORTS ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-PrinterPort | Where-Object { $_.PrinterHostAddress -ne $null -and $_.PrinterHostAddress -ne \'\' } | Select-Object Name,PrinterHostAddress,PortNumber | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    if (raw.trim()) {
      const ports = JSON.parse(raw)
      const list = Array.isArray(ports) ? ports : [ports]
      for (const p of list) {
        console.log(`  ${p.Name} -> ${p.PrinterHostAddress}:${p.PortNumber || 9100}`)
      }
    } else {
      console.log('  No TCP/IP printer ports')
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 13. TRY PRINTING VIA POWERSHELL Out-Printer
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 13. POWERSHELL OUT-PRINTER TEST ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-Printer | Select-Object Name,PortName | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
    const printers = JSON.parse(raw)
    const list = Array.isArray(printers) ? printers : [printers]
    // Try each non-PDF/Fax printer
    for (const p of list) {
      if (p.Name.includes('PDF') || p.Name.includes('Fax') || p.Name.includes('OneNote') || p.Name.includes('XPS')) continue
      console.log(`  Trying Out-Printer to "${p.Name}"...`)
      try {
        execSync(`powershell -NoProfile -Command "'DIAGNOSTIC TEST' | Out-Printer -Name '${p.Name.replace(/'/g, "''")}';"`, { timeout: 10000, encoding: 'utf-8' })
        console.log(`  *** "${p.Name}": Out-Printer succeeded (check if it printed!) ***`)
      } catch (pe) {
        console.log(`  "${p.Name}": Out-Printer failed: ${pe.message.split('\n')[0]}`)
      }
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 14. TRY RAW PRINT VIA copy /b (classic Windows raw printing)
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 14. RAW PRINT VIA COPY /B ---')
  // Write a tiny ESC/POS test file
  const testFile = require('path').join(require('os').tmpdir(), 'escpos_test.bin')
  // ESC @ (init) + "TEST PRINT\n" + GS V 0 (cut)
  const testData = Buffer.concat([
    Buffer.from([0x1b, 0x40]),
    Buffer.from('=== PRINTER TEST ===\n\nIf you see this, raw printing works!\n\n'),
    Buffer.from([0x1d, 0x56, 0x01]) // partial cut
  ])
  fs.writeFileSync(testFile, testData)
  console.log(`  Test file written: ${testFile}`)

  // Try copying to each USB port
  for (let i = 1; i <= 5; i++) {
    const port = `USB${i.toString().padStart(3, '0')}`
    try {
      execSync(`copy /b "${testFile}" "\\\\.\\${port}"`, { timeout: 5000, encoding: 'utf-8', shell: 'cmd.exe' })
      console.log(`  *** ${port}: copy /b SUCCESS — CHECK PRINTER ***`)
    } catch (e) {
      console.log(`  ${port}: ${(e.message || '').split('\n')[0]}`)
    }
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 15. TRY NET USE + COPY (map printer to local port)
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 15. SHARE NAME / NET USE ---')
  try {
    const raw = execSync('net use 2>&1', { timeout: 5000, encoding: 'utf-8', shell: 'cmd.exe' })
    console.log('  Current net use mappings:')
    console.log('  ' + raw.trim().split('\n').join('\n  '))
  } catch (e) {
    console.log('  No mappings or error:', e.message.split('\n')[0])
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 16. SCANNER TEST — check HID devices
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 16. HID DEVICES (scanner should be here) ---')
  try {
    const raw = execSync('powershell -NoProfile -Command "Get-PnpDevice -Class HIDClass -Status OK | Select-Object FriendlyName,InstanceId | ConvertTo-Json -Compress"', { timeout: 15000, encoding: 'utf-8' })
    const devices = JSON.parse(raw)
    const list = Array.isArray(devices) ? devices : [devices]
    for (const d of list) {
      const isScanner = d.InstanceId?.includes('05F9')
      console.log(`  ${isScanner ? '*** ' : ''}${d.FriendlyName}${isScanner ? ' *** SCANNER' : ''}`)
      if (isScanner) console.log(`    ID: ${d.InstanceId}`)
    }
  } catch (e) {
    console.log('  FAILED:', e.message)
  }
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // 17. CASH DRAWER — typically kicked via printer, test separately
  // ═══════════════════════════════════════════════════════════════════
  console.log('--- 17. CASH DRAWER ---')
  console.log('  Cash drawer is connected via the Epson printer DK port.')
  console.log('  It will open when we can successfully send ESC/POS to the printer.')
  console.log('  Drawer kick command: ESC p 0 25 120')
  console.log('')

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log('=== SUMMARY ===')
  console.log('Look above for any line containing ***')
  console.log('Those indicate a method that WORKED.')
  console.log('If Out-Printer printed something on one of the printers, note which printer name.')
  console.log('If copy /b worked on a USB port, note which port.')
  console.log('If direct port write worked, note which port.')
  console.log('')
  console.log('=== END DIAGNOSTIC v2.1 ===')
  console.log('Copy EVERYTHING above and paste it back.')

  // Clean up
  try { fs.unlinkSync(testFile) } catch (_) {}
}

main().catch(e => console.error('DIAGNOSTIC CRASHED:', e))
