// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — PERMISSION ENGINE
// ═══════════════════════════════════════════════════════
import { readFileSync, writeFileSync, existsSync } from 'fs'

const DB_PATH = './data/mods.json'

// ── Load/save mod list ─────────────────────────────────
function loadMods() {
  try {
    if (!existsSync(DB_PATH)) return []
    return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  } catch { return [] }
}

function saveMods(list) {
  writeFileSync(DB_PATH, JSON.stringify(list, null, 2))
}

// ── Normalize JID to bare number ──────────────────────
export function toNumber(jid = '') {
  return String(jid).replace(/:[^@]+@/, '@').split('@')[0].replace(/\D/g, '')
}

// ── Permission tiers ──────────────────────────────────
export const PERM = {
  PUBLIC: 'public',   // everyone
  MOD:    'mod',      // sudo mods set by owner
  ADMIN:  'admin',    // WA group admins
  OWNER:  'owner',    // bot owner only
}

// ── Check if sender is owner ──────────────────────────
export function checkOwner(senderJid, config) {
  const num = toNumber(senderJid)
  return (
    num === toNumber(config.ownerNumber) ||
    num === toNumber(config.ownerLid)
  )
}

// ── Check if sender is a sudo mod ─────────────────────
export function checkMod(senderJid) {
  const num = toNumber(senderJid)
  return loadMods().some(m => toNumber(m) === num)
}

// ── Add a mod (owner only) ────────────────────────────
export function addMod(jid) {
  const mods = loadMods()
  const num   = toNumber(jid)
  if (mods.some(m => toNumber(m) === num)) return false
  mods.push(jid)
  saveMods(mods)
  return true
}

// ── Remove a mod ──────────────────────────────────────
export function removeMod(jid) {
  const mods = loadMods()
  const num   = toNumber(jid)
  const next  = mods.filter(m => toNumber(m) !== num)
  if (next.length === mods.length) return false
  saveMods(next)
  return true
}

// ── List all mods ─────────────────────────────────────
export function listMods() {
  return loadMods()
}

// ── Resolve full permission context for a message ─────
export function resolvePerms(msg, config) {
  const senderJid = msg.sender?.jid || msg.from || ''
  const isOwner   = checkOwner(senderJid, config)
  const isMod     = isOwner || checkMod(senderJid)   // owner is always mod
  const isAdmin   = msg.isAdmin || false
  const isBotAdmin = msg.isBotAdmin || false

  return { isOwner, isMod, isAdmin, isBotAdmin, senderJid }
}

// ── Gate check — returns true if allowed ──────────────
export function isAllowed(perm, { isOwner, isMod, isAdmin }) {
  switch ((perm || PERM.PUBLIC).toLowerCase()) {
    case PERM.OWNER:  return isOwner
    case PERM.MOD:    return isMod || isOwner
    case PERM.ADMIN:  return isAdmin || isMod || isOwner
    case PERM.PUBLIC: return true
    default:          return false
  }
}

// ── Denial messages ───────────────────────────────────
export const DENY = {
  [PERM.OWNER]: `⛔ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪs ʀᴇsᴇʀᴠᴇᴅ ꜰᴏʀ ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n──────────✷`,
  [PERM.MOD]:   `⛔ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪs ꜰᴏʀ sᴜᴅᴏ ᴍᴏᴅs ᴀɴᴅ ᴀʙᴏᴠᴇ.\n──────────✷`,
  [PERM.ADMIN]: `⛔ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ɪs ꜰᴏʀ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏɴʟʏ.\n──────────✷`,
  private:      `⚠️ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴡᴏʀᴋs ɪɴ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ.\n──────────✷`,
  group:        `⚠️ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴏɴʟʏ ᴡᴏʀᴋs ɪɴ ɢʀᴏᴜᴘs.\n──────────✷`,
  botAdmin:     `⚠️ *Vampire Diaries*\n──────➳\n๏ ๏\n⚘ ᴍᴀᴋᴇ ᴍᴇ ᴀɴ ᴀᴅᴍɪɴ ꜰɪʀsᴛ.\n──────────✷`,
}
