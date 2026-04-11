// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — MAIN CONNECTION (CLEAN VERSION)
//   ✷  THE ARCHITECT  x  ASTRAL ANIME
// ═══════════════════════════════════════════════════════

import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
} from 'baileys'

import { mkdirSync, existsSync, readFileSync } from 'fs'
import mongoose from 'mongoose' // MongoDB ke liye add kiya gaya
import config from './config.js'
import { handleMessage, handleGroupParticipants } from './handler.js'
import { startMonitor } from './plugins/game/monitor.js'

// ── Heartbeat System ───────────────────────────────────
// Pehle ye index2.js par depend tha, ab ye independent hai
async function bumpHeartbeat() {
  // VPS PM2 handles restart, so we just log or skip
  return
}

const LABEL = process.env.BOT_LABEL || 'VampireDiaries'

// ── Kill Baileys spam ──────────────────────────────────
const SPAM_PATTERNS = [
  'Closing session', 'SessionEntry', 'baseKey', 'baseKeyType',
  'pendingPreKey', 'signedKeyId', 'preKeyId', 'remoteIdentityKey',
  'ephemeralKeyPair', 'currentRatchet', 'registrationId', '_chains',
  'chainKey', 'chainType', 'messageKeys', 'rootKey', '<Buffer',
  'pubKey', 'privKey', 'previousCounter', 'indexInfo',
  'Closing open session', 'Decrypted message with closed session',
  'Failed to decrypt', 'Session error', 'Bad MAC', 'SessionCipher',
  'decryptWithSessions', 'verifyMAC', 'asyncQueueExecutor', 'closed session',
  'Connection Closed', 'rate-overlimit',
]
function isSpam(str) {
  if (typeof str !== 'string') return false
  return SPAM_PATTERNS.some(p => str.includes(p))
}
const _stdoutWrite = process.stdout.write.bind(process.stdout)
const _stderrWrite = process.stderr.write.bind(process.stderr)
process.stdout.write = (chunk, ...args) => {
  if (isSpam(String(chunk))) return true
  return _stdoutWrite(chunk, ...args)
}
process.stderr.write = (chunk, ...args) => {
  if (isSpam(String(chunk))) return true
  return _stderrWrite(chunk, ...args)
}
const botLog = (...args) => _stdoutWrite(`[${LABEL}] ` + args.join(' ') + '\n')

// ── Silent logger ──────────────────────────────────────
const logger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info:  () => {},
  warn:  () => {}, error: () => {}, fatal: () => {},
  child: () => logger,
}

// ── State ──────────────────────────────────────────────
let activeSock        = null
let reconnectTimer    = null
let pairingRequested  = false
let wasEverConnected  = false
let isStarting        = false
let isShuttingDown    = false
let reconnectAttempt  = 0

// ── Reconnect backoff (3s → caps at 30s) ──────────────
const RECONNECT_BASE = 3_000
const RECONNECT_CAP  = 30_000
function scheduleReconnect() {
  if (isShuttingDown) return
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  const delay = Math.min(RECONNECT_BASE * 2 ** reconnectAttempt, RECONNECT_CAP)
  reconnectAttempt++
  botLog(`🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempt})`)
  reconnectTimer = setTimeout(() => startBot(), delay)
}

// ── Teardown helper ────────────────────────────────────
function teardown(sock) {
  if (!sock) return
  try { sock.ev.removeAllListeners() } catch {}
  try { sock.ws?.close() }             catch {}
  try { sock.end?.() }                 catch {}
}

// ── Message dedup ──────────────────────────────────────
const processedIds = new Set()
function alreadySeen(msgId) {
  if (!msgId) return false
  if (processedIds.has(msgId)) return true
  processedIds.add(msgId)
  if (processedIds.size > 500) {
    ;[...processedIds].slice(0, 100).forEach(id => processedIds.delete(id))
  }
  return false
}

// ── Cached Baileys version ─────────────────────────────
let cachedVersion = null

// ── Global crash guard ─────────────────────────────────
process.on('uncaughtException', (err) => {
  botLog('💥 uncaughtException:', err?.message ?? err)
  if (!isShuttingDown) scheduleReconnect()
})
process.on('unhandledRejection', (reason) => {
  botLog('💥 unhandledRejection:', reason?.message ?? reason)
})

// ── Graceful shutdown ──────────────────────────────────
async function gracefulShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true
  botLog(`🛑 ${signal} received — shutting down gracefully...`)

  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }

  const sock = activeSock
  activeSock = null
  teardown(sock)

  botLog('✅ Shutdown complete.')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

// ══════════════════════════════════════════════════════
//   START BOT
// ══════════════════════════════════════════════════════
export async function startBot() {
  if (isShuttingDown) return
  if (isStarting) { botLog('⏳ Already starting, skipping duplicate call'); return }
  isStarting = true

  try {
    const AUTH_DIR   = process.env.AUTH_DIR   || './auth_info_baileys'
    const PHONE_FILE = process.env.PHONE_FILE || './paired_number.txt'
    mkdirSync(AUTH_DIR,    { recursive: true })
    mkdirSync('./logs',    { recursive: true })
    mkdirSync('./session', { recursive: true })

    // ── MongoDB Connection ─────────────────────────────
    if (mongoose.connection.readyState !== 1) {
      botLog('Connecting to MongoDB...')
      // config.js se mongodbUri uthayega
      await mongoose.connect(config.mongodbUri).catch(err => {
        botLog('❌ MongoDB Connection Error:', err.message)
      })
      botLog('✅ MongoDB Connected!')
    }

    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }

    // Tear down old socket
    const oldSock = activeSock
    activeSock = null
    teardown(oldSock)

    processedIds.clear()

    // ── Auth state ─────────────────────────────────────
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    // ── Baileys version ────────────────────────────────
    const FALLBACK_VERSION = [2, 3000, 1015901307]
    try {
      const { version } = await fetchLatestBaileysVersion()
      cachedVersion = version
      botLog('✅ Baileys version:', version.join('.'))
    } catch {
      cachedVersion = cachedVersion ?? FALLBACK_VERSION
      botLog('⚠️ Version fetch failed, using fallback:', cachedVersion.join('.'))
    }

    const sock = makeWASocket({
      version: cachedVersion,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.baileys('Desktop'),
      printQRInTerminal:              false,
      generateHighQualityLinkPreview: false,
      syncFullHistory:                false,
      markOnlineOnConnect:            true,
      keepAliveIntervalMs:            25_000,
      connectTimeoutMs:               60_000,
    })

    activeSock = sock
    sock._prefix = process.env.BOT_PREFIX || config.prefix
    botLog(`⚙️  Prefix: "${sock._prefix}"`)

    sock.ev.on('creds.update', saveCreds)

    // ── Pairing code ───────────────────────────────────
    if (!sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true
      await new Promise(r => setTimeout(r, 3000))
      try {
        if (!existsSync(PHONE_FILE)) {
          botLog(`❌ ${PHONE_FILE} not found! Create it with your number e.g. 2347062301848`)
        } else {
          const phoneNumber = readFileSync(PHONE_FILE, 'utf-8').trim().replace(/\D/g, '')
          botLog(`📱 Requesting pairing code for: ${phoneNumber}`)
          let code = null
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              code = await sock.requestPairingCode(phoneNumber)
              break
            } catch (e) {
              botLog(`⚠️ Pairing attempt ${attempt} failed: ${e.message}`)
              if (attempt < 3) await new Promise(r => setTimeout(r, 3000))
            }
          }
          if (!code) {
            botLog('❌ All pairing attempts failed. Delete auth_info_baileys and restart.')
          } else {
            botLog(`\n🔑 ══════════════════════════════`)
            botLog(`🔑  PAIRING CODE: ${code}`)
            botLog(`🔑 ══════════════════════════════`)
            botLog(`👆 WhatsApp > Settings > Linked Devices > Link with phone number`)
            botLog(`⚠️  Enter it within 60 seconds!\n`)
          }
        }
      } catch (err) {
        botLog('❌ Pairing code error:', err.message)
      }
    }

    // ── Connection events ──────────────────────────────
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (sock !== activeSock) return
      if (isShuttingDown) return

      if (connection === 'close') {
        const code      = lastDisconnect?.error?.output?.statusCode
        const loggedOut = code === DisconnectReason.loggedOut
        const conflict  = code === DisconnectReason.conflict
        botLog(`❌ Connection closed (code ${code ?? 'unknown'})`)

        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }

        if (loggedOut) {
          botLog('⚠️ Got logout signal (401) — reconnecting...')
          reconnectAttempt = 0
          scheduleReconnect()
          return
        }

        if (conflict) {
          botLog('⚠️ Session conflict (440). Reconnecting in 15s...')
          reconnectTimer = setTimeout(() => startBot(), 15_000)
          return
        }

        if (!wasEverConnected) {
          pairingRequested = false
        }
        scheduleReconnect()
      }

      if (connection === 'open') {
        startMonitor(sock)
        bumpHeartbeat()
        botLog(`\n✅ Vampire Diaries connected! (prefix="${sock._prefix}")\n`)
        reconnectAttempt = 0

        if (!wasEverConnected) {
          wasEverConnected = true
          const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          const statusText =
            `•.¸♡ 𝗩𝗮𝗺𝗽𝗶𝗿𝗲 𝗗𝗶𝗮𝗿𝗶𝗲𝘀 ♡¸.•\n` +
            `        ᴍɪɴɪᴍᴀʟ • ᴡᴏʀʟᴅ\n` +
            `          ✷──────✷\n\n` +
            `「sᴛᴀᴛᴜs」\n──────➳\n๏ ๏\n` +
            `⚘ sᴛᴀᴛᴇ: ᴏɴʟɪɴᴇ\n⚘ ᴅᴀᴛᴇ: ${date}\n⚘ ᴛɪᴍᴇ: ${time}\n⏱ ${time}\n──────────✷`

          await sock.sendMessage(config.ownerJid, { text: statusText }).catch(() => {})
        }
      }
    })

    // ── Messages ───────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (sock !== activeSock) return
      if (isShuttingDown) return
      if (type !== 'notify' && type !== 'append') return

      bumpHeartbeat()

      for (const msg of messages) {
        if (!msg.message) continue
        if (msg.key.fromMe) continue
        if (alreadySeen(msg.key.id)) continue

        try {
          await handleMessage(sock, msg)
        } catch (err) {
          botLog('❌ Handler error:', err.message)
        }
      }
    })

    // ── Group participant events ────────────────────────
    sock.ev.on('group-participants.update', async (event) => {
      if (sock !== activeSock) return
      if (isShuttingDown) return
      try {
        await handleGroupParticipants(sock, event)
      } catch (err) {
        botLog('⚠️ Group event error:', err.message)
      }
    })

    return sock

  } catch (err) {
    botLog('💥 startBot() failed:', err?.message ?? err)
    if (!isShuttingDown) scheduleReconnect()
  } finally {
    isStarting = false
  }
}

// ── Boot ───────────────────────────────────────────────
// Bot ko start karne ke liye call
startBot();

// Keep process alive for VPS
setInterval(() => {}, 1000 * 60 * 60);
