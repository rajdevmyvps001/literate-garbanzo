// ═══════════════════════════════════════════════════════
//   📱 GADGET STORE — Phone Shop Plugin
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep } from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile } from '../../lib/mongodb.js'
import { sendUrlImage } from '../../lib/image.js'
import {
  PHONE_CATALOG, getPhone, getCategoryPhones,
  batteryBar, defaultPhoneState,
} from '../../lib/phone-middleware.js'

// ── Category display config ───────────────────────────
const CATEGORIES = {
  android:  { label: 'Android',        emoji: '🤖', desc: 'Default. Everyone starts here.'           },
  iphone:   { label: 'Apple iPhone',   emoji: '🍎', desc: '5 models · 1-2s response · Big battery'  },
  samsung:  { label: 'Samsung Galaxy', emoji: '🔵', desc: '5 models · 1s response · Great battery'  },
  xiaomi:   { label: 'Xiaomi',         emoji: '🟠', desc: '5 models · 1s response · Value kings'    },
  oneplus:  { label: 'OnePlus',        emoji: '🔴', desc: '5 models · 1s response · Fast charging'  },
  gaming:   { label: 'ASUS ROG',       emoji: '🎮', desc: '5 models · 0.3-0.7s · Near-uncrashable' },
}

// ── Helpers ───────────────────────────────────────────
function jnum(jid = '') { return jid.split('@')[0] }

function formatPrice(p) {
  return p === 0 ? 'FREE' : `$${p.toLocaleString()}`
}

function phoneCard(ph) {
  const bar = batteryBar(100)
  return (
    `${ph.emoji} *${ph.name}*\n` +
    `⚘ ${field(sc('brand'),   ph.brand)}\n` +
    `⚘ ${field(sc('price'),   formatPrice(ph.price))}\n` +
    `⚘ ${field(sc('speed'),   ph.responseDelaySecs + 's response delay')}\n` +
    `⚘ ${field(sc('battery'), ph.batteryMins + ' mins active life')}\n` +
    `⚘ ${field(sc('crash'),   ph.crashAfterMins + ' mins gaming before crash')}\n` +
    `⚘ ${field(sc('specs'),   ph.specs)}\n` +
    `⚘ ${sc(ph.desc)}\n` +
    `⚘ ID: \`${ph.id}\``
  )
}

async function sendPhoneImage(sock, chat, ph, msg) {
  if (!ph.imageUrl) return
  await sendUrlImage(sock, chat, msg, ph.imageUrl, phoneCard(ph))
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run(ctx) {
  const { sock, msg, cmd, args, chat, sender, reply } = ctx

  if (cmd === 'gadgetstore' || cmd === 'phones' || cmd === 'phonestore')
    return handleStore(ctx)

  if (cmd === 'phoneinfo')
    return handlePhoneInfo(ctx)

  if (cmd === 'phone')
    return handleMyPhone(ctx)

  if (cmd === 'charge')
    return handleCharge(ctx)

  if (cmd === 'buyphon' || cmd === 'buyphon')
    return handleBuyPhone(ctx)
}

// ══════════════════════════════════════════════════════
//  /gadgetstore [category]
// ══════════════════════════════════════════════════════
async function handleStore({ sock, msg, chat, args, reply }) {
  const sub = args[0]?.toLowerCase()

  // ── No args → show categories ─────────────────────
  if (!sub) {
    const catList = Object.entries(CATEGORIES).map(([key, c]) =>
      `${c.emoji} *${c.label}*\n   ${sc(c.desc)}\n   ↳ /gadgetstore ${key}`
    ).join('\n\n')

    return reply(fmt('🏪 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ',
      sc('upgrade your phone for faster bot speed, longer battery & more crash resistance!') + '\n\n' +
      sc('categories:') + '\n\n' + catList + '\n\n' +
      sc('view a phone: /phoneinfo [phone_id]') + '\n' +
      sc('buy a phone:  /buyphon [phone_id]') + '\n' +
      sc('your phone:   /phone')
    ))
  }

  // ── Category listed → show phones in that category ─
  const cat = sub === 'rog' || sub === 'asus' ? 'gaming' : sub
  if (!CATEGORIES[cat])
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ',
      `${field(sc('error'), 'unknown category')}\\n` +
      sc('try: android · iphone · samsung · xiaomi · oneplus · gaming')
    ))

  const phones = getCategoryPhones(cat)
  const c      = CATEGORIES[cat]

  // Send header
  await sock.sendMessage(chat, {
    text: fmt(`${c.emoji} ${c.label}`,
      sc(`${phones.length} phones available:`) + '\n\n' +
      phones.map((ph, i) =>
        `${i + 1}. ${ph.emoji} *${ph.name}*\n` +
        `   💰 ${formatPrice(ph.price)} · ⚡ ${ph.responseDelaySecs}s delay · 🔋 ${ph.batteryMins}m battery\n` +
        `   ID: \`${ph.id}\``
      ).join('\n\n') + '\n\n' +
      sc('details + image: /phoneinfo [id]') + '\n' +
      sc('buy: /buyphon [id]')
    )
  }).catch(() => {})
}

// ══════════════════════════════════════════════════════
//  /phoneinfo [phone_id]
// ══════════════════════════════════════════════════════
async function handlePhoneInfo({ sock, msg, chat, args, reply }) {
  const id = args[0]?.toLowerCase()
  if (!id)
    return reply(fmt('📱 ᴘʜᴏɴᴇɪɴꜰᴏ', sc('usage: /phoneinfo [phone_id]\nexample: /phoneinfo iphone_16_pro_max')))

  const ph = getPhone(id)
  if (ph.id === 'android' && id !== 'android')
    return reply(fmt('📱 ᴘʜᴏɴᴇɪɴꜰᴏ', field(sc('error'), 'phone not found — check the ID in /gadgetstore')))

  await sendPhoneImage(sock, chat, ph, msg)
}

// ══════════════════════════════════════════════════════
//  /buyphon [phone_id]
// ══════════════════════════════════════════════════════
async function handleBuyPhone({ sock, msg, chat, sender, args, reply }) {
  const id = args[0]?.toLowerCase()
  if (!id)
    return reply(fmt('📱 ʙᴜʏ ᴘʜᴏɴᴇ',
      sc('usage: /buyphon [phone_id]') + '\n' +
      sc('example: /buyphon iphone_16_pro_max') + '\n\n' +
      sc('browse: /gadgetstore')
    ))

  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ', sc('register first — dm the bot /start')))

  const ph = getPhone(id)
  if (ph.id === 'android' && id !== 'android')
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ',
      field(sc('error'), 'phone not found') + '\n' +
      sc('browse: /gadgetstore')
    ))

  // Already own this phone
  const currentId = profile.phone?.id || 'android'
  if (currentId === ph.id)
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ',
      `${field(sc('already own this'), ph.emoji + ' ' + ph.name)}\n` +
      sc('check your phone: /phone')
    ))

  // Free phone (android default)
  if (ph.price === 0)
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ', sc('that phone is the default — everyone already has it')))

  // Check funds
  const wallet = profile.wallet || 0
  if (wallet < ph.price)
    return reply(fmt('📱 ɢᴀᴅɢᴇᴛ sᴛᴏʀᴇ',
      `${field(sc('error'), 'insufficient funds')}\n` +
      `${field(sc('price'),  formatPrice(ph.price))}\n` +
      `${field(sc('wallet'), '$' + wallet)}\n` +
      `${field(sc('need'),   '$' + (ph.price - wallet) + ' more')}\n\n` +
      sc('earn money by playing games!')
    ))

  // ── Purchase! ────────────────────────────────────
  const newWallet = wallet - ph.price
  const newPhone  = {
    id:              ph.id,
    battery:         100,     // new phone = full battery
    lastActive:      Date.now(),
    isCharging:      false,
    chargeStartedAt: null,
    gamingStartedAt: profile.phone?.gamingStartedAt || null, // keep gaming session
    crashed:         false,
    crashedAt:       null,
  }

  await setPlayerProfile(sender, {
    ...profile,
    wallet:  newWallet,
    phone:   newPhone,
  })

  // Send image of purchased phone
  const purchaseCaption = fmt('✅ ᴘʜᴏɴᴇ ᴘᴜʀᴄʜᴀsᴇᴅ!',
    `${field(sc('phone'),     ph.emoji + ' ' + ph.name)}\n` +
    `${field(sc('spent'),     '-$' + ph.price)}\n` +
    `${field(sc('wallet'),    '$' + newWallet)}\n` +
    `${field(sc('battery'),   '100% 🔋 (fresh!)')}\n` +
    `${field(sc('speed'),     ph.responseDelaySecs + 's response')}\n` +
    `${field(sc('crash at'),  ph.crashAfterMins + ' mins gaming')}\n\n` +
    sc('your new phone is active!') + '\n' +
    sc('check it: /phone')
  )
  if (ph.imageUrl) {
    await sendUrlImage(sock, chat, msg, ph.imageUrl, purchaseCaption)
  } else {
    await reply(purchaseCaption)
  }
}

// ══════════════════════════════════════════════════════
//  /phone — view current phone & battery
// ══════════════════════════════════════════════════════
async function handleMyPhone({ sock, msg, chat, sender, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('📱 ᴍʏ ᴘʜᴏɴᴇ', sc('register first — dm the bot /start')))

  // Init phone if missing
  if (!profile.phone) {
    profile.phone = defaultPhoneState()
    await setPlayerProfile(sender, profile)
  }

  const pd  = profile.phone
  const ph  = getPhone(pd.id)
  const now = Date.now()

  // Calculate current battery accounting for charging completion
  let battery    = pd.battery
  let isCharging = pd.isCharging
  let chargeMins = 0

  if (isCharging && pd.chargeStartedAt) {
    const elapsed = (now - pd.chargeStartedAt) / 1000
    if (elapsed >= 300) {
      battery    = 100
      isCharging = false
    } else {
      chargeMins = Math.round((300 - elapsed) / 60)
      battery    = Math.min(100, battery + (elapsed / 300) * (100 - pd.battery))
    }
  }

  const bar      = batteryBar(battery)
  const crashed  = pd.crashed
  const gaming   = pd.gamingStartedAt
    ? Math.round((now - pd.gamingStartedAt) / 60_000)
    : null

  // Status tag
  let statusLine = ''
  if (crashed)          statusLine = '💥 CRASHED — restarting... (' + Math.max(0, 2 - Math.round((now - pd.crashedAt) / 60_000)) + 'min left)'
  else if (isCharging)  statusLine = `⚡ Charging... (${chargeMins}m until full)`
  else if (battery <= 0) statusLine = '💀 DEAD — /charge to recharge (5 mins)'
  else if (battery < 20) statusLine = '🔴 Critical — charge soon!'
  else if (gaming !== null) statusLine = `🎮 Gaming session: ${gaming}m / ${ph.crashAfterMins}m`
  else statusLine = '✅ Ready'

  const body = fmt(`${ph.emoji} ${ph.name}`,
    `${field(sc('brand'),    ph.brand)}\n` +
    `${field(sc('battery'),  bar)}\n` +
    `${field(sc('status'),   statusLine)}\n` +
    `${field(sc('speed'),    ph.responseDelaySecs + 's response delay')}\n` +
    `${field(sc('crash at'), ph.crashAfterMins + ' mins gaming')}\n` +
    `${field(sc('specs'),    ph.specs)}\n\n` +
    (battery <= 0
      ? sc('phone dead — /charge to fix')
      : isCharging
        ? sc('charging... hang tight')
        : battery < 30
          ? sc('low battery! use /charge to charge (5 mins)')
          : sc('upgrade your phone at /gadgetstore'))
  )

  // Try to send with phone image
  if (ph.imageUrl) return sendUrlImage(sock, chat, msg, ph.imageUrl, body)
  return reply(body)
}

// ══════════════════════════════════════════════════════
//  /charge
// ══════════════════════════════════════════════════════
async function handleCharge({ sender, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('📱 ᴄʜᴀʀɢᴇ', sc('register first — dm the bot /start')))

  if (!profile.phone) {
    profile.phone = defaultPhoneState()
    await setPlayerProfile(sender, profile)
  }

  const pd = profile.phone
  const ph = getPhone(pd.id)

  // Already charging
  if (pd.isCharging) {
    const now     = Date.now()
    const elapsed = (now - pd.chargeStartedAt) / 1000
    if (elapsed >= 300) {
      // Done!
      pd.battery         = 100
      pd.isCharging      = false
      pd.chargeStartedAt = null
      await setPlayerProfile(sender, { ...profile, phone: pd })
      return reply(fmt('🔋 ꜰᴜʟʟʏ ᴄʜᴀʀɢᴇᴅ!',
        `${field(sc('phone'),   ph.emoji + ' ' + ph.name)}\n` +
        `${field(sc('battery'), batteryBar(100))}\n\n` +
        sc('ready to play!')
      ))
    }
    const remaining = Math.ceil((300 - elapsed) / 60)
    return reply(fmt('⚡ ᴀʟʀᴇᴀᴅʏ ᴄʜᴀʀɢɪɴɢ',
      `${field(sc('phone'),       ph.emoji + ' ' + ph.name)}\n` +
      `${field(sc('battery now'), batteryBar(pd.battery))}\n` +
      `${field(sc('done in'),     remaining + ' min' + (remaining === 1 ? '' : 's'))}\n\n` +
      sc('you can still use the bot while charging')
    ))
  }

  // Already full
  if (pd.battery >= 100)
    return reply(fmt('🔋 ᴀʟʀᴇᴀᴅʏ ꜰᴜʟʟ',
      `${field(sc('phone'),   ph.emoji + ' ' + ph.name)}\n` +
      `${field(sc('battery'), batteryBar(pd.battery))}\n\n` +
      sc('no need to charge!')
    ))

  // Start charging
  pd.isCharging      = true
  pd.chargeStartedAt = Date.now()
  await setPlayerProfile(sender, { ...profile, phone: pd })

  return reply(fmt('⚡ ᴄʜᴀʀɢɪɴɢ sᴛᴀʀᴛᴇᴅ',
    `${field(sc('phone'),      ph.emoji + ' ' + ph.name)}\n` +
    `${field(sc('battery'),    batteryBar(pd.battery))}\n` +
    `${field(sc('full in'),    '5 minutes')}\n\n` +
    sc('you can still use the bot while charging!') + '\n' +
    sc('type /phone to check charge progress')
  ))
}

// ══════════════════════════════════════════════════════
//  Crash notification helper (called by handler.js)
// ══════════════════════════════════════════════════════
export async function notifyCrash(sock, sender, chat, phoneName, room) {
  const crashMsg = fmt('💥 ᴘʜᴏɴᴇ ᴄʀᴀsʜᴇᴅ!',
    `${field(sc('phone'),   phoneName)}\n` +
    `${field(sc('reason'),  'extended gaming session')}\n` +
    `${field(sc('status'),  'restarting... (2 min lockout)')}\n\n` +
    sc('you have been disconnected from your current game') + '\n' +
    sc('use /charge if your battery is low') + '\n' +
    sc('upgrade your phone at /gadgetstore for longer sessions')
  )

  // DM the user
  await sock.sendMessage(sender, { text: crashMsg }).catch(() => {})

  // Notify group if in one
  if (chat && chat.endsWith('@g.us')) {
    await sock.sendMessage(chat, {
      text: fmt('💥 ᴘʜᴏɴᴇ ᴄʀᴀsʜ',
        `${field(sc('player'), '@' + sender.split('@')[0])}\n` +
        `${field(sc('phone'),  phoneName)}\n` +
        sc('their phone crashed after a long gaming session — disconnected from game')
      ),
      mentions: [sender],
    }).catch(() => {})
  }
}
