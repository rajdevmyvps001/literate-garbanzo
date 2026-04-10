// ═══════════════════════════════════════════════════════
//   🎰 CASINO — Slots · Blackjack · Roulette · Poker
//   All wins/losses hit AstralPay instantly.
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep } from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile } from '../../lib/mongodb.js'
import { addFunds, deductFunds, fmtAmt, parseAmt } from '../../lib/astralpay.js'

// ── Active game state (in memory) ─────────────────────
const bjGames   = new Map()  // blackjack games   jid → game
const pokerRooms = new Map() // poker tables      chat → room

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run(ctx) {
  const { cmd } = ctx
  if (cmd === 'casino')     return handleMenu(ctx)
  if (cmd === 'slots')      return handleSlots(ctx)
  if (cmd === 'blackjack')  return handleBlackjack(ctx)
  if (cmd === 'bj')         return handleBlackjack(ctx)
  if (cmd === 'hit')        return handleBjAction(ctx, 'hit')
  if (cmd === 'stand')      return handleBjAction(ctx, 'stand')
  if (cmd === 'double')     return handleBjAction(ctx, 'double')
  if (cmd === 'roulette')   return handleRoulette(ctx)
  if (cmd === 'poker')      return handlePoker(ctx)
}

// ── Guard: must be registered ──────────────────────────
async function guardProfile(sender, reply) {
  const p = await getPlayerProfile(sender)
  if (!p?.username || p.step) {
    await reply(fmt('🎰 ᴄᴀsɪɴᴏ', field(sc('error'), 'register first — dm /start')))
    return null
  }
  return p
}

// ══════════════════════════════════════════════════════
//  /casino  — menu
// ══════════════════════════════════════════════════════
async function handleMenu({ reply }) {
  return reply(fmt('🎰 ᴄᴀsɪɴᴏ',
    `${field(sc('slots'),     '/slots $50         → spin 3 reels')}\\n` +
    `${field(sc('blackjack'), '/blackjack $100    → beat the dealer')}\\n` +
    `${field(sc('roulette'),  '/roulette $50 red  → bet on red/black/number')}\\n` +
    `${field(sc('poker'),     '/poker join        → texas hold em table')}\\n\\n` +
    sc('all wins go straight to your astralpay wallet')
  ))
}

// ══════════════════════════════════════════════════════
//  🎰 SLOTS
// ══════════════════════════════════════════════════════
const SYMBOLS = [
  { sym: '🍒', weight: 30, name: 'cherry'  },
  { sym: '🍋', weight: 25, name: 'lemon'   },
  { sym: '🍇', weight: 20, name: 'grape'   },
  { sym: '🔔', weight: 12, name: 'bell'    },
  { sym: '⭐', weight: 8,  name: 'star'    },
  { sym: '💎', weight: 4,  name: 'diamond' },
  { sym: '7️⃣', weight: 1,  name: 'seven'   },
]
const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0)

function spinReel() {
  let r = Math.random() * TOTAL_WEIGHT
  for (const s of SYMBOLS) { r -= s.weight; if (r <= 0) return s }
  return SYMBOLS[0]
}

function calcSlotsWin(reels, bet) {
  const [a, b, c] = reels
  if (a.name === b.name && b.name === c.name) {
    const mults = { cherry: 2, lemon: 3, grape: 4, bell: 6, star: 10, diamond: 20, seven: 50 }
    const mult  = mults[a.name] || 2
    return { win: bet * mult, label: `3x ${a.sym} — ${mult}x jackpot!` }
  }
  if (a.name === b.name || b.name === c.name || a.name === c.name) {
    return { win: Math.floor(bet * 1.5), label: 'pair match — 1.5x' }
  }
  return { win: 0, label: 'no match' }
}

async function handleSlots({ sender, args, reply }) {
  const p = await guardProfile(sender, reply); if (!p) return

  const amtStr = args[0]
  const bet    = parseAmt(amtStr)
  if (!amtStr || isNaN(bet) || bet <= 0)
    return reply(fmt('🎰 sʟᴏᴛs', field(sc('usage'), '/slots $50')))
  if (bet < 10)   return reply(fmt('🎰 sʟᴏᴛs', field(sc('error'), 'minimum bet is $10')))
  if (bet > 50_000) return reply(fmt('🎰 sʟᴏᴛs', field(sc('error'), 'maximum bet is $50,000')))

  try { await deductFunds(sender, bet, { note: 'slots bet', to: 'casino' }) }
  catch (e) { return reply(fmt('🎰 sʟᴏᴛs', field(sc('error'), e.message))) }

  // Spin
  const reels  = [spinReel(), spinReel(), spinReel()]
  const { win, label } = calcSlotsWin(reels, bet)
  const display = reels.map(r => r.sym).join(' │ ')
  const bal     = (p.wallet || 0) - bet + win

  if (win > 0) {
    await addFunds(sender, win, { note: 'slots win', from: 'casino' })
    return reply(fmt('🎰 sʟᴏᴛs — ᴡɪɴ!',
      `┌───────────────┐\n│  ${display}  │\n└───────────────┘\n\n` +
      `${field(sc('result'),  label)}\\n` +
      `${field(sc('bet'),     fmtAmt(bet))}\\n` +
      `${field(sc('won'),     '+' + fmtAmt(win))}\\n` +
      `${field(sc('balance'), fmtAmt(bal + win))}`
    ))
  } else {
    return reply(fmt('🎰 sʟᴏᴛs — ʟᴏsᴛ',
      `┌───────────────┐\n│  ${display}  │\n└───────────────┘\n\n` +
      `${field(sc('result'),  label)}\\n` +
      `${field(sc('bet'),     fmtAmt(bet))}\\n` +
      `${field(sc('lost'),    '-' + fmtAmt(bet))}\\n` +
      `${field(sc('balance'), fmtAmt(p.wallet - bet))}`
    ))
  }
}

// ══════════════════════════════════════════════════════
//  🃏 BLACKJACK
// ══════════════════════════════════════════════════════
const DECK_SUITS = ['♠','♥','♦','♣']
const DECK_VALS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

function buildDeck() {
  const deck = []
  for (const suit of DECK_SUITS)
    for (const val of DECK_VALS)
      deck.push({ suit, val })
  return deck
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cardVal(card) {
  if (['J','Q','K'].includes(card.val)) return 10
  if (card.val === 'A') return 11
  return parseInt(card.val)
}

function handTotal(hand) {
  let total = 0, aces = 0
  for (const c of hand) {
    total += cardVal(c)
    if (c.val === 'A') aces++
  }
  while (total > 21 && aces > 0) { total -= 10; aces-- }
  return total
}

function displayHand(hand, hideSecond = false) {
  if (hideSecond) return `${hand[0].val}${hand[0].suit} · ??`
  return hand.map(c => `${c.val}${c.suit}`).join(' · ')
}

async function handleBlackjack({ sender, args, reply }) {
  const p = await guardProfile(sender, reply); if (!p) return

  if (bjGames.has(sender)) {
    const g = bjGames.get(sender)
    return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ',
      `${sc('you have an active game! use /hit /stand /double')}\\n` +
      `${field(sc('your hand'), displayHand(g.player) + ' (' + handTotal(g.player) + ')')}\\n` +
      `${field(sc('dealer'),    displayHand(g.dealer, true))}`
    ))
  }

  const bet = parseAmt(args[0])
  if (isNaN(bet) || bet <= 0) return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('usage'), '/blackjack $100')))
  if (bet < 10)     return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('error'), 'minimum bet $10')))
  if (bet > 100_000) return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('error'), 'maximum bet $100,000')))

  try { await deductFunds(sender, bet, { note: 'blackjack bet', to: 'casino' }) }
  catch (e) { return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('error'), e.message))) }

  const deck   = shuffle(buildDeck())
  const player = [deck.pop(), deck.pop()]
  const dealer = [deck.pop(), deck.pop()]

  const game = { deck, player, dealer, bet, doubled: false }
  bjGames.set(sender, game)

  const playerTotal = handTotal(player)

  // Natural blackjack check
  if (playerTotal === 21) {
    bjGames.delete(sender)
    const winAmt = Math.floor(bet * 1.5)
    await addFunds(sender, bet + winAmt, { note: 'blackjack natural', from: 'casino' })
    return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ — ɴᴀᴛᴜʀᴀʟ!',
      `${field(sc('your hand'), displayHand(player) + ' (21 🎉)')}\\n` +
      `${field(sc('won'), '+' + fmtAmt(winAmt) + ' (1.5x)')}\\n` +
      `${field(sc('balance'), fmtAmt((p.wallet - bet) + bet + winAmt))}`
    ))
  }

  return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ',
    `${field(sc('your hand'), displayHand(player) + ' (' + playerTotal + ')')}\\n` +
    `${field(sc('dealer'),    displayHand(dealer, true))}\\n` +
    `${field(sc('bet'),       fmtAmt(bet))}\\n\\n` +
    sc('/hit — take a card') + '\\n' +
    sc('/stand — end your turn') + '\\n' +
    sc('/double — double bet & take 1 card')
  ))
}

async function handleBjAction({ sender, cmd, reply }, action) {
  action = action || cmd
  const g = bjGames.get(sender)
  if (!g) return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', sc('no active game — start with /blackjack $amount')))

  const p = await getPlayerProfile(sender)

  if (action === 'hit' || action === 'double') {
    if (action === 'double') {
      const bal = p?.wallet || 0
      if (bal < g.bet) return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('error'), 'not enough to double')))
      try { await deductFunds(sender, g.bet, { note: 'blackjack double', to: 'casino' }) }
      catch (e) { return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ', field(sc('error'), e.message))) }
      g.bet     *= 2
      g.doubled  = true
    }

    g.player.push(g.deck.pop())
    const total = handTotal(g.player)

    if (total > 21) {
      bjGames.delete(sender)
      return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ — ʙᴜsᴛ',
        `${field(sc('your hand'), displayHand(g.player) + ' (' + total + ') BUST!')}\\n` +
        `${field(sc('lost'), '-' + fmtAmt(g.bet))}\\n` +
        `${field(sc('balance'), fmtAmt(p?.wallet || 0))}`
      ))
    }

    if (total === 21 || action === 'double') {
      return handleBjAction({ sender, cmd: 'stand', reply }, 'stand')
    }

    return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ',
      `${field(sc('your hand'), displayHand(g.player) + ' (' + total + ')')}\\n` +
      `${field(sc('dealer'),    displayHand(g.dealer, true))}\\n\\n` +
      sc('/hit  /stand  /double')
    ))
  }

  // STAND — dealer plays
  while (handTotal(g.dealer) < 17) g.dealer.push(g.deck.pop())

  const playerTotal = handTotal(g.player)
  const dealerTotal = handTotal(g.dealer)
  bjGames.delete(sender)

  let result, winAmt = 0
  if (dealerTotal > 21 || playerTotal > dealerTotal) {
    result  = '🏆 you win!'
    winAmt  = g.bet * 2
    await addFunds(sender, winAmt, { note: 'blackjack win', from: 'casino' })
  } else if (playerTotal === dealerTotal) {
    result  = '🤝 push (tie)'
    winAmt  = g.bet
    await addFunds(sender, winAmt, { note: 'blackjack push', from: 'casino' })
  } else {
    result = '💀 dealer wins'
  }

  const freshP = await getPlayerProfile(sender)
  return reply(fmt('🃏 ʙʟᴀᴄᴋᴊᴀᴄᴋ — ' + sc(result),
    `${field(sc('your hand'), displayHand(g.player) + ' (' + playerTotal + ')')}\\n` +
    `${field(sc('dealer'),    displayHand(g.dealer) + ' (' + dealerTotal + ')')}\\n` +
    `${field(sc('bet'),       fmtAmt(g.bet))}\\n` +
    (winAmt > 0
      ? field(sc('payout'), '+' + fmtAmt(winAmt))
      : field(sc('lost'),   '-' + fmtAmt(g.bet))) + '\\n' +
    `${field(sc('balance'), fmtAmt(freshP?.wallet || 0))}`
  ))
}

// ══════════════════════════════════════════════════════
//  🎡 ROULETTE
// ══════════════════════════════════════════════════════
const RED_NUMS  = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
const BLACK_NUMS = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35])

function spinWheel() { return Math.floor(Math.random() * 37) } // 0–36

function rouletteResult(num) {
  if (num === 0) return { color: 'green', parity: null }
  return {
    color:  RED_NUMS.has(num) ? 'red' : 'black',
    parity: num % 2 === 0 ? 'even' : 'odd',
  }
}

async function handleRoulette({ sender, args, reply }) {
  const p = await guardProfile(sender, reply); if (!p) return

  const bet    = parseAmt(args[0])
  const choice = args[1]?.toLowerCase()

  if (isNaN(bet) || bet <= 0 || !choice)
    return reply(fmt('🎡 ʀᴏᴜʟᴇᴛᴛᴇ',
      `${field(sc('usage'), '/roulette $50 [choice]')}\\n\\n` +
      `${sc('choices:')}\\n` +
      `⚘ red / black → 2x\\n` +
      `⚘ odd / even  → 2x\\n` +
      `⚘ 1-36        → 35x\\n` +
      `⚘ 0           → 36x`
    ))
  if (bet < 10)     return reply(fmt('🎡 ʀᴏᴜʟᴇᴛᴛᴇ', field(sc('error'), 'minimum bet $10')))
  if (bet > 200_000) return reply(fmt('🎡 ʀᴏᴜʟᴇᴛᴛᴇ', field(sc('error'), 'maximum bet $200,000')))

  // Validate choice
  const isColorBet  = choice === 'red' || choice === 'black'
  const isParityBet = choice === 'odd' || choice === 'even'
  const numBet      = parseInt(choice)
  const isNumBet    = !isNaN(numBet) && numBet >= 0 && numBet <= 36

  if (!isColorBet && !isParityBet && !isNumBet)
    return reply(fmt('🎡 ʀᴏᴜʟᴇᴛᴛᴇ', field(sc('error'), 'invalid bet — choose red, black, odd, even, or a number 0-36')))

  try { await deductFunds(sender, bet, { note: 'roulette bet', to: 'casino' }) }
  catch (e) { return reply(fmt('🎡 ʀᴏᴜʟᴇᴛᴛᴇ', field(sc('error'), e.message))) }

  const spinNum = spinWheel()
  const { color, parity } = rouletteResult(spinNum)
  const colorEmoji = spinNum === 0 ? '🟢' : color === 'red' ? '🔴' : '⚫'

  let win = 0, multiplier = 0
  if (isColorBet && color === choice)    { multiplier = 2 }
  if (isParityBet && parity === choice)  { multiplier = 2 }
  if (isNumBet && numBet === spinNum)    { multiplier = spinNum === 0 ? 36 : 35 }
  win = multiplier > 0 ? bet * multiplier : 0

  const freshBal = (p.wallet || 0) - bet + win
  if (win > 0) await addFunds(sender, win, { note: `roulette win on ${choice}`, from: 'casino' })

  return reply(fmt(`🎡 ʀᴏᴜʟᴇᴛᴛᴇ — ${colorEmoji} ${spinNum}`,
    `${field(sc('result'),  colorEmoji + ' ' + spinNum + (parity ? ' · ' + color + ' · ' + parity : ' · green'))}\\n` +
    `${field(sc('your bet'), choice)}\\n` +
    `${field(sc('bet'),     fmtAmt(bet))}\\n` +
    (win > 0
      ? `${field(sc('won'),     '+' + fmtAmt(win) + ' (' + multiplier + 'x)')}\\n`
      : `${field(sc('lost'),    '-' + fmtAmt(bet))}\\n`) +
    `${field(sc('balance'), fmtAmt(win > 0 ? freshBal : freshBal))}`
  ))
}

// ══════════════════════════════════════════════════════
//  ♠️ POKER — Texas Hold'em (up to 6 players per table)
// ══════════════════════════════════════════════════════
const POKER_MIN_PLAYERS = 2
const POKER_MAX_PLAYERS = 6
const POKER_MIN_BET     = 50

// Hand rankings
const HAND_RANK = {
  'Royal Flush': 9, 'Straight Flush': 8, 'Four of a Kind': 7,
  'Full House': 6,  'Flush': 5,          'Straight': 4,
  'Three of a Kind': 3, 'Two Pair': 2,   'One Pair': 1, 'High Card': 0
}

function pokerCardVal(c) {
  const map = { A: 14, K: 13, Q: 12, J: 11 }
  return map[c.val] || parseInt(c.val)
}

function evaluateHand(cards) {
  // cards = 7 (2 hole + 5 community), find best 5-card hand
  const vals  = cards.map(c => pokerCardVal(c)).sort((a,b) => b - a)
  const suits = cards.map(c => c.suit)
  const valCounts = {}
  for (const v of vals) valCounts[v] = (valCounts[v] || 0) + 1

  const counts  = Object.values(valCounts).sort((a,b) => b - a)
  const isFlush = suits.some(s => suits.filter(x => x === s).length >= 5)

  // Check straight
  const uniqVals = [...new Set(vals)].sort((a,b) => b - a)
  let isStraight = false, straightHigh = 0
  for (let i = 0; i <= uniqVals.length - 5; i++) {
    if (uniqVals[i] - uniqVals[i+4] === 4) { isStraight = true; straightHigh = uniqVals[i]; break }
  }
  // Ace-low straight
  if (!isStraight && uniqVals.includes(14) && uniqVals.includes(2) && uniqVals.includes(3) && uniqVals.includes(4) && uniqVals.includes(5)) {
    isStraight = true; straightHigh = 5
  }

  if (isFlush && isStraight && straightHigh === 14) return { name: 'Royal Flush',    score: 9_000_000 }
  if (isFlush && isStraight)                         return { name: 'Straight Flush',  score: 8_000_000 + straightHigh }
  if (counts[0] === 4)                               return { name: 'Four of a Kind', score: 7_000_000 + vals[0] }
  if (counts[0] === 3 && counts[1] === 2)            return { name: 'Full House',      score: 6_000_000 + vals[0] }
  if (isFlush)                                       return { name: 'Flush',           score: 5_000_000 + vals[0] }
  if (isStraight)                                    return { name: 'Straight',        score: 4_000_000 + straightHigh }
  if (counts[0] === 3)                               return { name: 'Three of a Kind', score: 3_000_000 + vals[0] }
  if (counts[0] === 2 && counts[1] === 2)            return { name: 'Two Pair',        score: 2_000_000 + vals[0] * 100 + vals[2] }
  if (counts[0] === 2)                               return { name: 'One Pair',        score: 1_000_000 + vals[0] }
  return { name: 'High Card', score: vals[0] }
}

function createPokerRoom(chat, buyIn) {
  return {
    chat, buyIn, pot: 0,
    players: [], // { jid, chips, hole, folded, allIn, bet }
    deck: [], community: [],
    phase: 'waiting', // waiting → preflop → flop → turn → river → showdown
    currentBet: 0, actionIdx: 0, dealerIdx: 0,
    lastAction: null, createdAt: Date.now(),
  }
}

function pokerDeal(room) {
  room.deck = shuffle(buildDeck())
  for (const p of room.players) {
    p.hole   = [room.deck.pop(), room.deck.pop()]
    p.folded = false
    p.bet    = 0
    p.allIn  = false
  }
  room.community = []
  room.phase      = 'preflop'
  room.currentBet = room.buyIn  // big blind = buy-in/10
  room.pot        = 0
}

function displayPokerState(room) {
  const communityStr = room.community.length
    ? room.community.map(c => c.val + c.suit).join(' ')
    : '(no cards yet)'
  const playerLines = room.players.map(p =>
    `⚘ ${p.folded ? '💀' : '✅'} @${p.jid.split('@')[0]} — chips: ${fmtAmt(p.chips)} | bet: ${fmtAmt(p.bet || 0)}`
  ).join('\\n')
  return (
    `${field(sc('phase'),     room.phase)}\\n` +
    `${field(sc('pot'),       fmtAmt(room.pot))}\\n` +
    `${field(sc('board'),     communityStr)}\\n\\n` +
    sc('players:') + '\\n' + playerLines
  )
}

async function handlePoker({ sock, msg, chat, sender, args, reply, isAdmin, isOwner }) {
  const sub = args[0]?.toLowerCase()

  if (!sub || sub === 'help') {
    return reply(fmt('♠️ ᴘᴏᴋᴇʀ',
      `⚘ /poker create $500  → start a table (buy-in: $500)\\n` +
      `⚘ /poker join         → join existing table\\n` +
      `⚘ /poker start        → start the game (host)\\n` +
      `⚘ /poker fold         → fold your hand\\n` +
      `⚘ /poker call         → call current bet\\n` +
      `⚘ /poker raise $200   → raise the bet\\n` +
      `⚘ /poker check        → check (no bet)\\n` +
      `⚘ /poker table        → see table state\\n` +
      `⚘ /poker leave        → leave table\\n\\n` +
      sc('texas hold em · up to 6 players · 1 table per group')
    ))
  }

  if (sub === 'create')  return pokerCreate(sock, msg, chat, sender, args, reply, isAdmin, isOwner)
  if (sub === 'join')    return pokerJoin(sock, msg, chat, sender, reply)
  if (sub === 'start')   return pokerStart(sock, chat, sender, reply)
  if (sub === 'table')   return pokerTable(chat, reply)
  if (sub === 'fold')    return pokerAction(sock, chat, sender, reply, 'fold',  0)
  if (sub === 'call')    return pokerAction(sock, chat, sender, reply, 'call',  0)
  if (sub === 'check')   return pokerAction(sock, chat, sender, reply, 'check', 0)
  if (sub === 'raise')   return pokerAction(sock, chat, sender, reply, 'raise', parseAmt(args[1]))
  if (sub === 'leave')   return pokerLeave(sock, chat, sender, reply)
  return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('unknown subcommand — /poker help')))
}

async function pokerCreate(sock, msg, chat, sender, args, reply, isAdmin, isOwner) {
  if (!isAdmin && !isOwner) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'only admins can create a table')))
  if (pokerRooms.has(chat)) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'a table already exists in this group — /poker table to see it')))

  const buyIn = parseAmt(args[1]) || 500
  if (buyIn < POKER_MIN_BET) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `minimum buy-in is ${fmtAmt(POKER_MIN_BET)}`)))

  const p = await guardProfile(sender, reply); if (!p) return
  if ((p.wallet || 0) < buyIn) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `need ${fmtAmt(buyIn)} to create — you have ${fmtAmt(p.wallet || 0)}`)))

  await deductFunds(sender, buyIn, { note: 'poker buy-in', to: 'casino' })
  const room = createPokerRoom(chat, Math.floor(buyIn / 10))
  room.buyIn  = buyIn
  room.players.push({ jid: sender, chips: buyIn, hole: [], folded: false, bet: 0, allIn: false })
  room.host   = sender
  pokerRooms.set(chat, room)

  await sock.sendMessage(chat, {
    text: fmt('♠️ ᴘᴏᴋᴇʀ ᴛᴀʙʟᴇ ᴏᴘᴇɴᴇᴅ',
      `${field(sc('buy-in'),   fmtAmt(buyIn))}\\n` +
      `${field(sc('players'),  '1 / ' + POKER_MAX_PLAYERS)}\\n` +
      `${field(sc('host'),     '@' + sender.split('@')[0])}\\n\\n` +
      sc('join: /poker join') + '\\n' +
      sc('host starts game: /poker start (min 2 players)')
    ), mentions: [sender]
  }, { quoted: msg })
}

async function pokerJoin(sock, msg, chat, sender, reply) {
  const room = pokerRooms.get(chat)
  if (!room) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'no table in this group — create one with /poker create')))
  if (room.phase !== 'waiting') return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'game already started')))
  if (room.players.find(p => p.jid === sender)) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'already at the table')))
  if (room.players.length >= POKER_MAX_PLAYERS) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'table is full')))

  const p = await guardProfile(sender, reply); if (!p) return
  if ((p.wallet || 0) < room.buyIn) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `need ${fmtAmt(room.buyIn)} to join`)))

  await deductFunds(sender, room.buyIn, { note: 'poker buy-in', to: 'casino' })
  room.players.push({ jid: sender, chips: room.buyIn, hole: [], folded: false, bet: 0, allIn: false })

  await sock.sendMessage(chat, {
    text: fmt('♠️ ᴘʟᴀʏᴇʀ ᴊᴏɪɴᴇᴅ',
      `${field(sc('player'),  '@' + sender.split('@')[0])}\\n` +
      `${field(sc('chips'),   fmtAmt(room.buyIn))}\\n` +
      `${field(sc('players'), room.players.length + ' / ' + POKER_MAX_PLAYERS)}\\n\\n` +
      (room.players.length >= POKER_MIN_PLAYERS
        ? sc('host can now /poker start')
        : sc('waiting for more players...'))
    ), mentions: [sender]
  })
}

async function pokerStart(sock, chat, sender, reply) {
  const room = pokerRooms.get(chat)
  if (!room) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'no table in this group')))
  if (room.host !== sender) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'only the host can start')))
  if (room.phase !== 'waiting') return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'game already started')))
  if (room.players.length < POKER_MIN_PLAYERS) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `need at least ${POKER_MIN_PLAYERS} players`)))

  pokerDeal(room)

  // Blinds
  const sb = room.players[0], bb = room.players[1]
  const smallBlind = Math.floor(room.buyIn / 20)
  const bigBlind   = smallBlind * 2
  sb.chips -= smallBlind; sb.bet = smallBlind; room.pot += smallBlind
  bb.chips -= bigBlind;   bb.bet = bigBlind;   room.pot += bigBlind
  room.currentBet = bigBlind
  room.actionIdx  = 2 % room.players.length

  await sock.sendMessage(chat, {
    text: fmt('♠️ ɢᴀᴍᴇ sᴛᴀʀᴛᴇᴅ!',
      `${field(sc('players'), room.players.length)}\\n` +
      `${field(sc('blinds'),  fmtAmt(smallBlind) + ' / ' + fmtAmt(bigBlind))}\\n` +
      `${field(sc('pot'),     fmtAmt(room.pot))}\\n\\n` +
      sc('check your dms for your hole cards!')
    ),
    mentions: room.players.map(p => p.jid)
  })

  // DM each player their hole cards
  for (const pl of room.players) {
    await sleep(1500 + Math.random() * 500)
    await sock.sendMessage(pl.jid, {
      text: fmt('♠️ ʏᴏᴜʀ ʜᴏʟᴇ ᴄᴀʀᴅs',
        `${field(sc('cards'), pl.hole.map(c => c.val + c.suit).join(' · '))}\\n` +
        `${field(sc('chips'), fmtAmt(pl.chips))}\\n\\n` +
        sc('use /fold /call /check /raise in the group')
      )
    }).catch(() => {})
    await sleep(800)
  }

  const actor = room.players[room.actionIdx]
  await sock.sendMessage(chat, {
    text: fmt('♠️ ᴘʀᴇꜰʟᴏᴘ',
      `${field(sc('pot'),        fmtAmt(room.pot))}\\n` +
      `${field(sc('to call'),    fmtAmt(room.currentBet))}\\n` +
      `${field(sc('action on'),  '@' + actor.jid.split('@')[0])}`
    ),
    mentions: [actor.jid]
  })
}

async function pokerTable(chat, reply) {
  const room = pokerRooms.get(chat)
  if (!room) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('no active table in this group')))
  return reply(fmt('♠️ ᴘᴏᴋᴇʀ ᴛᴀʙʟᴇ', displayPokerState(room)))
}

async function pokerAction(sock, chat, sender, reply, action, raiseAmt) {
  const room = pokerRooms.get(chat)
  if (!room || room.phase === 'waiting') return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'no active game')))

  const plIdx = room.players.findIndex(p => p.jid === sender)
  if (plIdx === -1)  return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'you are not at this table')))
  if (plIdx !== room.actionIdx) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), "not your turn")))

  const pl = room.players[plIdx]
  if (pl.folded) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), 'you already folded')))

  if (action === 'fold') {
    pl.folded = true
    await sock.sendMessage(chat, {
      text: fmt('♠️ ᴘᴏᴋᴇʀ', `⚘ @${sender.split('@')[0]} ${sc('folds')}`),
      mentions: [sender]
    })
  } else if (action === 'call') {
    const toCall = room.currentBet - (pl.bet || 0)
    if (toCall <= 0) {
      action = 'check'
    } else {
      const actualCall = Math.min(toCall, pl.chips)
      pl.chips -= actualCall; pl.bet = (pl.bet || 0) + actualCall; room.pot += actualCall
      await sock.sendMessage(chat, {
        text: fmt('♠️ ᴘᴏᴋᴇʀ', `⚘ @${sender.split('@')[0]} ${sc('calls')} ${fmtAmt(actualCall)}`),
        mentions: [sender]
      })
    }
  } else if (action === 'check') {
    if ((pl.bet || 0) < room.currentBet) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `cannot check — must call ${fmtAmt(room.currentBet - (pl.bet || 0))}`)))
    await sock.sendMessage(chat, {
      text: fmt('♠️ ᴘᴏᴋᴇʀ', `⚘ @${sender.split('@')[0]} ${sc('checks')}`),
      mentions: [sender]
    })
  } else if (action === 'raise') {
    if (isNaN(raiseAmt) || raiseAmt <= room.currentBet) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', field(sc('error'), `raise must be above ${fmtAmt(room.currentBet)}`)))
    const total = Math.min(raiseAmt, pl.chips + (pl.bet || 0))
    const extra = total - (pl.bet || 0)
    pl.chips -= extra; pl.bet = total; room.pot += extra; room.currentBet = total
    await sock.sendMessage(chat, {
      text: fmt('♠️ ᴘᴏᴋᴇʀ', `⚘ @${sender.split('@')[0]} ${sc('raises to')} ${fmtAmt(total)}`),
      mentions: [sender]
    })
  }

  // Advance action
  const activePlayers = room.players.filter(p => !p.folded && !p.allIn)

  // Check if only 1 player left
  const remaining = room.players.filter(p => !p.folded)
  if (remaining.length === 1) {
    return pokerAwardPot(sock, chat, remaining, room, reply)
  }

  // Move to next active player
  let next = (room.actionIdx + 1) % room.players.length
  while (room.players[next].folded || room.players[next].allIn) {
    next = (next + 1) % room.players.length
  }

  // Check if betting round is over (everyone has matched currentBet or folded)
  const bettingDone = room.players.every(p => p.folded || p.allIn || (p.bet || 0) >= room.currentBet)
  if (bettingDone) {
    await advancePhase(sock, chat, room)
    return
  }

  room.actionIdx = next
  const actor = room.players[next]
  await sock.sendMessage(chat, {
    text: fmt('♠️ ᴘᴏᴋᴇʀ',
      `${field(sc('pot'),       fmtAmt(room.pot))}\\n` +
      `${field(sc('to call'),   fmtAmt(Math.max(0, room.currentBet - (actor.bet || 0))))}\\n` +
      `${field(sc('action on'), '@' + actor.jid.split('@')[0])}`
    ),
    mentions: [actor.jid]
  })
}

async function advancePhase(sock, chat, room) {
  // Reset bets for new round
  for (const p of room.players) p.bet = 0
  room.currentBet = 0
  room.actionIdx  = 0
  while (room.players[room.actionIdx].folded) room.actionIdx++

  if (room.phase === 'preflop') {
    room.phase = 'flop'
    room.community.push(room.deck.pop(), room.deck.pop(), room.deck.pop())
  } else if (room.phase === 'flop') {
    room.phase = 'turn'
    room.community.push(room.deck.pop())
  } else if (room.phase === 'turn') {
    room.phase = 'river'
    room.community.push(room.deck.pop())
  } else if (room.phase === 'river') {
    // Showdown
    return pokerShowdown(sock, chat, room)
  }

  const comStr = room.community.map(c => c.val + c.suit).join(' ')
  const actor  = room.players[room.actionIdx]
  await sock.sendMessage(chat, {
    text: fmt('♠️ ' + sc(room.phase.toUpperCase()),
      `${field(sc('board'), comStr)}\\n` +
      `${field(sc('pot'),   fmtAmt(room.pot))}\\n` +
      `${field(sc('action on'), '@' + actor.jid.split('@')[0])}`
    ),
    mentions: [actor.jid]
  })
}

async function pokerShowdown(sock, chat, room) {
  const activePlayers = room.players.filter(p => !p.folded)
  const results = activePlayers.map(p => ({
    ...p,
    handResult: evaluateHand([...p.hole, ...room.community])
  }))
  results.sort((a,b) => b.handResult.score - a.handResult.score)
  const winner = results[0]

  const revealLines = results.map(p =>
    `${p.jid === winner.jid ? '🏆' : '⚘'} @${p.jid.split('@')[0]}: ${p.hole.map(c=>c.val+c.suit).join(' ')} → ${p.handResult.name}`
  ).join('\\n')

  await pokerAwardPot(sock, chat, [winner], room, null, revealLines)
}

async function pokerAwardPot(sock, chat, winners, room, reply, revealLines = '') {
  const share  = Math.floor(room.pot / winners.length)
  for (const w of winners) {
    await addFunds(w.jid, share, { note: 'poker win', from: 'casino' })
  }

  const winnerMentions = winners.map(w => w.jid)
  await sock.sendMessage(chat, {
    text: fmt('♠️ ᴘᴏᴋᴇʀ — sʜᴏᴡᴅᴏᴡɴ',
      (revealLines ? revealLines + '\\n\\n' : '') +
      `${field(sc('winner'),  winners.map(w => '@' + w.jid.split('@')[0]).join(', '))}\\n` +
      `${field(sc('pot'),     fmtAmt(room.pot))}\\n` +
      `${field(sc('each'),    fmtAmt(share))}`
    ),
    mentions: winnerMentions
  })

  // Return remaining chips (outside the pot) to players
  for (const p of room.players) {
    if (p.chips > 0) {
      await addFunds(p.jid, p.chips, { note: 'poker chips return', from: 'casino' }).catch(() => {})
    }
  }

  pokerRooms.delete(chat)
}

async function pokerLeave(sock, chat, sender, reply) {
  const room = pokerRooms.get(chat)
  if (!room) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('no active table')))
  const idx = room.players.findIndex(p => p.jid === sender)
  if (idx === -1) return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('you are not at this table')))

  if (room.phase === 'waiting') {
    await addFunds(sender, room.buyIn, { note: 'poker buy-in refund', from: 'casino' })
    room.players.splice(idx, 1)
    if (room.players.length === 0) {
      pokerRooms.delete(chat)
      return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('table closed — all players left')))
    }
    if (room.host === sender) room.host = room.players[0].jid
    return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('left the table — buy-in refunded')))
  }

  // Mid-game: force fold
  room.players[idx].folded = true
  return reply(fmt('♠️ ᴘᴏᴋᴇʀ', sc('you folded and left the table — chips stay in pot')))
}
