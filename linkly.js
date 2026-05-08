// ─── Linkly Cloud Payment Terminal Integration ───────────────────────────────
// Connects to Linkly Cloud REST API for EFTPOS terminal communication.
// Supports: purchase, refund, settlement, pairing, status polling.
// Docs: https://www.linkly.com.au/apidoc/

const https = require('https')

const ENDPOINTS = {
  sandbox: 'rest.pos.sandbox.cloud.linkly.com.au',
  production: 'rest.pos.cloud.linkly.com.au'
}

let state = {
  paired: false,
  secret: null,
  token: null,
  tokenExpiry: null,
  sessionId: null,
  environment: 'sandbox',
  username: '',
  password: '',
  pairCode: '',
  lastTxn: null,
  polling: false
}

function getHost () {
  return ENDPOINTS[state.environment] || ENDPOINTS.sandbox
}

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

function request (method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`
    }
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(data)
    }

    const opts = {
      hostname: getHost(),
      port: 443,
      path: `/v1${path}`,
      method,
      headers,
      timeout: 30000
    }

    const req = https.request(opts, res => {
      let chunks = ''
      res.on('data', d => { chunks += d })
      res.on('end', () => {
        try {
          const json = chunks ? JSON.parse(chunks) : {}
          if (res.statusCode >= 400) {
            reject(new Error(json.message || json.error || `HTTP ${res.statusCode}`))
          } else {
            resolve(json)
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${chunks.slice(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    if (data) req.write(data)
    req.end()
  })
}

// ─── Authentication & Pairing ────────────────────────────────────────────────

async function pair (username, password, pairCode) {
  state.username = username
  state.password = password
  state.pairCode = pairCode

  const result = await request('POST', '/pairing/cloudpos', {
    username,
    password,
    pairCode
  })

  if (result.secret) {
    state.secret = result.secret
    state.paired = true
  }

  return result
}

async function authenticate () {
  if (!state.secret) throw new Error('Terminal not paired — pair first')

  const result = await request('POST', '/sessions', {
    username: state.username,
    password: state.password,
    secret: state.secret
  })

  if (result.sessionId) {
    state.sessionId = result.sessionId
    state.token = result.token || result.sessionId
    state.tokenExpiry = Date.now() + 3500000 // ~58 min
  }

  return result
}

let _authPromise = null
async function ensureSession () {
  if (!state.token || !state.tokenExpiry || Date.now() > state.tokenExpiry) {
    if (!_authPromise) {
      _authPromise = authenticate().finally(() => { _authPromise = null })
    }
    await _authPromise
  }
}

// ─── Transactions ────────────────────────────────────────────────────────────

async function purchase (amountCents, txnRef) {
  await ensureSession()

  const result = await request('POST', `/sessions/${state.sessionId}/transaction`, {
    request: {
      txnType: 'P',
      amtPurchase: Math.round(amountCents),
      txnRef: txnRef || `TXN-${Date.now()}`,
      merchant: '00',
      currencyCode: 'AUD'
    },
    notification: { uri: null }
  })

  state.lastTxn = {
    reference: result.reference || result.sessionId,
    status: 'in_progress',
    startedAt: Date.now()
  }

  return result
}

async function refund (amountCents, txnRef) {
  await ensureSession()

  const result = await request('POST', `/sessions/${state.sessionId}/transaction`, {
    request: {
      txnType: 'R',
      amtPurchase: Math.round(amountCents),
      txnRef: txnRef || `REF-${Date.now()}`,
      merchant: '00',
      currencyCode: 'AUD'
    },
    notification: { uri: null }
  })

  state.lastTxn = {
    reference: result.reference || result.sessionId,
    status: 'in_progress',
    startedAt: Date.now()
  }

  return result
}

async function pollResult (reference) {
  await ensureSession()
  const ref = reference || state.lastTxn?.reference
  if (!ref) throw new Error('No transaction reference to poll')

  const result = await request('GET', `/sessions/${state.sessionId}/transaction/${ref}`)
  return result
}

async function settlement () {
  await ensureSession()

  const result = await request('POST', `/sessions/${state.sessionId}/settlement`, {
    request: {
      merchant: '00'
    }
  })

  return result
}

async function cancelTransaction () {
  if (!state.sessionId || !state.lastTxn?.reference) return null
  try {
    const result = await request('POST', `/sessions/${state.sessionId}/key`, {
      request: { key: 'OkCancel', data: 'cancel' }
    })
    return result
  } catch (_) {
    return null
  }
}

// ─── Status & Config ─────────────────────────────────────────────────────────

function getStatus () {
  return {
    paired: state.paired,
    hasCredentials: !!(state.username && state.secret),
    environment: state.environment,
    sessionActive: !!(state.token && Date.now() < (state.tokenExpiry || 0)),
    lastTxn: state.lastTxn
  }
}

function configure (opts) {
  if (opts.environment) state.environment = opts.environment
  if (opts.username) state.username = opts.username
  if (opts.password) state.password = opts.password
  if (opts.secret) { state.secret = opts.secret; state.paired = true }
  if (opts.pairCode) state.pairCode = opts.pairCode
}

function reset () {
  state.token = null
  state.tokenExpiry = null
  state.sessionId = null
  state.lastTxn = null
  state.polling = false
}

// ─── High-level payment flow (polls until complete or timeout) ───────────────

async function processPayment (amountCents, txnRef, onStatus) {
  const TIMEOUT = 120000 // 2 minutes
  const POLL_INTERVAL = 1500

  // Initiate
  const initResult = await purchase(amountCents, txnRef)
  const reference = initResult.reference || initResult.sessionId || state.lastTxn?.reference
  if (!reference) throw new Error('No transaction reference returned')

  if (onStatus) onStatus({ stage: 'waiting', message: 'Present card on terminal...' })
  state.polling = true

  const startTime = Date.now()

  while (state.polling && (Date.now() - startTime) < TIMEOUT) {
    await sleep(POLL_INTERVAL)
    if (!state.polling) break

    try {
      const poll = await pollResult(reference)

      if (poll.response) {
        state.polling = false
        state.lastTxn = {
          ...state.lastTxn,
          status: poll.response.success ? 'approved' : 'declined',
          result: poll.response
        }

        return {
          success: poll.response.success || poll.response.responseCode === '00',
          responseCode: poll.response.responseCode,
          responseText: poll.response.responseText,
          cardType: poll.response.cardType,
          accountType: poll.response.accountType,
          bankRef: poll.response.bankRef || poll.response.rrn,
          amount: poll.response.amtPurchase || amountCents,
          receipt: poll.response.receipt || [],
          raw: poll.response
        }
      }

      // Still in progress — update status
      if (poll.status && onStatus) {
        onStatus({ stage: 'processing', message: poll.status })
      }
    } catch (e) {
      if (onStatus) onStatus({ stage: 'error', message: e.message })
    }
  }

  state.polling = false
  if (Date.now() - startTime >= TIMEOUT) {
    throw new Error('Payment timed out — check terminal')
  }
  throw new Error('Payment cancelled')
}

async function processRefund (amountCents, txnRef, onStatus) {
  const TIMEOUT = 120000
  const POLL_INTERVAL = 1500

  const initResult = await refund(amountCents, txnRef)
  const reference = initResult.reference || initResult.sessionId || state.lastTxn?.reference
  if (!reference) throw new Error('No transaction reference returned')

  if (onStatus) onStatus({ stage: 'waiting', message: 'Present card for refund...' })
  state.polling = true

  const startTime = Date.now()

  while (state.polling && (Date.now() - startTime) < TIMEOUT) {
    await sleep(POLL_INTERVAL)
    if (!state.polling) break

    try {
      const poll = await pollResult(reference)
      if (poll.response) {
        state.polling = false
        return {
          success: poll.response.success || poll.response.responseCode === '00',
          responseCode: poll.response.responseCode,
          responseText: poll.response.responseText,
          cardType: poll.response.cardType,
          bankRef: poll.response.bankRef || poll.response.rrn,
          amount: poll.response.amtPurchase || amountCents,
          receipt: poll.response.receipt || [],
          raw: poll.response
        }
      }
    } catch (e) {
      if (onStatus) onStatus({ stage: 'error', message: e.message })
    }
  }

  state.polling = false
  if (Date.now() - startTime >= TIMEOUT) {
    throw new Error('Refund timed out — check terminal')
  }
  throw new Error('Refund cancelled')
}

function cancelPolling () {
  state.polling = false
  cancelTransaction()
}

function sleep (ms) { return new Promise(r => setTimeout(r, ms)) }

module.exports = {
  pair,
  authenticate,
  purchase,
  refund,
  pollResult,
  settlement,
  cancelTransaction,
  cancelPolling,
  processPayment,
  processRefund,
  getStatus,
  configure,
  reset
}
