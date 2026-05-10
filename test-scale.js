// Quick standalone test for Mettler Toledo Ariva-S scale
// Run: node test-scale.js [COM_PORT] [BAUD]
// Example: node test-scale.js COM1 9600

const { SerialPort } = require('serialport')

const comPort = process.argv[2] || 'COM1'
const baud = parseInt(process.argv[3] || '9600')

console.log(`Opening ${comPort} at ${baud} baud (7-E-1)...`)

const port = new SerialPort({
  path: comPort,
  baudRate: baud,
  dataBits: 7,
  parity: 'even',
  stopBits: 1,
  autoOpen: false,
})

function parseWeight (data) {
  if (!data || data.length < 2) return { ok: false, error: 'Empty response' }
  const status = data[0]
  const inMotion = !!(status & 0x01)
  const overCap = !!(status & 0x40)
  const underZero = !!(status & 0x20)
  const negative = !!(status & 0x10)
  const weightStr = data.slice(1).toString('ascii').replace(/[^0-9]/g, '')
  if (!weightStr) return { ok: false, error: overCap ? 'Over capacity' : underZero ? 'Under zero' : 'No weight digits' }
  let weight = parseInt(weightStr, 10) / 1000 // 3 decimal places for kg
  if (negative) weight = -weight
  return {
    ok: true,
    weight: weight.toFixed(3),
    unit: 'kg',
    stable: !inMotion,
    status: overCap ? 'OVER' : underZero ? 'UNDER' : inMotion ? 'MOVING' : 'STABLE',
    raw: Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '),
  }
}

port.open(err => {
  if (err) { console.error('FAILED:', err.message); process.exit(1) }
  console.log('Port open. Sending W command every 500ms...\n')

  // Enable DTR/RTS
  port.set({ dtr: true, rts: true }, () => {})

  let frameBuf = []
  let inFrame = false

  port.on('data', chunk => {
    for (const byte of chunk) {
      if (byte === 0x02) { inFrame = true; frameBuf = []; continue }
      if (byte === 0x0D && inFrame) {
        inFrame = false
        const result = parseWeight(Buffer.from(frameBuf))
        const ts = new Date().toLocaleTimeString()
        if (result.ok) {
          console.log(`[${ts}] ${result.weight} ${result.unit} (${result.status}) raw: ${result.raw}`)
        } else {
          console.log(`[${ts}] ERROR: ${result.error} raw: ${result.raw || 'none'}`)
        }
        return
      }
      if (inFrame) frameBuf.push(byte)
    }
  })

  // Send W every 500ms
  setInterval(() => {
    port.write('W', 'ascii', () => { port.drain(() => {}) })
  }, 500)

  port.on('error', err => console.error('PORT ERROR:', err.message))
  port.on('close', () => { console.log('Port closed'); process.exit(0) })
})

process.on('SIGINT', () => { port.close(); process.exit(0) })
