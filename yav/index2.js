// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — BOT WORKER ENTRY
//   ✷  THE ARCHITECT  x  ASTRAL ANIME
//   PM2 runs this file — NOT index.js
// ═══════════════════════════════════════════════════════

const LABEL = process.env.BOT_LABEL || 'VampireDiaries'

// Safety nets — log but do NOT exit; main.js handles reconnect internally
process.on('uncaughtException',  (err) => console.error(`[${LABEL}][uncaught]`, err?.message || err))
process.on('unhandledRejection', (err) => console.error(`[${LABEL}][unhandled]`, err?.message || err))

// ── Exponential backoff boot ───────────────────────────
const BACKOFF_START = 3_000
const BACKOFF_CAP   = 30_000

let startBotRef = null

async function boot(attempt = 0) {
  try {
    const mod = await import('./main.js')
    startBotRef = mod.startBot
    await startBotRef()
  } catch (err) {
    const delay = Math.min(BACKOFF_START * 2 ** attempt, BACKOFF_CAP)
    console.error(`[${LABEL}] ❌ startBot() failed (attempt ${attempt + 1}):`, err?.message || err)
    console.error(`[${LABEL}] 🔄 Retrying in ${delay / 1000}s...`)
    setTimeout(() => boot(attempt + 1), delay)
  }
}

boot()

// ── Watchdog ───────────────────────────────────────────
// Checks every 5 minutes whether the bot's connection is still alive.
// main.js calls bumpHeartbeat() on every connection.update or message event.
// If nothing bumps it for 6 minutes the watchdog forces a reconnect.
// This handles silent network drops where Baileys never fires any event.
const WATCHDOG_INTERVAL_MS = 5 * 60_000
const WATCHDOG_STALE_MS    = 6 * 60_000

let lastHeartbeat = Date.now()

export function bumpHeartbeat() {
  lastHeartbeat = Date.now()
}

setInterval(() => {
  const age = Date.now() - lastHeartbeat
  if (age > WATCHDOG_STALE_MS) {
    console.error(`[${LABEL}][watchdog] ⚠️  No heartbeat for ${Math.round(age / 1000)}s — forcing reconnect`)
    lastHeartbeat = Date.now()
    if (startBotRef) {
      startBotRef().catch(err =>
        console.error(`[${LABEL}][watchdog] startBot() error:`, err?.message || err)
      )
    }
  }
}, WATCHDOG_INTERVAL_MS)

// Keep process alive — PM2 monitors this
setInterval(() => {}, 60_000)
