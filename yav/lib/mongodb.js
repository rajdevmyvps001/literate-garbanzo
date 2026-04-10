// ═══════════════════════════════════════════════════════
//   🍃 MONGODB CORE — Drop-in replacement for lowdb
//   Replaces all JSON file DBs with real MongoDB.
//   Same function signatures as game-db.js so nothing
//   else in your bot needs to change.
// ═══════════════════════════════════════════════════════
import mongoose from 'mongoose'
import config   from '../config.js'

// ── Connection ─────────────────────────────────────────
let connected = false

/** Quick check — true once connectMongo() has succeeded */
export function isMongoConnected() { return connected }

export async function connectMongo() {
  if (connected) return
  const uri = process.env.MONGODB_URI || config.mongoUri
  if (!uri) {
    console.warn('[MongoDB] No MONGODB_URI set — set MONGODB_URI in ecosystem.config.cjs')
    return
  }
  mongoose.set('bufferCommands', false)
  await mongoose.connect(uri, { dbName: 'vampire-diaries', serverSelectionTimeoutMS: 5000, socketTimeoutMS: 10000 })
  connected = true
  console.log('[MongoDB] ✅ Connected to MongoDB')
}

// ══════════════════════════════════════════════════════
//  SCHEMAS
// ══════════════════════════════════════════════════════

// ── Player Profile ─────────────────────────────────────
const profileSchema = new mongoose.Schema({
  jid:           { type: String, required: true, unique: true, index: true },
  username:      String,
  wallet:        { type: Number, default: 0 },
  color:         { type: Object, default: { name: 'White', emoji: '⬜' } },
  gamesWon:      { type: Number, default: 0 },
  gamesPlayed:   { type: Number, default: 0 },
  step:          mongoose.Schema.Types.Mixed,
  phone:         { type: Object, default: null },
  installedApps: { type: [String], default: [] },
  chatbotOn:     { type: Boolean, default: false },
  chatbotPersona:{ type: String, default: 'vampire' },
}, { strict: false, timestamps: true })

const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema)

// ── Rooms ──────────────────────────────────────────────
const roomSchema = new mongoose.Schema({
  code:   { type: String, required: true, unique: true, index: true },
  data:   { type: Object, default: {} },
}, { timestamps: true })

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema)

// ── Groups ─────────────────────────────────────────────
const groupSchema = new mongoose.Schema({
  jid:         { type: String, required: true, unique: true, index: true },
  antilink:    { type: Boolean, default: false },
  antiflood:   { type: Boolean, default: false },
  antispam:    { type: Boolean, default: false },
  antibot:     { type: Boolean, default: false },
  enabled:        { type: Boolean, default: false },
  welcome:        { type: Boolean, default: false },
  goodbye:        { type: Boolean, default: false },
  customWelcome:  { type: String,  default: '' },
  customGoodbye:  { type: String,  default: '' },
  muted:       { type: Boolean, default: false },
  chatbotOn:   { type: Boolean, default: false },
  rules:       { type: String,  default: '' },
  schedule:    { type: Object,  default: null },
  mutedMembers:{ type: [String],default: [] },
}, { strict: false, timestamps: true })

const Group = mongoose.models.Group || mongoose.model('Group', groupSchema)

// ── Warns ──────────────────────────────────────────────
const warnSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, index: true }, // groupJid::userJid
  count: { type: Number, default: 0 },
}, { timestamps: true })

const Warn = mongoose.models.Warn || mongoose.model('Warn', warnSchema)

// ── Notes ──────────────────────────────────────────────
const noteSchema = new mongoose.Schema({
  key:     { type: String, required: true, unique: true, index: true }, // groupJid::name
  content: String,
}, { timestamps: true })

const Note = mongoose.models.Note || mongoose.model('Note', noteSchema)

// ── Transactions ───────────────────────────────────────
const txSchema = new mongoose.Schema({
  from:    String,
  to:      String,
  amount:  Number,
  type:    { type: String, enum: ['transfer', 'game_win', 'game_loss', 'admin_add', 'admin_deduct', 'credit', 'debit'] },
  note:    String,
}, { timestamps: true })


const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', txSchema)

// ── Pay Requests ───────────────────────────────────────
const payReqSchema = new mongoose.Schema({
  id:      { type: String, required: true, unique: true, index: true },
  from:    String,
  to:      String,
  amount:  Number,
  note:    { type: String, default: '' },
  status:  { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
}, { timestamps: true })

const PayRequest = mongoose.models.PayRequest || mongoose.model('PayRequest', payReqSchema)

// ══════════════════════════════════════════════════════
//  PROFILE FUNCTIONS (replaces game-db.js)
// ══════════════════════════════════════════════════════

export async function getPlayerProfile(jid) {
  const doc = await Profile.findOne({ jid }).lean()
  return doc || null
}

export async function setPlayerProfile(jid, data) {
  await Profile.findOneAndUpdate(
    { jid },
    { $set: { jid, ...data } },
    { upsert: true, new: true }
  )
}

export async function getAllProfiles() {
  return Profile.find({ username: { $exists: true }, step: { $exists: false } }).lean()
}

// Aliases for legacy compat
export const getPlayer = getPlayerProfile
export const setPlayer = setPlayerProfile

// ══════════════════════════════════════════════════════
//  ROOM FUNCTIONS
// ══════════════════════════════════════════════════════

export async function getRoom(code) {
  const doc = await Room.findOne({ code }).lean()
  return doc?.data || null
}

export async function setRoom(code, data) {
  await Room.findOneAndUpdate({ code }, { $set: { code, data } }, { upsert: true })
}

export async function deleteRoom(code) {
  await Room.deleteOne({ code })
}

export async function getRooms() {
  const docs = await Room.find().lean()
  return Object.fromEntries(docs.map(d => [d.code, d.data]))
}

export const setRooms = async (rooms) => {
  for (const [code, data] of Object.entries(rooms)) await setRoom(code, data)
}

// ══════════════════════════════════════════════════════
//  GROUP SETTINGS (replaces group-settings.js)
// ══════════════════════════════════════════════════════

export async function getGroup(jid) {
  const doc = await Group.findOne({ jid }).lean()
  return doc || { jid }
}

export async function setGroup(jid, data) {
  await Group.findOneAndUpdate(
    { jid },
    { $set: { jid, ...data } },
    { upsert: true }
  )
}

// ══════════════════════════════════════════════════════
//  WARN FUNCTIONS
// ══════════════════════════════════════════════════════

export async function getWarns(groupJid, userJid) {
  const doc = await Warn.findOne({ key: `${groupJid}::${userJid}` }).lean()
  return doc?.count || 0
}

export async function addWarn(groupJid, userJid) {
  const key = `${groupJid}::${userJid}`
  const doc = await Warn.findOneAndUpdate(
    { key },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  )
  return doc.count
}

export async function resetWarns(groupJid, userJid) {
  await Warn.deleteOne({ key: `${groupJid}::${userJid}` })
}

export async function getAllWarns(groupJid) {
  const prefix = `${groupJid}::`
  const docs   = await Warn.find({ key: new RegExp(`^${prefix}`) }).lean()
  return docs.map(d => ({ jid: d.key.slice(prefix.length), count: d.count }))
}

// ══════════════════════════════════════════════════════
//  NOTE FUNCTIONS
// ══════════════════════════════════════════════════════

export async function getNote(groupJid, name) {
  const doc = await Note.findOne({ key: `${groupJid}::${name}` }).lean()
  return doc?.content || null
}

export async function setNote(groupJid, name, content) {
  const key = `${groupJid}::${name}`
  await Note.findOneAndUpdate({ key }, { $set: { key, content } }, { upsert: true })
}

export async function deleteNote(groupJid, name) {
  await Note.deleteOne({ key: `${groupJid}::${name}` })
}

export async function listNotes(groupJid) {
  const prefix = `${groupJid}::`
  const docs   = await Note.find({ key: new RegExp(`^${prefix}`) }).lean()
  return docs.map(d => ({ name: d.key.slice(prefix.length), content: d.content }))
}

// ══════════════════════════════════════════════════════
//  TRANSACTION LOG (bonus — astralpay can use this)
// ══════════════════════════════════════════════════════

export async function logTransaction(from, to, amount, type, note = '') {
  await Transaction.create({ from, to, amount, type, note })
}

export async function getTxHistory(jid, limit = 10) {
  return Transaction.find({
    $or: [{ from: jid }, { to: jid }]
  }).sort({ createdAt: -1 }).limit(limit).lean()
}

// ══════════════════════════════════════════════════════
//  GROUP SETTING COMPAT (replaces lib/group-settings.js)
// ══════════════════════════════════════════════════════
export async function getGroupSetting(groupJid) {
  return getGroup(groupJid)
}

export async function setGroupSetting(groupJid, data) {
  return setGroup(groupJid, data)
}

// ══════════════════════════════════════════════════════
//  PAY REQUEST FUNCTIONS
// ══════════════════════════════════════════════════════

export async function createPayRequest(fromJid, toJid, amount, note = '') {
  const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => `REQ${Date.now()}` }))
  const id = `REQ${Date.now()}`
  await PayRequest.create({ id, from: fromJid, to: toJid, amount, note, status: 'pending' })
  return id
}

export async function getPendingRequests(jid) {
  return PayRequest.find({ to: jid, status: 'pending' }).lean()
}

export async function resolveRequest(toJid, reqId, accept = false) {
  const req = await PayRequest.findOneAndUpdate(
    { id: reqId, to: toJid },
    { $set: { status: accept ? 'accepted' : 'declined' } },
    { new: true }
  ).lean()
  return req || null
}

// ── Rules (alias for group notes under key '__rules__') ─
export async function getRules(groupJid) {
  const gs = await getGroup(groupJid)
  return gs?.rules || ''
}
export async function setRules(groupJid, text) {
  const gs = await getGroup(groupJid)
  await setGroup(groupJid, { ...gs, rules: text })
}

// ── Mods list ──────────────────────────────────────────
const ModSchema = new mongoose.Schema({ jid: String }, { collection: 'mods' })
const Mod = mongoose.models.Mod || mongoose.model('Mod', ModSchema)

export async function getMods() {
  const docs = await Mod.find({})
  return docs.map(d => d.jid)
}
export async function addMod(jid) {
  await Mod.updateOne({ jid }, { jid }, { upsert: true })
}
export async function removeMod(jid) {
  await Mod.deleteOne({ jid })
}
export async function isMod(jid) {
  return !!(await Mod.findOne({ jid }))
}
