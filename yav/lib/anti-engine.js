// ─────────────────────────────────────────────
//  Anti-Engine — shared moderation logic
// ─────────────────────────────────────────────

import { addWarn, resetWarns } from './mongodb.js'
import config from '../config.js'

// flood tracker: jid -> { count, timer }
const floodMap = new Map()
const FLOOD_LIMIT = 7
const FLOOD_WINDOW = 5000 // ms

// spam tracker: jid -> { lastMsg, count }
const spamMap = new Map()
const SPAM_LIMIT = 5
const SPAM_WINDOW = 3000

export async function kickUser(sock, groupJid, userJid) {
  try {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove')
    return true
  } catch {
    return false
  }
}

export async function warnAndKick(sock, groupJid, userJid, reason) {
  const count = await addWarn(groupJid, userJid)
  const num = userJid.split('@')[0]

  if (count >= config.warnLimit) {
    await sock.sendMessage(groupJid, {
      text: `「ᴡᴀʀɴɪɴɢ」\n──────➳\n๏ ๏\n⚘ ᴜsᴇʀ: @${num}\n⚘ ʀᴇᴀsᴏɴ: ${reason}\n⚘ sᴛᴀᴛᴜs: ᴋɪᴄᴋᴇᴅ — ᴡᴀʀɴs ᴇxʜᴀᴜsᴛᴇᴅ\n──────────✷`,
      mentions: [userJid]
    })
    await kickUser(sock, groupJid, userJid)
    await resetWarns(groupJid, userJid)
    return count
  }

  await sock.sendMessage(groupJid, {
    text: `「ᴡᴀʀɴɪɴɢ」\n──────➳\n๏ ๏\n⚘ ᴜsᴇʀ: @${num}\n⚘ ʀᴇᴀsᴏɴ: ${reason}\n⚘ ᴡᴀʀɴs: ${count}/${config.warnLimit}\n──────────✷`,
    mentions: [userJid]
  })
  return count
}

export function isFlood(userJid) {
  const now = Date.now()
  const entry = floodMap.get(userJid) || { count: 0, start: now }

  if (now - entry.start > FLOOD_WINDOW) {
    floodMap.set(userJid, { count: 1, start: now })
    return false
  }

  entry.count++
  floodMap.set(userJid, entry)
  return entry.count > FLOOD_LIMIT
}

export function isSpam(userJid, text) {
  const now = Date.now()
  const entry = spamMap.get(userJid) || { lastMsg: '', count: 0, time: now }

  if (now - entry.time > SPAM_WINDOW || entry.lastMsg !== text) {
    spamMap.set(userJid, { lastMsg: text, count: 1, time: now })
    return false
  }

  entry.count++
  spamMap.set(userJid, entry)
  return entry.count > SPAM_LIMIT
}
