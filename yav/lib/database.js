import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Warns DB ───────────────────────────────────
const warnsDB = new Low(new JSONFile(path.join(__dirname, '../data/warns.json')), { warns: {} })
await warnsDB.read()
warnsDB.data.warns ??= {}

export async function getWarns(groupJid, userJid) {
  const key = `${groupJid}::${userJid}`
  return warnsDB.data.warns[key] || 0
}

export async function addWarn(groupJid, userJid) {
  const key = `${groupJid}::${userJid}`
  warnsDB.data.warns[key] = (warnsDB.data.warns[key] || 0) + 1
  await warnsDB.write()
  return warnsDB.data.warns[key]
}

export async function resetWarns(groupJid, userJid) {
  const key = `${groupJid}::${userJid}`
  delete warnsDB.data.warns[key]
  await warnsDB.write()
}

export async function getAllWarns(groupJid) {
  const prefix = `${groupJid}::`
  return Object.entries(warnsDB.data.warns)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => ({ jid: k.slice(prefix.length), count: v }))
}

// ── Notes DB ───────────────────────────────────
const notesDB = new Low(new JSONFile(path.join(__dirname, '../data/notes.json')), { notes: {} })
await notesDB.read()
notesDB.data.notes ??= {}

export async function getNote(groupJid, name) {
  return notesDB.data.notes[`${groupJid}::${name}`] || null
}

export async function setNote(groupJid, name, content) {
  notesDB.data.notes[`${groupJid}::${name}`] = content
  await notesDB.write()
}

export async function deleteNote(groupJid, name) {
  delete notesDB.data.notes[`${groupJid}::${name}`]
  await notesDB.write()
}

export async function listNotes(groupJid) {
  const prefix = `${groupJid}::`
  return Object.keys(notesDB.data.notes)
    .filter(k => k.startsWith(prefix))
    .map(k => k.slice(prefix.length))
}

// ── Rules DB ───────────────────────────────────
const rulesDB = new Low(new JSONFile(path.join(__dirname, '../data/rules.json')), { rules: {} })
await rulesDB.read()
rulesDB.data.rules ??= {}

export async function getRules(groupJid) {
  return rulesDB.data.rules[groupJid] || null
}

export async function setRules(groupJid, content) {
  rulesDB.data.rules[groupJid] = content
  await rulesDB.write()
}
