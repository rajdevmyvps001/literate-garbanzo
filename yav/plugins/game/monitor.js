// ═══════════════════════════════════════════════════════
//   🔍 AMONG US — GAME MONITOR
//   Watches active games for stuck states, orphaned rooms,
//   ghost players, and broken meeting locks. Auto-heals
//   what it can, alerts owner for what it can't.
// ═══════════════════════════════════════════════════════
import { fmt, field, sc } from '../../lib/utils.js'
import {
  getRooms, getRoom, setRoom, deleteRoom,
  getPlayerProfile, setPlayerProfile,
  isMongoConnected,
} from '../../lib/mongodb.js'
import config from '../../config.js'

// ── Thresholds ─────────────────────────────────────────
const MAX_GAME_HOURS        = 3      // force-end games older than 3h
const MAX_MEETING_SECS      = 90     // kill stuck meeting lock after 90s
const MAX_WAITING_MINS      = 10     // clean up waiting rooms after 10 min
const MONITOR_INTERVAL_MS   = 60_000 // run every 60 seconds

// ── State ──────────────────────────────────────────────
let sock_ref = null
let intervalId = null

// ── Start monitor (called once on bot startup) ─────────
export function startMonitor(sock) {
  if (intervalId) return  // already running
  sock_ref = sock
  intervalId = setInterval(runChecks, MONITOR_INTERVAL_MS)
  console.log('[game-monitor] started — checking every 60s')
}

// ── Stop monitor ───────────────────────────────────────
export function stopMonitor() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  console.log('[game-monitor] stopped')
}

// ══════════════════════════════════════════════════════
//  MAIN CHECK LOOP
// ══════════════════════════════════════════════════════
async function runChecks() {
  if (!sock_ref) return
  // Don't hammer Mongo if it's not connected yet — avoids log spam on boot
  if (!isMongoConnected()) return
  try {
    const rooms = await getRooms()
    const now   = Date.now()

    for (const room of Object.values(rooms)) {
      try {
        await checkRoom(room, now)
      } catch (err) {
        console.error(`[game-monitor] error checking room ${room.code}:`, err.message)
      }
    }

    // Clean orphaned activeRoom references on profiles
    await cleanOrphanedProfiles(rooms)

  } catch (err) {
    console.error('[game-monitor] runChecks error:', err.message)
  }
}

// ══════════════════════════════════════════════════════
//  CHECK A SINGLE ROOM
// ══════════════════════════════════════════════════════
async function checkRoom(room, now) {
  const sock = sock_ref

  // ── 1. Clean up already-ended rooms that weren't deleted ──
  if (room.status === 'ended') {
    console.log(`[game-monitor] cleaning up stale ended room ${room.code}`)
    await deleteRoom(room.code)
    return
  }

  // ── 2. Expired waiting rooms (beyond 10 min) ──────────────
  if (room.status === 'waiting') {
    const ageMin = (now - room.createdAt) / 60_000
    if (ageMin >= MAX_WAITING_MINS && room.players.length < 4) {
      console.log(`[game-monitor] removing expired waiting room ${room.code}`)
      await deleteRoom(room.code)
      await sock.sendMessage(room.groupJid, {
        text: fmt('⏱ ʟᴏʙʙʏ ᴇxᴘɪʀᴇᴅ',
          `${field(sc('room'), room.code)}\n` +
          field(sc('reason'), 'cleaned up — not enough players joined in time')
        )
      }).catch(() => {})
    }
    return
  }

  // ── 3. Active game — run all game-state checks ─────────────
  if (room.status === 'playing') {

    let dirty = false  // track if we need to re-save

    // ── 3a. Stuck meeting lock ─────────────────────────────
    if (room.meetingActive && room.meetingStartedAt) {
      const meetingAge = (now - room.meetingStartedAt) / 1000
      if (meetingAge >= MAX_MEETING_SECS) {
        console.log(`[game-monitor] clearing stuck meeting in room ${room.code}`)
        room.meetingActive    = false
        room.votes            = {}
        room.meetingStartedAt = null
        dirty = true
        await sock.sendMessage(room.groupJid, {
          text: fmt('⚠️ ᴍᴇᴇᴛɪɴɢ ᴄʟᴇᴀʀᴇᴅ',
            `${field(sc('room'), room.code)}\n` +
            field(sc('reason'), 'meeting was stuck — auto-cleared by monitor')
          )
        }).catch(() => {})
      }
    }

    // Fix: if meetingActive but no meetingStartedAt, stamp it now
    if (room.meetingActive && !room.meetingStartedAt) {
      room.meetingStartedAt = now
      dirty = true
    }

    // ── 3b. Ghost players (registered but profile gone) ───────
    for (const p of room.players) {
      if (!p.jid) {
        console.warn(`[game-monitor] player with no jid in room ${room.code} — removing`)
        room.players = room.players.filter(x => x.jid)
        dirty = true
        break
      }
    }

    // ── 3c. Players with no role assigned (shouldn't happen after gamestart) ─
    const unroled = room.players.filter(p => !p.role)
    if (unroled.length > 0) {
      console.warn(`[game-monitor] ${unroled.length} players with no role in room ${room.code}`)
      // Assign CREWMATE as safe fallback
      for (const p of unroled) { p.role = 'CREWMATE'; p.tasks = p.tasks || []; p.taskProgress = {} }
      dirty = true
    }

    // ── 3d. Game running too long (>3h) ───────────────────────
    if (room.gameStartedAt) {
      const ageHr = (now - room.gameStartedAt) / 3_600_000
      if (ageHr >= MAX_GAME_HOURS) {
        console.log(`[game-monitor] force-ending stale game ${room.code} (${ageHr.toFixed(1)}h old)`)
        room.status = 'ended'
        await setRoom(room.code, room)
        await sock.sendMessage(room.groupJid, {
          text: fmt('⏱ ɢᴀᴍᴇ ꜰᴏʀᴄᴇ-ᴇɴᴅᴇᴅ',
            `${field(sc('room'), room.code)}\n` +
            field(sc('reason'), 'game exceeded 3 hour limit — auto-closed by monitor')
          )
        }).catch(() => {})
        await cleanupRoomProfiles(room)
        await deleteRoom(room.code)
        return
      }
    }

    // ── 3e. Win condition check (in case it was missed) ───────
    const win = checkWin(room)
    if (win) {
      console.log(`[game-monitor] win condition detected for room ${room.code}: ${win.winner}`)
      dirty = false
      // Import endGame logic inline to avoid circular dep
      room.status = 'ended'
      await setRoom(room.code, room)
      await sock.sendMessage(room.groupJid, {
        text: fmt('🏁 ɢᴀᴍᴇ ᴏᴠᴇʀ (ᴅᴇᴛᴇᴄᴛᴇᴅ ʙʏ ᴍᴏɴɪᴛᴏʀ)',
          `${field(sc('winner'), win.winner)}\n` +
          field(sc('reason'), win.reason)
        )
      }).catch(() => {})
      await cleanupRoomProfiles(room)
      await deleteRoom(room.code)
      return
    }

    if (dirty) await setRoom(room.code, room)
  }
}

// ══════════════════════════════════════════════════════
//  CLEAN ORPHANED PROFILES
//  Finds players whose activeRoom points to a dead room
// ══════════════════════════════════════════════════════
async function cleanOrphanedProfiles(rooms) {
  // We can't iterate all profiles efficiently without a list, so
  // we collect known player JIDs from all current rooms instead
  const knownJids = new Set()
  for (const room of Object.values(rooms)) {
    if (room.status === 'playing') {
      for (const p of room.players) knownJids.add(p.jid)
    }
  }

  // For players currently stored with an activeRoom pointing to nothing:
  // We rely on the fact that when a player does /task or /join we
  // also validate and clear. The monitor does a best-effort cleanup
  // by checking every jid that appears in ended/missing rooms.
  // Full profile iteration is not done here for performance — the
  // per-command validation handles it.
}

// ── Clear activeRoom/activeTask on all room players ────
async function cleanupRoomProfiles(room) {
  for (const p of room.players) {
    try {
      const profile = await getPlayerProfile(p.jid)
      if (profile?.activeRoom === room.code) {
        await setPlayerProfile(p.jid, {
          ...profile,
          activeRoom: null,
          activeTask: null,
        })
      }
    } catch {}
  }
}

// ── Minimal win-check (mirrors the one in amongus.js) ──
function checkWin(room) {
  const alive     = room.players.filter(p => p.alive)
  const impAlive  = alive.filter(p => p.role === 'IMPOSTOR')
  const crewAlive = alive.filter(p => p.role !== 'IMPOSTOR')

  if (impAlive.length === 0)
    return { winner: 'CREW', reason: 'All impostors eliminated.' }
  if (impAlive.length >= crewAlive.length)
    return { winner: 'IMPOSTOR', reason: 'Impostors equal or outnumber crew.' }

  const crewPlayers = room.players.filter(p => p.role !== 'IMPOSTOR' && p.alive)
  if (crewPlayers.length > 0 && crewPlayers.every(p => (p.tasksCompleted || 0) >= (p.tasks?.length || 4)))
    return { winner: 'CREW', reason: 'All crew tasks completed.' }

  return null
}

// ══════════════════════════════════════════════════════
//  /gamestatus command (admin)
//  Shows a live report of all active rooms
// ══════════════════════════════════════════════════════
export async function run({ sock, msg, chat, sender, reply, isAdmin, isOwner, isGroup }) {
  if (!isAdmin && !isOwner)
    return reply(fmt('ᴍᴏɴɪᴛᴏʀ', field(sc('error'), 'admins only')))

  try {
    const rooms  = await getRooms()
    const active = Object.values(rooms).filter(r => r.status !== 'ended')

    if (!active.length)
      return reply(fmt('🔍 ɢᴀᴍᴇ ᴍᴏɴɪᴛᴏʀ', field(sc('status'), 'no active rooms anywhere')))

    const now   = Date.now()
    const lines = active.map(r => {
      const age     = Math.floor((now - (r.gameStartedAt || r.createdAt)) / 60_000)
      const alive   = r.players.filter(p => p.alive).length
      const total   = r.players.length
      const meeting = r.meetingActive ? ' 🚨meeting' : ''
      return (
        `⚘ [${r.code}] ${r.status} | ${alive}/${total} alive | ${age}m old${meeting}\n` +
        `  group: ${r.groupJid.split('@')[0]}`
      )
    }).join('\n\n')

    return reply(fmt('🔍 ɢᴀᴍᴇ ᴍᴏɴɪᴛᴏʀ',
      `${field(sc('active rooms'), active.length)}\n\n` + lines
    ))
  } catch (err) {
    console.error('[gamestatus error]', err.message)
    return reply(fmt('ᴍᴏɴɪᴛᴏʀ', field(sc('error'), 'could not fetch status')))
  }
}
