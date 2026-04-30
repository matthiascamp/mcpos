// Run: node diagnose2.js
// Full hardware diagnostic — tests every possible way to talk to the printer

const { execSync } = require('child_process')

console.log('=== CRISP POS FULL DIAGNOSTIC v2 ===\n')
console.log('Platform:', process.platform, process.arch)
console.log('Node:', process.version)
console.log('')

// 1. USB module — list devices
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
    const tag = vid === 0x04b8 ? ' *** EPSON PRINTER ***' : vid === 0x05f9 ? ' *** SCANNER ***' : vid === 0x11ca ? ' *** VERIFONE ***' : ''
    console.log(`    VID:0x${vid.toString(16).padStart(4,'0')} PID:0x${pid.toString(16).padStart(4,'0')} Class:${desc.bDeviceClass}${tag}`)
    if (vid === 0x04b8) epsonDevice = d
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 2. Try opening Epson via raw USB (libusb)
console.log('--- 2. RAW USB OPEN TEST (libusb) ---')
if (epsonDevice) {
  try {
    epsonDevice.open()
    console.log('  device.open() SUCCESS')
    const iface = epsonDevice.interfaces[0]
    console.log(`  Interface 0: ${iface.endpoints.length} endpoints, isKernelDriverActive: ${typeof iface.isKernelDriverActive === 'function' ? iface.isKernelDriverActive() : 'N/A'}`)
    for (const ep of iface.endpoints) {
      console.log(`    Endpoint addr:0x${ep.address.toString(16)} dir:${ep.direction} type:${ep.transferType}`)
    }
    try {
      iface.claim()
      console.log('  iface.claim() SUCCESS')
      const outEp = iface.endpoints.find(e => e.direction === 'out')
      if (outEp) {
        console.log('  Found OUT endpoint, attempting test write...')
        try {
          await new Promise((resolve, reject) => {
            outEp.transfer(Buffer.from([0x1b, 0x40]), (err) => { // ESC @ (init)
              if (err) reject(err); else resolve()
            })
          })
          console.log('  TEST WRITE SUCCESS')
        } catch (we) {
          console.log('  TEST WRITE FAILED:', we.message)
        }
      }
      iface.release(() => {})
    } catch (ce) {
      console.log('  iface.claim() FAILED:', ce.message)
    }
    epsonDevice.close()
  } catch (oe) {
    console.log('  FAILED:', oe.message)
    console.log('  This usually means Windows "USB Printing Support" driver is blocking libusb')
  }
} else {
  console.log('  No Epson device found, skipping')
}
console.log('')

// 3. Windows printer ports
console.log('--- 3. WINDOWS PRINTER PORTS ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  const printers = JSON.parse(raw)
  const list = Array.isArray(printers) ? printers : [printers]
  for (const p of list) {
    console.log(`  Name: ${p.Name}`)
    console.log(`    Driver: ${p.DriverName}, Port: ${p.PortName}, Status: ${p.PrinterStatus}`)
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 4. Windows printer port details (find USB port path)
console.log('--- 4. PRINTER PORT DETAILS ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-PrinterPort | Select-Object Name,Description,PortMonitor | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  const ports = JSON.parse(raw)
  const list = Array.isArray(ports) ? ports : [ports]
  for (const p of list) {
    console.log(`  Port: ${p.Name}  Monitor: ${p.PortMonitor || 'N/A'}  Desc: ${p.Description || ''}`)
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 5. Find USB printer path via registry/WMI
console.log('--- 5. USB PRINTER PORT PATH (WMI) ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-WmiObject Win32_Printer | Select-Object Name,PortName,DriverName,DeviceID,Local | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  const printers = JSON.parse(raw)
  const list = Array.isArray(printers) ? printers : [printers]
  for (const p of list) {
    console.log(`  ${p.Name}`)
    console.log(`    Port: ${p.PortName}, Driver: ${p.DriverName}, Local: ${p.Local}`)
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 6. Try writing directly to USB port file
console.log('--- 6. DIRECT PORT WRITE TEST ---')
const fs = require('fs')
const portsToTry = ['USB001', 'USB002', 'USB003']
for (const port of portsToTry) {
  const portPath = `\\\\.\\${port}`
  try {
    const fd = fs.openSync(portPath, 'w')
    console.log(`  ${portPath}: OPENED SUCCESSFULLY`)
    try {
      fs.writeSync(fd, Buffer.from([0x1b, 0x40])) // ESC @ init
      console.log(`  ${portPath}: WRITE SUCCESS (ESC init)`)
    } catch (we) {
      console.log(`  ${portPath}: WRITE FAILED: ${we.message}`)
    }
    fs.closeSync(fd)
  } catch (e) {
    console.log(`  ${portPath}: ${e.message}`)
  }
}
console.log('')

// 7. Try net use / shared printer path
console.log('--- 7. CHECKING FOR LOCAL RAW PRINT CAPABILITY ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-PrinterPort | Where-Object { $_.Name -like \'USB*\' -or $_.Name -like \'COM*\' } | Select-Object Name,Description,PortMonitor | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  if (raw.trim()) {
    const ports = JSON.parse(raw)
    const list = Array.isArray(ports) ? ports : [ports]
    console.log('  USB/COM printer ports:')
    for (const p of list) {
      console.log(`    ${p.Name} — Monitor: ${p.PortMonitor || 'N/A'}`)
    }
  } else {
    console.log('  No USB/COM printer ports found')
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 8. Try PowerShell raw print
console.log('--- 8. POWERSHELL RAW PRINT TEST ---')
try {
  // Find which printer looks like a receipt/POS printer
  const raw = execSync('powershell -NoProfile -Command "Get-Printer | Where-Object { $_.PortName -like \'USB*\' } | Select-Object Name,PortName | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  if (raw.trim()) {
    const printers = JSON.parse(raw)
    const list = Array.isArray(printers) ? printers : [printers]
    console.log('  USB-connected printers:')
    for (const p of list) {
      console.log(`    "${p.Name}" on port ${p.PortName}`)
    }
  } else {
    console.log('  No USB-connected printers found via Get-Printer')
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 9. Check if Epson printer has a specific Windows printer name
console.log('--- 9. SEARCHING FOR EPSON IN DEVICE MANAGER ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-PnpDevice | Where-Object { $_.InstanceId -like \'*04B8*\' } | Select-Object FriendlyName,InstanceId,Class,Status | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  if (raw.trim()) {
    const devices = JSON.parse(raw)
    const list = Array.isArray(devices) ? devices : [devices]
    for (const d of list) {
      console.log(`  ${d.FriendlyName} [${d.Status}]`)
      console.log(`    Class: ${d.Class}, ID: ${d.InstanceId}`)
    }
  } else {
    console.log('  No Epson devices in PnP')
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 10. COM port test (Verifone on COM9, also COM1-3)
console.log('--- 10. COM PORTS ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-PnpDevice -Class Ports -Status OK | Select-Object FriendlyName,InstanceId | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  if (raw.trim()) {
    const ports = JSON.parse(raw)
    const list = Array.isArray(ports) ? ports : [ports]
    for (const p of list) {
      console.log(`  ${p.FriendlyName}`)
      console.log(`    ID: ${p.InstanceId}`)
    }
  } else {
    console.log('  No COM ports found')
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

// 11. Check Epson driver specifically
console.log('--- 11. INSTALLED PRINTER DRIVERS ---')
try {
  const raw = execSync('powershell -NoProfile -Command "Get-PrinterDriver | Select-Object Name,Manufacturer | ConvertTo-Json -Compress"', { timeout: 10000, encoding: 'utf-8' })
  if (raw.trim()) {
    const drivers = JSON.parse(raw)
    const list = Array.isArray(drivers) ? drivers : [drivers]
    for (const d of list) {
      console.log(`  ${d.Name} (${d.Manufacturer || 'unknown'})`)
    }
  } else {
    console.log('  No drivers found')
  }
} catch (e) {
  console.log('  FAILED:', e.message)
}
console.log('')

console.log('=== END DIAGNOSTIC v2 ===')
console.log('Copy EVERYTHING above and paste it back.')
