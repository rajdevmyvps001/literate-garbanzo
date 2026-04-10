// ═══════════════════════════════════════════════════════
//   💰 ASTRALPAY PLUGIN
//   /pay /balance /request /history /accept /decline
// ═══════════════════════════════════════════════════════
import { fmt, field, sc } from '../../lib/utils.js'
import { getPlayerProfile } from '../../lib/mongodb.js'
import {
  getBalance, transfer, addFunds, deductFunds, fmtAmt, parseAmt,
  getTxHistory, fmtTxLine,
  createPayRequest, getPendingRequests, resolveRequest,
} from '../../lib/astralpay.js'

function jnum(jid = '') { return jid.split('@')[0] }

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run(ctx) {
  const { cmd } = ctx
  if (cmd === 'balance' || cmd === 'wallet') return handleBalance(ctx)
  if (cmd === 'pay')                          return handlePay(ctx)
  if (cmd === 'request')                      return handleRequest(ctx)
  if (cmd === 'accept')                       return handleAccept(ctx)
  if (cmd === 'decline')                      return handleDecline(ctx)
  if (cmd === 'history' || cmd === 'txlog')   return handleHistory(ctx)
  if (cmd === 'astralpay')                    return handleMenu(ctx)
  if (cmd === 'givemoney' || cmd === 'addmoney') return handleGiveMoney(ctx)
}

// ══════════════════════════════════════════════════════
//  /astralpay  —  menu
// ══════════════════════════════════════════════════════
async function handleMenu({ reply }) {
  return reply(fmt('💰 ᴀsᴛʀᴀʟᴘᴀʏ',
    `${field(sc('your bank'), 'one wallet. every app.')}\n\n` +
    `⚘ /balance          → your wallet balance\n` +
    `⚘ /pay @user $50    → send money\n` +
    `⚘ /request @user $20→ request money\n` +
    `⚘ /history          → last 10 transactions\n` +
    `⚘ /accept [id]      → accept a pay request\n` +
    `⚘ /decline [id]     → decline a pay request\n\n` +
    sc('used by casino · pokémon · among us · all apps')
  ))
}

// ══════════════════════════════════════════════════════
//  /balance
// ══════════════════════════════════════════════════════
async function handleBalance({ sock, msg, chat, sender, mentions, reply, isGroup }) {
  const target = mentions?.[0] || sender
  const profile = await getPlayerProfile(target)

  if (!profile?.username || profile.step) {
    if (target !== sender)
      return reply(fmt('💰 ᴀsᴛʀᴀʟᴘᴀʏ', field(sc('error'), 'that user is not registered')))
    return reply(fmt('💰 ᴀsᴛʀᴀʟᴘᴀʏ', `${field(sc('error'), 'not registered')}\n${sc('dm /start to register')}`))
  }

  const bal      = await getBalance(target)
  const pending  = getPendingRequests(target)
  const isSelf   = target === sender

  const body = fmt('💰 ᴀsᴛʀᴀʟᴘᴀʏ',
    `${field(sc('account'),  (profile.color?.emoji || '⬜') + ' ' + profile.username)}\n` +
    `${field(sc('balance'),  fmtAmt(bal))}\n` +
    `${field(sc('earned'),   fmtAmt(profile.totalEarned || 0) + ' total')}\n` +
    `${field(sc('games'),    (profile.gamesWon || 0) + 'W / ' + (profile.gamesPlayed || 0) + 'G')}\n` +
    (isSelf && pending.length
      ? `\n⚘ ${sc('you have')} ${pending.length} ${sc('pending request')}${pending.length > 1 ? 's' : ''} → /history`
      : '')
  )

  if (isGroup && target !== sender) {
    return sock.sendMessage(chat, { text: body, mentions: [target] }, { quoted: msg })
  }
  return reply(body)
}

// ══════════════════════════════════════════════════════
//  /pay @user $amount
// ══════════════════════════════════════════════════════
async function handlePay({ sock, msg, chat, sender, mentions, args, reply, isGroup }) {
  // Resolve target: mention or args
  let target = mentions?.[0]
  let amtStr = args.find(a => /^\$?[\d,]+$/.test(a))

  if (!target) {
    // /pay 2347012345678 $50
    const numArg = args.find(a => /^\d{7,15}$/.test(a))
    if (numArg) target = `${numArg}@s.whatsapp.net`
  }

  if (!target) return reply(fmt('💰 ᴘᴀʏ', `${field(sc('usage'), '/pay @user $50')}\n${sc('example: /pay @John $100')}`))
  if (!amtStr) return reply(fmt('💰 ᴘᴀʏ', field(sc('usage'), '/pay @user $50')))

  const amount = parseAmt(amtStr)
  if (isNaN(amount) || amount <= 0) return reply(fmt('💰 ᴘᴀʏ', field(sc('error'), 'invalid amount')))
  if (amount < 1)                   return reply(fmt('💰 ᴘᴀʏ', field(sc('error'), 'minimum payment is $1')))
  if (amount > 1_000_000)           return reply(fmt('💰 ᴘᴀʏ', field(sc('error'), 'maximum single payment is $1,000,000')))

  const senderProfile = await getPlayerProfile(sender)
  if (!senderProfile?.username || senderProfile.step)
    return reply(fmt('💰 ᴘᴀʏ', `${field(sc('error'), 'you are not registered')}\n${sc('dm /start to register')}`))

  const note = args.filter(a => a !== amtStr && !a.startsWith('@') && !mentions?.includes(a + '@s.whatsapp.net')).join(' ') || 'payment'

  try {
    const { fromBal, toBal, txId } = await transfer(sender, target, amount, note)
    const toProfile = await getPlayerProfile(target)

    const body = fmt('💰 ᴘᴀʏᴍᴇɴᴛ sᴇɴᴛ',
      `${field(sc('from'),   senderProfile.color?.emoji + ' ' + senderProfile.username)}\n` +
      `${field(sc('to'),     (toProfile?.color?.emoji || '⬜') + ' @' + jnum(target))}\n` +
      `${field(sc('amount'), fmtAmt(amount))}\n` +
      `${field(sc('note'),   note)}\n` +
      `${field(sc('your balance'), fmtAmt(fromBal))}\n` +
      `${field(sc('ref'), txId)}`
    )
    if (isGroup) {
      await sock.sendMessage(chat, { text: body, mentions: [sender, target] }, { quoted: msg })
    } else {
      await reply(body)
    }

    // Notify receiver in DM
    await sock.sendMessage(target, {
      text: fmt('💰 ᴘᴀʏᴍᴇɴᴛ ʀᴇᴄᴇɪᴠᴇᴅ',
        `${field(sc('from'),    senderProfile.color?.emoji + ' ' + senderProfile.username)}\n` +
        `${field(sc('amount'),  fmtAmt(amount))}\n` +
        `${field(sc('note'),    note)}\n` +
        `${field(sc('balance'), fmtAmt(toBal))}\n` +
        `${field(sc('ref'),     txId)}`
      )
    }).catch(() => {})

  } catch (err) {
    return reply(fmt('💰 ᴘᴀʏ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /request @user $amount
// ══════════════════════════════════════════════════════
async function handleRequest({ sock, msg, chat, sender, mentions, args, reply, isGroup }) {
  let target = mentions?.[0]
  const amtStr = args.find(a => /^\$?[\d,]+$/.test(a))

  if (!target) {
    const numArg = args.find(a => /^\d{7,15}$/.test(a))
    if (numArg) target = `${numArg}@s.whatsapp.net`
  }

  if (!target) return reply(fmt('💰 ʀᴇQᴜᴇsᴛ', field(sc('usage'), '/request @user $20')))
  if (!amtStr) return reply(fmt('💰 ʀᴇQᴜᴇsᴛ', field(sc('usage'), '/request @user $20')))

  const amount = parseAmt(amtStr)
  if (isNaN(amount) || amount <= 0) return reply(fmt('💰 ʀᴇQᴜᴇsᴛ', field(sc('error'), 'invalid amount')))

  const senderProfile = await getPlayerProfile(sender)
  if (!senderProfile?.username || senderProfile.step)
    return reply(fmt('💰 ʀᴇQᴜᴇsᴛ', field(sc('error'), 'not registered — dm /start')))

  const note = args.filter(a => a !== amtStr && !a.startsWith('@')).join(' ') || 'payment request'
  const reqId = createPayRequest(sender, target, amount, note)

  const body = fmt('💰 ᴘᴀʏᴍᴇɴᴛ ʀᴇQᴜᴇsᴛ',
    `${field(sc('from'),   senderProfile.color?.emoji + ' ' + senderProfile.username)}\n` +
    `${field(sc('to'),     '@' + jnum(target))}\n` +
    `${field(sc('amount'), fmtAmt(amount))}\n` +
    `${field(sc('note'),   note)}\n\n` +
    sc('type /accept ' + reqId + ' to pay') + '\n' +
    sc('type /decline ' + reqId + ' to reject')
  )

  if (isGroup) {
    await sock.sendMessage(chat, { text: body, mentions: [sender, target] }, { quoted: msg })
  }

  // Always notify target in DM
  await sock.sendMessage(target, { text: body }).catch(() => {})
  if (!isGroup) await reply(fmt('💰 ʀᴇQᴜᴇsᴛ sᴇɴᴛ', `${field(sc('ref'), reqId)}\n${sc('they will be notified in dm')}`))
}

// ══════════════════════════════════════════════════════
//  /accept [reqId]
// ══════════════════════════════════════════════════════
async function handleAccept({ sock, sender, args, reply }) {
  const reqId = args[0]
  if (!reqId) {
    const pending = getPendingRequests(sender)
    if (!pending.length) return reply(fmt('💰 ᴀᴄᴄᴇᴘᴛ', sc('no pending payment requests')))
    const list = pending.map(r =>
      `⚘ ${r.id}\n   from: ${r.from.split('@')[0]} · ${fmtAmt(r.amount)} · ${r.note}`
    ).join('\n\n')
    return reply(fmt('💰 ᴘᴇɴᴅɪɴɢ ʀᴇQᴜᴇsᴛs', list + '\n\n' + sc('type /accept [id] to pay')))
  }

  const req = resolveRequest(sender, reqId, true)
  if (!req) return reply(fmt('💰 ᴀᴄᴄᴇᴘᴛ', field(sc('error'), 'request not found or already resolved')))

  try {
    const { fromBal } = await transfer(sender, req.from, req.amount, req.note)
    const toProfile   = await getPlayerProfile(req.from)
    await reply(fmt('✅ ᴘᴀʏᴍᴇɴᴛ sᴇɴᴛ',
      `${field(sc('paid'),    fmtAmt(req.amount))}\n` +
      `${field(sc('to'),      '@' + req.from.split('@')[0])}\n` +
      `${field(sc('balance'), fmtAmt(fromBal))}`
    ))
    await sock.sendMessage(req.from, {
      text: fmt('💰 ʀᴇQᴜᴇsᴛ ᴀᴄᴄᴇᴘᴛᴇᴅ',
        `${field(sc('from'),   '@' + sender.split('@')[0])}\n` +
        `${field(sc('amount'), fmtAmt(req.amount))}\n` +
        `${field(sc('note'),   req.note)}`
      )
    }).catch(() => {})
  } catch (err) {
    return reply(fmt('💰 ᴀᴄᴄᴇᴘᴛ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /decline [reqId]
// ══════════════════════════════════════════════════════
async function handleDecline({ sock, sender, args, reply }) {
  const reqId = args[0]
  if (!reqId) return reply(fmt('💰 ᴅᴇᴄʟɪɴᴇ', field(sc('usage'), '/decline [request_id]')))
  const req = resolveRequest(sender, reqId, false)
  if (!req) return reply(fmt('💰 ᴅᴇᴄʟɪɴᴇ', field(sc('error'), 'request not found or already resolved')))
  await reply(fmt('❌ ʀᴇQᴜᴇsᴛ ᴅᴇᴄʟɪɴᴇᴅ', `${field(sc('amount'), fmtAmt(req.amount))}\n${field(sc('from'), '@' + req.from.split('@')[0])}`))
  await sock.sendMessage(req.from, {
    text: fmt('❌ ʀᴇQᴜᴇsᴛ ᴅᴇᴄʟɪɴᴇᴅ',
      `${field(sc('by'),     '@' + sender.split('@')[0])}\n` +
      `${field(sc('amount'), fmtAmt(req.amount))}`
    )
  }).catch(() => {})
}

// ══════════════════════════════════════════════════════
//  /history
// ══════════════════════════════════════════════════════
async function handleHistory({ sender, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('💰 ʜɪsᴛᴏʀʏ', field(sc('error'), 'not registered — dm /start')))

  const txs = getTxHistory(sender, 10)
  if (!txs.length)
    return reply(fmt('💰 ʜɪsᴛᴏʀʏ', sc('no transactions yet')))

  const lines = txs.map(t => '⚘ ' + fmtTxLine(t, sender)).join('\n')
  return reply(fmt('💰 ʟᴀsᴛ 10 ᴛʀᴀɴsᴀᴄᴛɪᴏɴs',
    `${field(sc('balance'), fmtAmt(profile.wallet || 0))}\n\n` + lines
  ))
}

// ══════════════════════════════════════════════════════
//  /givemoney @user $amount  (owner only)
//  No balance check — owner can give infinite money
//  Uses AstralPay so it shows in transaction history
// ══════════════════════════════════════════════════════
async function handleGiveMoney({ sock, msg, chat, sender, mentions, args, reply, isOwner, isGroup }) {
  if (!isOwner)
    return reply(fmt('💰 ɢɪᴠᴇᴍᴏɴᴇʏ', field(sc('error'), 'owner only command')))

  // Resolve target — mention or bare number
  let target = mentions?.[0]
  if (!target) {
    const numArg = args.find(a => /^\d{7,15}$/.test(a))
    if (numArg) target = `${numArg}@s.whatsapp.net`
  }
  // If no target specified, give to self
  if (!target) target = sender

  const amtStr = args.find(a => /^\$?[\d,]+$/.test(a))
  if (!amtStr)
    return reply(fmt('💰 ɢɪᴠᴇᴍᴏɴᴇʏ',
      `${field(sc('usage'), '/givemoney [@user] $amount')}\n` +
      sc('omit @user to give yourself')
    ))

  const amount = parseAmt(amtStr)
  if (isNaN(amount) || amount <= 0)
    return reply(fmt('💰 ɢɪᴠᴇᴍᴏɴᴇʏ', field(sc('error'), 'invalid amount')))

  const targetProfile = await getPlayerProfile(target)
  if (!targetProfile?.username)
    return reply(fmt('💰 ɢɪᴠᴇᴍᴏɴᴇʏ', field(sc('error'), 'that player is not registered')))

  // Credit directly — no balance check on sender (owner has infinite)
  const newBal = await addFunds(target, amount, { note: 'owner grant', from: sender })

  const isSelf = target === sender
  const body = fmt('💰 ᴏᴡɴᴇʀ ɢʀᴀɴᴛ',
    `${field(sc('recipient'), (targetProfile.color?.emoji || '⬜') + ' ' + targetProfile.username)}\n` +
    `${field(sc('amount'),    fmtAmt(amount))}\n` +
    `${field(sc('new balance'), fmtAmt(newBal))}\n` +
    `${field(sc('via'), 'AstralPay ✅')}`
  )

  if (isGroup) {
    await sock.sendMessage(chat, { text: body, mentions: [target] }, { quoted: msg })
  } else {
    await reply(body)
  }

  // Notify recipient in DM (unless owner gave to themselves)
  if (!isSelf) {
    await sock.sendMessage(target, {
      text: fmt('💰 ʏᴏᴜ ʀᴇᴄᴇɪᴠᴇᴅ ᴀ ɢʀᴀɴᴛ',
        `${field(sc('amount'),  fmtAmt(amount))}\n` +
        `${field(sc('from'),    'The Architect 👑')}\n` +
        `${field(sc('balance'), fmtAmt(newBal))}\n` +
        `${field(sc('via'),     'AstralPay ✅')}`
      )
    }).catch(() => {})
  }
}
