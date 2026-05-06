// ─── LAN Multi-Register Sync ─────────────────────────────────────────────────
// Server: exposes local DB via HTTP JSON API for client registers
// Client: syncs master data from server, pushes transactions to server
// No npm dependencies — uses Node.js built-in http and dgram modules

const http = require('http')
const dgram = require('dgram')
const os = require('os')

const UDP_PORT = 5556
const SYNC_INTERVAL = 15000 // 15 seconds

let server = null
let udpSocket = null
let udpBroadcastTimer = null
let clientSyncTimer = null
let db = null // { dbAll, dbGet, dbRun, saveDB, uuid }

let state = {
  mode: 'off',       // 'off' | 'server' | 'client'
  connected: false,
  lastPull: null,
  lastPush: null,
  serverIp: null,
  port: 5555,
  secret: null,
  error: null,
  clients: []         // server tracks connected client IPs
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { startServer, startClient, stopAll, getStatus, testConnection, discoverServer }

function getStatus () {
  return { ...state }
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function jsonReply (res, data, status = 200) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function readBody (req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

function getLocalIp () {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Node.js 18+ uses family=4 (number), older uses family='IPv4' (string)
      const isIPv4 = net.family === 'IPv4' || net.family === 4
      if (isIPv4 && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
}

// ─── Server ──────────────────────────────────────────────────────────────────

function startServer (port, dbHelpers) {
  db = dbHelpers
  state.mode = 'server'
  state.port = port
  state.serverIp = getLocalIp()

  // Generate secret if not set
  let secretRow = db.dbGet("SELECT value FROM settings WHERE key = 'lan_secret'")
  if (!secretRow || !secretRow.value) {
    const secret = db.uuid()
    db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_secret', ?1)", [secret])
    state.secret = secret
  } else {
    state.secret = secretRow.value
  }

  server = http.createServer(async (req, res) => {
    // CORS for safety
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-POS-Secret, X-Register-Id')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    // Auth check (skip heartbeat so test works without secret)
    const url = new URL(req.url, `http://${req.headers.host}`)
    const path = url.pathname

    if (path !== '/api/heartbeat') {
      const reqSecret = req.headers['x-pos-secret']
      if (reqSecret !== state.secret) {
        return jsonReply(res, { error: 'Unauthorized' }, 401)
      }
    }

    // Track client
    const clientIp = req.socket.remoteAddress
    const registerId = req.headers['x-register-id'] || 'unknown'
    if (clientIp && !state.clients.find(c => c.ip === clientIp)) {
      state.clients.push({ ip: clientIp, registerId, lastSeen: new Date().toISOString() })
    } else if (clientIp) {
      const c = state.clients.find(c => c.ip === clientIp)
      if (c) { c.lastSeen = new Date().toISOString(); c.registerId = registerId }
    }

    try {
      await handleRoute(req, res, url, path)
    } catch (e) {
      console.error('LAN API error:', e.message)
      jsonReply(res, { error: e.message }, 500)
    }
  })

  server.on('error', e => {
    console.error('LAN server error:', e.message)
    state.error = e.message
    state.connected = false
  })

  server.listen(port, '0.0.0.0', () => {
    state.serverIp = getLocalIp()
    console.log(`LAN server started on port ${port} (IP: ${state.serverIp})`)
    state.connected = true
    state.error = null
  })

  // UDP discovery broadcast
  startUdpBroadcast(port)
}

async function handleRoute (req, res, url, path) {
  const since = url.searchParams.get('since') || '1970-01-01T00:00:00'

  // ── GET endpoints (master data) ──
  if (req.method === 'GET') {
    switch (path) {
      case '/api/heartbeat':
        return jsonReply(res, { ok: true, time: new Date().toISOString(), ip: getLocalIp(), secret: state.secret, port: state.port })

      case '/api/products':
        return jsonReply(res, db.dbAll(
          "SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.updated_at > ?1", [since]))

      case '/api/categories':
        return jsonReply(res, db.dbAll("SELECT * FROM categories WHERE updated_at > ?1", [since]))

      case '/api/specials':
        return jsonReply(res, db.dbAll("SELECT * FROM specials WHERE updated_at > ?1", [since]))

      case '/api/deals':
        return jsonReply(res, db.dbAll("SELECT * FROM deals WHERE updated_at > ?1", [since]))

      case '/api/deal_products':
        return jsonReply(res, db.dbAll("SELECT * FROM deal_products"))

      case '/api/staff':
        return jsonReply(res, db.dbAll("SELECT * FROM staff WHERE updated_at > ?1", [since]))

      case '/api/keyboard':
        return jsonReply(res, db.dbAll("SELECT * FROM keyboard_buttons"))

      case '/api/settings': {
        const rows = db.dbAll("SELECT key, value FROM settings")
        const obj = {}
        for (const r of rows) obj[r.key] = r.value
        return jsonReply(res, obj)
      }

      case '/api/full-sync':
        return jsonReply(res, {
          products: db.dbAll("SELECT * FROM products"),
          categories: db.dbAll("SELECT * FROM categories"),
          specials: db.dbAll("SELECT * FROM specials"),
          deals: db.dbAll("SELECT * FROM deals"),
          deal_products: db.dbAll("SELECT * FROM deal_products"),
          staff: db.dbAll("SELECT * FROM staff"),
          keyboard_buttons: db.dbAll("SELECT * FROM keyboard_buttons"),
          settings: (() => {
            const rows = db.dbAll("SELECT key, value FROM settings")
            const obj = {}
            for (const r of rows) obj[r.key] = r.value
            return obj
          })()
        })

      default:
        return jsonReply(res, { error: 'Not found' }, 404)
    }
  }

  // ── POST endpoints (client pushes) ──
  if (req.method === 'POST') {
    const body = await readBody(req)

    switch (path) {
      case '/api/transactions': {
        // Insert transaction + items + payments (same logic as db:transaction:save)
        const txn = body
        const txnId = txn.id || db.uuid()

        db.dbRun(`
          INSERT OR IGNORE INTO transactions (id, register_id, staff_id, customer_name, subtotal, tax, discount, total, status, created_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        `, [txnId, txn.register_id || 'REMOTE', txn.staff_id || null, txn.customer_name || null,
            txn.subtotal, txn.tax, txn.discount || 0, txn.total, txn.status || 'completed',
            txn.created_at || new Date().toISOString()])

        if (txn.items) {
          for (const item of txn.items) {
            db.dbRun(`
              INSERT OR IGNORE INTO transaction_items (id, transaction_id, product_id, name, qty, unit_price, discount, line_total, tax, deal_id)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            `, [item.id || db.uuid(), txnId, item.product_id || null, item.name, item.qty,
                item.unit_price, item.discount || 0, item.line_total, item.tax || 0, item.deal_id || null])
          }
        }

        if (txn.payments) {
          for (const pay of txn.payments) {
            db.dbRun(`
              INSERT OR IGNORE INTO payments (id, transaction_id, method, amount, reference, created_at)
              VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            `, [pay.id || db.uuid(), txnId, pay.method, pay.amount, pay.reference || null,
                pay.created_at || new Date().toISOString()])
          }
        }

        // Decrement stock on server
        if (txn.status !== 'voided' && txn.items) {
          for (const item of txn.items) {
            if (item.product_id) {
              db.dbRun("UPDATE products SET stock_qty = stock_qty - ?1 WHERE id = ?2 AND track_stock = 1",
                       [item.qty, item.product_id])
            }
          }
        }

        db.saveDB()
        return jsonReply(res, { ok: true, id: txnId })
      }

      case '/api/cash_drawer': {
        const entry = body
        db.dbRun(`
          INSERT OR IGNORE INTO cash_drawer (id, register_id, staff_id, action, amount, note, created_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        `, [entry.id || db.uuid(), entry.register_id || 'REMOTE', entry.staff_id || null,
            entry.action, entry.amount || null, entry.note || null,
            entry.created_at || new Date().toISOString()])
        db.saveDB()
        return jsonReply(res, { ok: true })
      }

      default:
        return jsonReply(res, { error: 'Not found' }, 404)
    }
  }

  jsonReply(res, { error: 'Method not allowed' }, 405)
}

// ─── UDP Discovery ───────────────────────────────────────────────────────────

function startUdpBroadcast (port) {
  try {
    udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    udpSocket.bind(() => {
      udpSocket.setBroadcast(true)
      const regRow = db.dbGet("SELECT value FROM settings WHERE key = 'register_id'")
      const msg = JSON.stringify({
        service: 'crisp-pos',
        ip: getLocalIp(),
        port,
        secret: state.secret,
        register_id: regRow?.value || 'LANE01'
      })
      const buf = Buffer.from(msg)

      udpBroadcastTimer = setInterval(() => {
        try { udpSocket.send(buf, 0, buf.length, UDP_PORT, '255.255.255.255') }
        catch (_) {}
      }, 5000)

      // Send immediately too
      try { udpSocket.send(buf, 0, buf.length, UDP_PORT, '255.255.255.255') } catch (_) {}
    })
    udpSocket.on('error', () => {}) // Ignore UDP errors
  } catch (_) {}
}

function startUdpListener (onDiscover) {
  try {
    udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
    udpSocket.bind(UDP_PORT, () => {
      udpSocket.setBroadcast(true)
    })
    udpSocket.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString())
        if (data.service === 'crisp-pos' && data.ip && data.port) {
          onDiscover(data)
        }
      } catch (_) {}
    })
    udpSocket.on('error', () => {})
  } catch (_) {}
}

// ─── Client ──────────────────────────────────────────────────────────────────

function startClient (serverIp, port, secret, dbHelpers) {
  db = dbHelpers
  state.mode = 'client'
  state.serverIp = serverIp
  state.port = port
  state.secret = secret

  // Initial full sync with retry
  attemptInitialSync()

  // Periodic sync loop (also serves as reconnection)
  clientSyncTimer = setInterval(() => {
    doSyncCycle().catch(e => {
      console.error('LAN sync error:', e.message)
      state.error = e.message
      state.connected = false
    })
  }, SYNC_INTERVAL)

  // UDP listener for server discovery — auto-update IP if server moves
  startUdpListener(data => {
    if (data.ip !== state.serverIp) {
      console.log(`LAN: server moved to ${data.ip}:${data.port}`)
      state.serverIp = data.ip
      state.port = data.port
      if (data.secret) state.secret = data.secret
      // Save updated IP
      if (db) {
        db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_server_ip', ?1)", [data.ip])
        db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_port', ?1)", [String(data.port)])
        if (data.secret) db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_secret', ?1)", [data.secret])
        db.saveDB()
      }
      // Retry sync immediately with new address
      if (!state.connected) attemptInitialSync()
    }
  })
}

function attemptInitialSync (retries = 0) {
  doFullSync().then(() => {
    console.log('LAN client: initial sync complete')
  }).catch(e => {
    console.error(`LAN client: sync attempt ${retries + 1} failed:`, e.message)
    state.error = e.message
    state.connected = false
    // Retry with backoff: 5s, 10s, 20s, then every 30s via the regular interval
    if (retries < 3) {
      const delay = Math.min(5000 * Math.pow(2, retries), 20000)
      setTimeout(() => attemptInitialSync(retries + 1), delay)
    }
  })
}

async function doFullSync () {
  const data = await httpGet('/api/full-sync')

  // Upsert all master data into local DB (no queueSync — don't re-push to server)
  if (data.categories) {
    for (const c of data.categories) {
      db.dbRun(`INSERT OR REPLACE INTO categories (id, name, sort_order, colour, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
               [c.id, c.name, c.sort_order || 0, c.colour || '#10b981', c.active ?? 1, c.updated_at || null])
    }
  }

  if (data.products) {
    for (const p of data.products) {
      db.dbRun(`INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, image_url, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
               [p.id, p.barcode || null, p.plu || null, p.name, p.category_id || null,
                p.price, p.cost_price || null, p.unit || 'each', p.tax_rate ?? 0.10,
                p.track_stock || 0, p.stock_qty || 0, p.active ?? 1, p.image_url || null, p.updated_at || null])
    }
  }

  if (data.specials) {
    for (const s of data.specials) {
      db.dbRun(`INSERT OR REPLACE INTO specials (id, product_id, special_price, start_date, end_date, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
               [s.id, s.product_id, s.special_price, s.start_date || null, s.end_date || null, s.active ?? 1, s.updated_at || null])
    }
  }

  if (data.deals) {
    for (const d of data.deals) {
      db.dbRun(`INSERT OR REPLACE INTO deals (id, name, type, config, start_date, end_date, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
               [d.id, d.name, d.type, d.config, d.start_date || null, d.end_date || null, d.active ?? 1, d.updated_at || null])
    }
  }

  if (data.deal_products) {
    db.dbRun("DELETE FROM deal_products")
    for (const dp of data.deal_products) {
      db.dbRun("INSERT OR IGNORE INTO deal_products (deal_id, product_id, role) VALUES (?1, ?2, ?3)",
               [dp.deal_id, dp.product_id, dp.role || 'trigger'])
    }
  }

  if (data.staff) {
    for (const s of data.staff) {
      db.dbRun(`INSERT OR REPLACE INTO staff (id, name, pin, role, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
               [s.id, s.name, s.pin, s.role || 'cashier', s.active ?? 1, s.updated_at || null])
    }
  }

  if (data.keyboard_buttons) {
    // Full replace — delete local buttons, insert server's
    db.dbRun("DELETE FROM keyboard_buttons")
    for (const b of data.keyboard_buttons) {
      db.dbRun(`INSERT OR REPLACE INTO keyboard_buttons (id, label, type, price, image, color, bg_color, parent_id, category_filter, alpha_range, sort_order, position, page, grid_row, grid_col, col_span, row_span, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`,
               [b.id, b.label, b.type, b.price || null, b.image || null, b.color || '#fff',
                b.bg_color || '#1B4332', b.parent_id || null, b.category_filter || null,
                b.alpha_range || null, b.sort_order || 0, b.position || 'grid',
                b.page || 1, b.grid_row || 0, b.grid_col || 0, b.col_span || 1, b.row_span || 1,
                b.active ?? 1, b.updated_at || null])
    }
  }

  if (data.settings) {
    // Sync shared settings but preserve local-only ones
    const localOnly = new Set(['lan_mode', 'lan_server_ip', 'lan_port', 'lan_secret', 'register_id',
                                'supabase_url', 'supabase_anon_key', 'keyboard_grid_cols', 'keyboard_grid_rows',
                                'app_mode', 'lan_autostart', 'lan_last_pull'])
    for (const [key, value] of Object.entries(data.settings)) {
      if (!localOnly.has(key)) {
        db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)", [key, value])
      }
    }
  }

  db.saveDB()
  state.connected = true
  state.lastPull = new Date().toISOString()
  state.error = null

  // Store last pull timestamp
  db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_last_pull', ?1)", [state.lastPull])
}

async function doSyncCycle () {
  // Step 1: Push pending transactions to server
  const pending = db.dbAll("SELECT * FROM sync_queue WHERE synced = 0 AND table_name IN ('transactions', 'cash_drawer') ORDER BY id")

  for (const entry of pending) {
    try {
      const payload = JSON.parse(entry.payload)

      if (entry.table_name === 'transactions') {
        // Fetch full transaction with items and payments
        const txn = db.dbGet("SELECT * FROM transactions WHERE id = ?1", [entry.record_id])
        if (!txn) { markSynced(entry.id); continue }

        const items = db.dbAll("SELECT * FROM transaction_items WHERE transaction_id = ?1", [entry.record_id])
        const payments = db.dbAll("SELECT * FROM payments WHERE transaction_id = ?1", [entry.record_id])

        await httpPost('/api/transactions', { ...txn, items, payments })
      } else if (entry.table_name === 'cash_drawer') {
        await httpPost('/api/cash_drawer', payload)
      }

      markSynced(entry.id)
    } catch (e) {
      // Server unreachable — skip, retry next cycle
      console.error(`LAN push failed for ${entry.table_name}:${entry.record_id}:`, e.message)
      state.error = e.message
      state.connected = false
      return // Stop pushing, will retry next cycle
    }
  }

  if (pending.length > 0) {
    state.lastPush = new Date().toISOString()
  }

  // Step 2: Pull master data updates from server
  const lastPull = db.dbGet("SELECT value FROM settings WHERE key = 'lan_last_pull'")?.value || '1970-01-01T00:00:00'

  try {
    const [products, categories, specials, deals, staff] = await Promise.all([
      httpGet(`/api/products?since=${encodeURIComponent(lastPull)}`),
      httpGet(`/api/categories?since=${encodeURIComponent(lastPull)}`),
      httpGet(`/api/specials?since=${encodeURIComponent(lastPull)}`),
      httpGet(`/api/deals?since=${encodeURIComponent(lastPull)}`),
      httpGet(`/api/staff?since=${encodeURIComponent(lastPull)}`)
    ])

    for (const c of categories) {
      db.dbRun(`INSERT OR REPLACE INTO categories (id, name, sort_order, colour, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
               [c.id, c.name, c.sort_order || 0, c.colour || '#10b981', c.active ?? 1, c.updated_at || null])
    }

    for (const p of products) {
      db.dbRun(`INSERT OR REPLACE INTO products (id, barcode, plu, name, category_id, price, cost_price, unit, tax_rate, track_stock, stock_qty, active, image_url, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
               [p.id, p.barcode || null, p.plu || null, p.name, p.category_id || null,
                p.price, p.cost_price || null, p.unit || 'each', p.tax_rate ?? 0.10,
                p.track_stock || 0, p.stock_qty || 0, p.active ?? 1, p.image_url || null, p.updated_at || null])
    }

    for (const s of specials) {
      db.dbRun(`INSERT OR REPLACE INTO specials (id, product_id, special_price, start_date, end_date, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
               [s.id, s.product_id, s.special_price, s.start_date || null, s.end_date || null, s.active ?? 1, s.updated_at || null])
    }

    for (const d of deals) {
      db.dbRun(`INSERT OR REPLACE INTO deals (id, name, type, config, start_date, end_date, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
               [d.id, d.name, d.type, d.config, d.start_date || null, d.end_date || null, d.active ?? 1, d.updated_at || null])
    }

    for (const s of staff) {
      db.dbRun(`INSERT OR REPLACE INTO staff (id, name, pin, role, active, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
               [s.id, s.name, s.pin, s.role || 'cashier', s.active ?? 1, s.updated_at || null])
    }

    db.saveDB()
    state.lastPull = new Date().toISOString()
    db.dbRun("INSERT OR REPLACE INTO settings (key, value) VALUES ('lan_last_pull', ?1)", [state.lastPull])

    state.connected = true
    state.error = null
  } catch (e) {
    state.error = e.message
    state.connected = false
  }
}

function markSynced (queueId) {
  db.dbRun("UPDATE sync_queue SET synced = 1 WHERE id = ?1", [queueId])
}

// ─── HTTP Client Helpers ─────────────────────────────────────────────────────

function getRegisterId () {
  if (db) {
    const row = db.dbGet("SELECT value FROM settings WHERE key = 'register_id'")
    return row?.value || 'LANE01'
  }
  return 'LANE01'
}

function httpGet (path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: state.serverIp,
      port: state.port,
      path,
      method: 'GET',
      headers: { 'X-POS-Secret': state.secret || '', 'X-Register-Id': getRegisterId() },
      timeout: 8000
    }
    const req = http.request(opts, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString())
          if (res.statusCode === 200) resolve(data)
          else reject(new Error(data.error || `HTTP ${res.statusCode}`))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Connection timeout')) })
    req.end()
  })
}

function httpPost (path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const opts = {
      hostname: state.serverIp,
      port: state.port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-POS-Secret': state.secret || '',
        'X-Register-Id': getRegisterId()
      },
      timeout: 8000
    }
    const req = http.request(opts, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString())
          if (res.statusCode === 200) resolve(result)
          else reject(new Error(result.error || `HTTP ${res.statusCode}`))
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Connection timeout')) })
    req.write(data)
    req.end()
  })
}

async function testConnection (ip, port) {
  try {
    const result = await new Promise((resolve, reject) => {
      const opts = {
        hostname: ip,
        port,
        path: '/api/heartbeat',
        method: 'GET',
        timeout: 5000
      }
      const req = http.request(opts, res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
          catch (e) { reject(e) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Connection timeout')) })
      req.end()
    })
    return { ok: true, ...result }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ─── Auto-Discovery ─────────────────────────────────────────────────────

function discoverServer (timeoutMs = 8000) {
  return new Promise((resolve) => {
    let resolved = false
    const done = (result) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      try { socket?.close() } catch (_) {}
      resolve(result)
    }

    const timer = setTimeout(() => done(null), timeoutMs)

    // Method 1: UDP broadcast listener (fast if server is broadcasting)
    let socket
    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
      socket.bind(UDP_PORT, () => { socket.setBroadcast(true) })
      socket.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString())
          if (data.service === 'crisp-pos' && data.ip && data.port) {
            done(data)
          }
        } catch (_) {}
      })
      socket.on('error', () => {})
    } catch (_) {}

    // Method 2: Active network scan (probes all IPs on local subnet)
    scanSubnet(5555).then(result => {
      if (result) done(result)
    }).catch(() => {})
  })
}

function scanSubnet (port) {
  return new Promise((resolve) => {
    const localIp = getLocalIp()
    const parts = localIp.split('.')
    if (parts.length !== 4) { resolve(null); return }

    const subnet = parts.slice(0, 3).join('.')
    let found = false
    let pending = 0

    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`
      if (ip === localIp) continue

      pending++
      const req = http.request({
        hostname: ip, port, path: '/api/heartbeat',
        method: 'GET', timeout: 1500
      }, (res) => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          pending--
          if (found) return
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString())
            if (data.ok && res.statusCode === 200) {
              found = true
              resolve({ service: 'crisp-pos', ip, port, secret: data.secret || null })
            }
          } catch (_) {}
          if (pending <= 0 && !found) resolve(null)
        })
      })
      req.on('error', () => { pending--; if (pending <= 0 && !found) resolve(null) })
      req.on('timeout', () => { req.destroy(); pending--; if (pending <= 0 && !found) resolve(null) })
      req.end()
    }
  })
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

function stopAll () {
  if (server) { server.close(); server = null }
  if (udpSocket) { try { udpSocket.close() } catch (_) {}; udpSocket = null }
  if (udpBroadcastTimer) { clearInterval(udpBroadcastTimer); udpBroadcastTimer = null }
  if (clientSyncTimer) { clearInterval(clientSyncTimer); clientSyncTimer = null }
  state.connected = false
  state.mode = 'off'
  state.error = null
  state.clients = []
}
