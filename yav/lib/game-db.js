// ═══════════════════════════════════════════════════════
//   🚀 GAME DATABASE — Among Us
// ═══════════════════════════════════════════════════════
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const p = (f) => path.join(__dirname, '../data', f)

// ── Player Profiles ────────────────────────────────────
const profilesDB = new Low(new JSONFile(p('profiles.json')), { profiles: {} })
await profilesDB.read()
profilesDB.data.profiles ??= {}

export async function getPlayerProfile(jid) {
  return profilesDB.data.profiles[jid] ?? null
}

export async function setPlayerProfile(jid, data) {
  profilesDB.data.profiles[jid] = {
    ...(profilesDB.data.profiles[jid] || {}),
    ...data,
  }
  await profilesDB.write()
}

// ── Rooms ──────────────────────────────────────────────
const roomsDB = new Low(new JSONFile(p('rooms.json')), { rooms: {} })
await roomsDB.read()
roomsDB.data.rooms ??= {}

export async function getRoom(code) {
  return roomsDB.data.rooms[code] ?? null
}

export async function setRoom(code, data) {
  roomsDB.data.rooms[code] = data
  await roomsDB.write()
}

export async function deleteRoom(code) {
  delete roomsDB.data.rooms[code]
  await roomsDB.write()
}

export async function getRooms() {
  return roomsDB.data.rooms
}

// ── Group Settings (auon / auoff) ──────────────────────
const groupDB = new Low(new JSONFile(p('game-groups.json')), { groups: {} })
await groupDB.read()
groupDB.data.groups ??= {}

export async function getGroupSetting(groupJid) {
  return groupDB.data.groups[groupJid] ?? null
}

export async function setGroupSetting(groupJid, data) {
  groupDB.data.groups[groupJid] = {
    ...(groupDB.data.groups[groupJid] || {}),
    ...data,
  }
  await groupDB.write()
}

// Legacy compat
export const getPlayer = getPlayerProfile
export const setPlayer = setPlayerProfile
export const setRooms  = async (rooms) => { roomsDB.data.rooms = rooms; await roomsDB.write() }


// ── Get all profiles as array (for leaderboard) ────────
export async function getAllProfiles() {
  const all = profilesDB.data.profiles
  return Object.values(all).filter(p => p.username && !p.step)
}
