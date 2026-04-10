// ═══════════════════════════════════════════════════════
//   💾 STORAGE ENGINE — Phone Storage System
//   1 GB per phone. Apps take real space. Must uninstall
//   to make room. Tied to phone specs.
// ═══════════════════════════════════════════════════════
import { getPlayerProfile, setPlayerProfile } from './mongodb.js'
import { getPhone } from './phone-middleware.js'

// ── Phone storage capacity map ─────────────────────────
// Higher-end phones get more storage
const PHONE_STORAGE_MAP = {
  android:            1024,   // 1 GB (default)
  iphone_se:          2048,   // 2 GB
  iphone_14:          4096,   // 4 GB
  iphone_15_pro:      6144,   // 6 GB
  iphone_16_pro_max:  8192,   // 8 GB
  iphone_17_pro_max:  12288,  // 12 GB
  samsung_a15:        2048,
  samsung_a55:        4096,
  samsung_s23:        6144,
  samsung_s24_ultra:  8192,
  samsung_s25_ultra:  12288,
  xiaomi_redmi_12:    2048,
  xiaomi_13:          4096,
  xiaomi_14_ultra:    8192,
  black_shark_5_pro:  6144,
  xiaomi_15_ultra:    12288,
  oneplus_nord_ce3:   2048,
  oneplus_12r:        4096,
  oneplus_12:         6144,
  oneplus_13r:        6144,
  oneplus_13:         8192,
  rog_6:              8192,
  rog_7:              12288,
  rog_8_pro:          16384,  // 16 GB
  rog_9:              24576,  // 24 GB
  rog_9_pro_elite:    32768,  // 32 GB — king
}

// ── App size registry (in MB) ──────────────────────────
// Must match APPS registry in apps.js
export const APP_SIZES = {
  amongus:    274,
  casino:     138,
  genshin:    312,
  astralpay:  22,
  trivia:     48,
  chatbot:    35,
  converter:  19,
  downloader: 55,
  music:      42,
  vampiretv:  88,   // future
}

// ── Get phone's total storage capacity in MB ───────────
export function getStorageCapacity(phoneId) {
  return PHONE_STORAGE_MAP[phoneId] || 1024
}

// ── Calculate used storage from installed apps ─────────
export function calcUsedStorage(installedApps = []) {
  return installedApps.reduce((sum, id) => sum + (APP_SIZES[id] || 50), 0)
}

// ── Get storage summary for a user ────────────────────
export async function getStorageSummary(jid) {
  const profile    = await getPlayerProfile(jid)
  if (!profile)    return null

  const phoneId    = profile.phone?.id || 'android'
  const total      = getStorageCapacity(phoneId)
  const installed  = profile.installedApps || []
  const used       = calcUsedStorage(installed)
  const free       = total - used
  const pct        = Math.round((used / total) * 100)

  return { total, used, free, pct, installed, phoneId }
}

// ── Check if an app can be installed ──────────────────
export async function canInstall(jid, appId) {
  const profile   = await getPlayerProfile(jid)
  if (!profile)   return { ok: false, reason: 'not registered' }

  const phoneId   = profile.phone?.id || 'android'
  const total     = getStorageCapacity(phoneId)
  const installed = profile.installedApps || []
  const used      = calcUsedStorage(installed)
  const appSize   = APP_SIZES[appId] || 50
  const free      = total - used

  if (appSize > free) {
    return {
      ok: false,
      reason: 'not enough storage',
      needed: appSize,
      free,
      total,
      used,
    }
  }
  return { ok: true, free, appSize }
}

// ── Storage bar visual ────────────────────────────────
export function storageBar(pct) {
  const p      = Math.max(0, Math.min(100, Math.round(pct)))
  const filled = Math.round(p / 10)
  const empty  = 10 - filled
  const bar    = '█'.repeat(filled) + '░'.repeat(empty)
  const emoji  = p > 85 ? '🔴' : p > 60 ? '🟡' : '🟢'
  return `${emoji} [${bar}] ${p}%`
}

// ── Format MB to human readable ───────────────────────
export function fmtMB(mb) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}
