// ═══════════════════════════════════════════════════════
//   💰 ASTRALPAY — CENTRAL WALLET ENGINE
//   Single source of truth for all money in the bot.
//   Every app (Casino, Among Us) calls this.
//   Fully MongoDB — no JSON files.
// ═══════════════════════════════════════════════════════
import { getPlayerProfile, setPlayerProfile } from './mongodb.js'
import mongoose from 'mongoose'

// ── Schemas ────────────────────────────────────────────
const txSchema = new mongoose.Schema({
  id:      { type: String, index: true },
  from:    String,
  to:      String,
  amount:  Number,
  type:    { type: String, enum: ['transfer','credit','debit','game_win','game_loss','admin_add','admin_deduct'] },
  note:    { type: String, default: '' },
}, { strict: false, timestamps: true })

const Tx = mongoose.models.AstralTx || mongoose.model('AstralTx', txSchema)

const reqSchema = new mongoose.Schema({
  id:     { type: String, required: true, unique: true, index: true },
  from:   String,
  to:     String,
  amount: Number,
  note:   { type: String, default: '' },
  status: { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
}, { timestamps: true })

const PayReq = mongoose.models.AstralPayReq || mongoose.model('AstralPayReq', reqSchema)

// ── Transaction ID ─────────────────────────────────────
let _seq = 0
function txId() { return `TX${Date.now()}${(++_seq).toString().padStart(4,'0')}` }

// ══════════════════════════════════════════════════════
//  CORE FUNCTIONS
// ══════════════════════════════════════════════════════

export async function getBalance(jid) {
  try {
    const p = await getPlayerProfile(jid)
    return p?.wallet ?? 0
  } catch { return 0 }
}

export async function recordTx(tx) {
  try {
    await Tx.create({ ...tx, id: tx.id || txId() })
  } catch (e) {
    console.error('[astralpay recordTx]', e.message)
  }
}

export async function addFunds(jid, amount, { note = '', from = 'system' } = {}) {
  if (amount <= 0) throw new Error('Amount must be positive')
  const p = await getPlayerProfile(jid)
  if (!p?.username) throw new Error('Player not registered')
  const newBal = (p.wallet || 0) + amount
  await setPlayerProfile(jid, { ...p, wallet: newBal, totalEarned: (p.totalEarned || 0) + amount })
  await recordTx({ from, to: jid, amount, type: 'credit', note })
  return newBal
}

export async function deductFunds(jid, amount, { note = '', to = 'system' } = {}) {
  if (amount <= 0) throw new Error('Amount must be positive')
  const p = await getPlayerProfile(jid)
  if (!p?.username) throw new Error('Player not registered')
  const bal = p.wallet || 0
  if (bal < amount) throw new Error(`Insufficient funds — you have $${bal}, need $${amount}`)
  const newBal = bal - amount
  await setPlayerProfile(jid, { ...p, wallet: newBal })
  await recordTx({ from: jid, to, amount, type: 'debit', note })
  return newBal
}

export async function transfer(fromJid, toJid, amount, note = '') {
  if (amount <= 0) throw new Error('Amount must be positive')
  if (fromJid === toJid) throw new Error('Cannot pay yourself')
  const [fromP, toP] = await Promise.all([getPlayerProfile(fromJid), getPlayerProfile(toJid)])
  if (!fromP?.username) throw new Error('Your account is not registered')
  if (!toP?.username)   throw new Error('Recipient is not registered')
  const fromBal = fromP.wallet || 0
  if (fromBal < amount) throw new Error(`Insufficient funds — you have $${fromBal}`)
  const newFrom = fromBal - amount
  const newTo   = (toP.wallet || 0) + amount
  const id      = txId()
  await Promise.all([
    setPlayerProfile(fromJid, { ...fromP, wallet: newFrom }),
    setPlayerProfile(toJid,   { ...toP,   wallet: newTo, totalEarned: (toP.totalEarned || 0) + amount }),
  ])
  await recordTx({ id, from: fromJid, to: toJid, amount, type: 'transfer', note })
  return { fromBal: newFrom, toBal: newTo, txId: id }
}

export async function getTxHistory(jid, limit = 10) {
  try {
    return await Tx.find({ $or: [{ from: jid }, { to: jid }] })
      .sort({ createdAt: -1 }).limit(limit).lean()
  } catch { return [] }
}

// ══════════════════════════════════════════════════════
//  PAY REQUESTS
// ══════════════════════════════════════════════════════

export async function createPayRequest(fromJid, toJid, amount, note = '') {
  const id = `REQ${Date.now()}`
  await PayReq.create({ id, from: fromJid, to: toJid, amount, note, status: 'pending' })
  return id
}

export async function getPendingRequests(jid) {
  return PayReq.find({ to: jid, status: 'pending' }).lean()
}

export async function resolveRequest(toJid, reqId, accept = false) {
  const req = await PayReq.findOneAndUpdate(
    { id: reqId, to: toJid },
    { $set: { status: accept ? 'accepted' : 'declined' } },
    { new: true }
  ).lean()
  return req || null
}

// ══════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════

export function fmtAmt(n) { return '$' + Number(n).toLocaleString('en-US') }

export function parseAmt(str) {
  if (!str) return NaN
  const n = parseFloat(String(str).replace(/[$,]/g, ''))
  return isNaN(n) ? NaN : Math.floor(n)
}

export function fmtTxLine(tx, viewerJid) {
  const d    = new Date(tx.createdAt || tx.ts)
  const time = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
               d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const isIn = tx.to === viewerJid
  const who  = isIn
    ? (tx.from === 'system' ? 'System' : tx.from.split('@')[0])
    : (tx.to   === 'system' ? 'System' : tx.to.split('@')[0])
  const arrow = isIn ? '⬇️ +' : '⬆️ -'
  const label = isIn ? `from ${who}` : `to ${who}`
  return `${arrow}${fmtAmt(tx.amount)}  ${label}  ·  ${tx.note || tx.type}  ·  ${time}`
}
