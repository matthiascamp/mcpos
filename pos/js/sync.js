const SUPABASE_URL = ''
const SUPABASE_ANON_KEY = ''

let supabase = null

export async function initSync(url, key) {
  if (!url || !key) return false

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  supabase = createClient(url, key)
  return true
}

export function isOnline() {
  return !!supabase && navigator.onLine
}

export async function pushPending() {
  if (!isOnline()) return { pushed: 0 }

  const pending = await window.pos.getSyncPending()
  if (!pending.length) return { pushed: 0 }

  const synced = []

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload)
      const table = item.table_name

      if (item.action === 'insert' || item.action === 'update') {
        const { error } = await supabase.from(table).upsert(payload)
        if (error) throw error
      } else if (item.action === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', item.record_id)
        if (error) throw error
      }

      synced.push(item.id)
    } catch (err) {
      console.error(`Sync failed for ${item.table_name}/${item.record_id}:`, err.message)
    }
  }

  if (synced.length) {
    await window.pos.markSynced(synced)
  }

  return { pushed: synced.length, failed: pending.length - synced.length }
}

export async function pullProducts() {
  if (!isOnline()) return false

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('Pull products failed:', error.message)
    return false
  }

  for (const p of products) {
    await window.pos.upsertProduct(p)
  }

  return products.length
}

export async function pullCategories() {
  if (!isOnline()) return false

  const { data: cats, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)

  if (error) return false

  for (const c of cats) {
    await window.pos.upsertCategory(c)
  }

  return cats.length
}

let realtimeChannel = null

export function subscribeToChanges(onProductChange) {
  if (!isOnline()) return

  realtimeChannel = supabase
    .channel('pos-updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      if (payload.new) {
        window.pos.upsertProduct(payload.new)
        if (onProductChange) onProductChange(payload.new)
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
      if (payload.new) {
        window.pos.upsertCategory(payload.new)
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'specials' }, () => {
      if (onProductChange) onProductChange()
    })
    .subscribe()
}

let syncInterval = null

export function startAutoSync(intervalMs = 30000) {
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = setInterval(() => {
    pushPending().catch(console.error)
  }, intervalMs)
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}
