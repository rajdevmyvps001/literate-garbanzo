// ═══════════════════════════════════════════════════════
//   📱 APPS — App Store & Launcher Plugin (UPDATED)
//   Now with:
//   ✅ Real storage tracking per phone model
//   ✅ /storage — view phone storage
//   ✅ /app uninstall — free up space
//   ✅ /app install blocked if not enough space
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep }       from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile } from '../../lib/mongodb.js'
import { sendImage }                   from '../../lib/image.js'
import {
  canInstall, getStorageSummary, storageBar, fmtMB, APP_SIZES
} from '../../lib/storage.js'

// ── In-memory open app tracker (jid → appId) ──────────
export const openApps = new Map()

// ── App Registry ────────────────────────────────────────
const APPS = [
  {
    id:        'amongus',
    name:      'Among Us',
    icon:      '🚀',
    sizeMB:    274,
    desc:      'Social deduction game. Find the impostors before its too late.',
    launch:    '/amongus',
    available: true,
  },
  {
    id:        'casino',
    name:      'Casino',
    icon:      '🎰',
    sizeMB:    138,
    desc:      'Slots, Blackjack, Roulette & Poker. All wins hit your AstralPay wallet.',
    launch:    '/casino',
    available: true,
  },
  {
    id:        'genshin',
    name:      'Genshin Impact',
    icon:      '✨',
    sizeMB:    312,
    desc:      'Link your UID. View characters, track resin & do daily check-ins.',
    launch:    '/genshin',
    available: true,
  },
  {
    id:        'astralpay',
    name:      'AstralPay',
    icon:      '💰',
    sizeMB:    22,
    desc:      'Your digital wallet. Send, receive & track every Solar you earn.',
    launch:    '/astralpay',
    available: true,
  },
  {
    id:        'chatbot',
    name:      'Vampire AI',
    icon:      '🧛',
    sizeMB:    35,
    desc:      'Talk to the vampire. AI-powered chatbot with vampire persona.',
    launch:    '/chatbot',
    available: true,
  },
  {
    id:        'converter',
    name:      'Converter',
    icon:      '🔄',
    sizeMB:    19,
    desc:      'Convert media. tomp3, tomp4, toimg, togif, toqr, topdf, tourl.',
    launch:    '/converter',
    available: true,
  },
  {
    id:        'downloader',
    name:      'Downloader',
    icon:      '⬇️',
    sizeMB:    55,
    desc:      'Download from YouTube, TikTok, Instagram, Facebook, Spotify & more.',
    launch:    '/dl',
    available: true,
  },
  {
    id:        'trivia',
    name:      'Trivia',
    icon:      '🧠',
    sizeMB:    48,
    desc:      'Test your knowledge across dozens of categories.',
    launch:    '/trivia',
    available: false,
    comingSoon: true,
  },
]

const COMING_SOON = [
  { icon: '⚔️', name: 'Battle Royale' },
  { icon: '🎯', name: 'Word Wars'     },
  { icon: '🎌', name: 'Anime Quiz'    },
  { icon: '🃏', name: 'Card Clash'    },
  { icon: '🏆', name: 'Tournament'    },
]

// ── Fake download progress frames ──────────────────────
const DL_STEPS = [
  { bar: '▱▱▱▱▱▱▱▱▱▱', pct: '0%',   label: 'initialising...' },
  { bar: '▓▓▱▱▱▱▱▱▱▱', pct: '20%',  label: 'downloading...'  },
  { bar: '▓▓▓▓▱▱▱▱▱▱', pct: '40%',  label: 'downloading...'  },
  { bar: '▓▓▓▓▓▓▱▱▱▱', pct: '60%',  label: 'installing...'   },
  { bar: '▓▓▓▓▓▓▓▓▱▱', pct: '80%',  label: 'installing...'   },
  { bar: '▓▓▓▓▓▓▓▓▓▓', pct: '100%', label: 'finishing up...' },
]

// ── Rank system ─────────────────────────────────────────
function getRank(wins = 0) {
  if (wins >= 100) return { name: 'Legendary', emoji: '👑' }
  if (wins >= 50)  return { name: 'Diamond',   emoji: '💎' }
  if (wins >= 30)  return { name: 'Platinum',  emoji: '🔷' }
  if (wins >= 15)  return { name: 'Gold',       emoji: '🥇' }
  if (wins >= 5)   return { name: 'Silver',     emoji: '🥈' }
  return { name: 'Bronze', emoji: '🥉' }
}

// ── Launch animation ────────────────────────────────────
async function launchAnimation(sock, chat, msg, app) {
  const sent = await sock.sendMessage(chat, {
    text: fmt(`📲 ʟᴀᴜɴᴄʜɪɴɢ ${app.name}`,
      `${app.icon}  ${sc('starting up...')}\n\n▱▱▱▱▱▱▱▱▱▱  0%\n${sc('loading...')}`
    )
  }, { quoted: msg })
  await sleep(800)
  await sock.sendMessage(chat, {
    edit: sent.key,
    text: fmt(`📲 ʟᴀᴜɴᴄʜɪɴɢ ${app.name}`,
      `${app.icon}  ${sc('loading assets...')}\n\n▓▓▓▓▱▱▱▱▱▱  40%\n${sc('almost ready...')}`
    )
  }).catch(() => {})
  await sleep(900)
  await sock.sendMessage(chat, {
    edit: sent.key,
    text: fmt(`📲 ʟᴀᴜɴᴄʜɪɴɢ ${app.name}`,
      `${app.icon}  ${sc('ready!')}\n\n▓▓▓▓▓▓▓▓▓▓  100%\n${sc('opening...')}`
    )
  }).catch(() => {})
  await sleep(600)
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run({ sock, msg, cmd, args, chat, sender, reply }) {

  // ── /storage — view phone storage ─────────────────────
  if (cmd === 'storage') {
    const summary = await getStorageSummary(sender)
    if (!summary) return reply(fmt('💾 sᴛᴏʀᴀɢᴇ', sc('register first — dm the bot /start')))

    const { total, used, free, pct, installed } = summary
    const bar = storageBar(pct)

    const appLines = installed.length
      ? installed.map(id => {
          const a = APPS.find(x => x.id === id)
          return `${a?.icon || '📦'} ${a?.name || id}  —  ${fmtMB(APP_SIZES[id] || 50)}`
        }).join('\n')
      : sc('no apps installed')

    return reply(fmt('💾 sᴛᴏʀᴀɢᴇ',
      `${field(sc('total'),     fmtMB(total))}\n` +
      `${field(sc('used'),      fmtMB(used))}\n` +
      `${field(sc('free'),      fmtMB(free))}\n` +
      `${field(sc('usage'),     bar)}\n\n` +
      `${sc('installed apps:')}\n${appLines}\n\n` +
      sc('uninstall: /app uninstall [name]') + '\n' +
      sc('upgrade phone for more storage: /gadgetstore')
    ))
  }

  // ── /apps — list installed apps ───────────────────────
  if (cmd === 'apps') {
    const profile   = await getPlayerProfile(sender)
    const installed = profile?.installedApps || []

    if (installed.length === 0) {
      return reply(fmt('📱 ᴀᴘᴘs',
        `${sc('no apps installed yet')}\n\n` +
        `${sc('browse the store:')}\n⚘ /store\n`
      ))
    }

    const lines = installed.map(id => {
      const a = APPS.find(x => x.id === id)
      return a ? `${a.icon} ${a.name}  ·  ${a.launch}` : `⚘ ${id}`
    }).join('\n')

    return reply(fmt('📱 ᴀᴘᴘs',
      `${sc('installed:')}\n${lines}\n\n` +
      `${sc('storage: /storage')}\n` +
      `${sc('close any open app: /closeapp')}\n`
    ))
  }

  // ── /store — app store listing ────────────────────────
  if (cmd === 'store') {
    const profile   = await getPlayerProfile(sender)
    const installed = profile?.installedApps || []
    const summary   = await getStorageSummary(sender)
    const freeStr   = summary ? fmtMB(summary.free) : '?'

    const appLines = APPS.map(a => {
      const owned = installed.includes(a.id)
      const tag   = a.comingSoon
        ? '🔒 coming soon'
        : owned
          ? '✅ installed  ·  ' + a.launch
          : `⬇️ /app install ${a.name}  (${fmtMB(a.sizeMB)})`
      return `${a.icon} *${a.name}*\n   ${a.desc}\n   ${tag}`
    }).join('\n\n')

    const soonLines = COMING_SOON.map(c => `${c.icon} ${c.name}`).join('  ·  ')

    return reply(fmt('🏪 ᴀᴘᴘ sᴛᴏʀᴇ',
      `${field(sc('free storage'), freeStr)}\n\n` +
      sc('available now:') + '\n\n' + appLines + '\n\n' +
      `──────────\n${sc('coming soon:')}\n${soonLines}\n──────────\n` +
      sc('install: /app install [name]') + '\n' +
      sc('uninstall: /app uninstall [name]')
    ))
  }

  // ── /app install / uninstall ───────────────────────────
  if (cmd === 'app') {
    const sub       = args[0]?.toLowerCase()
    const nameInput = args.slice(1).join(' ').toLowerCase().trim()

    // ── INSTALL ─────────────────────────────────────────
    if (sub === 'install') {
      if (!nameInput)
        return reply(fmt('📱 ᴀᴘᴘs', sc('specify an app — e.g. /app install Among Us')))

      const app = APPS.find(a =>
        a.name.toLowerCase() === nameInput || a.id === nameInput
      )
      if (!app)
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('app not found'), nameInput)}\n${sc('check /store for available apps')}`
        ))
      if (app.comingSoon)
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('coming soon'), app.name)}\n${sc('this app is not yet available')}`
        ))

      const profile   = await getPlayerProfile(sender)
      if (!profile?.username || profile.step)
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('not registered'), '❌')}\n` +
          sc('dm /start to create your account first')
        ))

      const installed = profile?.installedApps || []
      if (installed.includes(app.id))
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('already installed'), app.icon + ' ' + app.name + ' ✅')}\n` +
          sc('launch it with ' + app.launch)
        ))

      // ✅ STORAGE CHECK
      const check = await canInstall(sender, app.id)
      if (!check.ok) {
        return reply(fmt('📱 ɪɴsᴛᴀʟʟ ꜰᴀɪʟᴇᴅ',
          `${field(sc('app'),      app.icon + ' ' + app.name)}\n` +
          `${field(sc('size'),     fmtMB(app.sizeMB))}\n` +
          `${field(sc('free'),     fmtMB(check.free))}\n` +
          `${field(sc('needed'),   fmtMB(check.needed - check.free) + ' more')}\n\n` +
          `⚘ ${sc('not enough storage!')}\n` +
          sc('uninstall an app: /app uninstall [name]') + '\n' +
          sc('or upgrade your phone: /gadgetstore')
        ))
      }

      // Fake download animation
      const frame = (step) => {
        const { bar, pct, label } = DL_STEPS[step]
        return fmt(`📥 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ${app.name}`,
          `${field(sc('size'), fmtMB(app.sizeMB))}\n\n${bar}  ${pct}\n${sc(label)}`
        )
      }

      const sent = await sock.sendMessage(chat, { text: frame(0) }, { quoted: msg })
      for (let i = 1; i <= 5; i++) {
        await sleep(i === 1 ? 1200 : 1800)
        await sock.sendMessage(chat, { edit: sent.key, text: frame(i) }).catch(() => {})
      }
      await sleep(700)
      await setPlayerProfile(sender, { ...profile, installedApps: [...installed, app.id] })

      // Show updated storage
      const newSummary = await getStorageSummary(sender)
      const usedStr    = newSummary ? fmtMB(newSummary.used) : '?'
      const totalStr   = newSummary ? fmtMB(newSummary.total) : '?'

      await sock.sendMessage(chat, {
        edit: sent.key,
        text: fmt('✅ ɪɴsᴛᴀʟʟᴇᴅ!',
          `${field(app.icon + ' ' + app.name, 'installation complete ✅')}\n\n` +
          `${field(sc('storage used'), usedStr + ' / ' + totalStr)}\n` +
          sc('launch it: ' + app.launch)
        )
      }).catch(() => {})
      return
    }

    // ── UNINSTALL ────────────────────────────────────────
    if (sub === 'uninstall') {
      if (!nameInput)
        return reply(fmt('📱 ᴀᴘᴘs', sc('specify an app — e.g. /app uninstall Casino')))

      const app = APPS.find(a =>
        a.name.toLowerCase() === nameInput || a.id === nameInput
      )
      if (!app)
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('app not found'), nameInput)}\n${sc('check /apps for your installed apps')}`
        ))

      const profile   = await getPlayerProfile(sender)
      const installed = profile?.installedApps || []

      if (!installed.includes(app.id))
        return reply(fmt('📱 ᴀᴘᴘs',
          `${field(sc('not installed'), app.icon + ' ' + app.name)}\n` +
          sc('nothing to uninstall')
        ))

      const newInstalled = installed.filter(id => id !== app.id)
      await setPlayerProfile(sender, { ...profile, installedApps: newInstalled })

      // Close app if it was open
      if (openApps.get(sender) === app.id) openApps.delete(sender)

      const newSummary = await getStorageSummary(sender)
      const freeStr    = newSummary ? fmtMB(newSummary.free) : '?'

      return reply(fmt('🗑️ ᴜɴɪɴsᴛᴀʟʟᴇᴅ',
        `${field(app.icon + ' ' + app.name, '✅ removed')}\n` +
        `${field(sc('freed'),       fmtMB(app.sizeMB))}\n` +
        `${field(sc('free space'), freeStr)}\n\n` +
        sc('reinstall anytime: /app install ' + app.name)
      ))
    }

    // Unknown subcommand
    return reply(fmt('📱 ᴀᴘᴘs',
      sc('usage:\n/app install [name]\n/app uninstall [name]\n\nbrowse apps: /store')
    ))
  }

  // ── /closeapp ──────────────────────────────────────────
  if (cmd === 'closeapp') {
    const current = openApps.get(sender)
    if (!current)
      return reply(fmt('📱 ᴀᴘᴘs', sc('no app is currently open')))
    openApps.delete(sender)
    const app = APPS.find(a => a.id === current)
    return reply(fmt('📱 ᴀᴘᴘs',
      `${field(sc('closed'), (app?.icon || '📱') + ' ' + (app?.name || current))}\n` +
      sc('launch another with /apps or /store')
    ))
  }

  // ── /converter — launch Converter ─────────────────────
  if (cmd === 'converter') {
    const profile = await getPlayerProfile(sender)
    const installed = profile?.installedApps || []
    if (!installed.includes('converter'))
      return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ',
        `${field(sc('not installed'), '❌')}\n` +
        sc('use /app install Converter first')
      ))
    return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ',
      `${sc('available commands:')}\n` +
      `⚘ /tomp3  — video → mp3\n` +
      `⚘ /tomp4  — gif/video → mp4\n` +
      `⚘ /toimg  — sticker/video → image\n` +
      `⚘ /togif  — video → gif\n` +
      `⚘ /tourl  — file → hosted url\n` +
      `⚘ /toqr   — text → qr code\n` +
      `⚘ /topdf  — image → pdf\n`
    ))
  }

  // ── App launchers (amongus, casino, genshin, astralpay, chatbot) ───
  // [These remain the same as original apps.js — just add storage check]
  const launchMap = {
    amongus:   { icon: '🚀', id: 'amongus' },
    au:        { icon: '🚀', id: 'amongus' },
    casino:    { icon: '🎰', id: 'casino'  },
    genshin:   { icon: '✨', id: 'genshin' },
    astralpay: { icon: '💰', id: 'astralpay' },
  }

  if (launchMap[cmd]) {
    const { icon, id } = launchMap[cmd]
    const app          = APPS.find(a => a.id === id)
    const profile      = await getPlayerProfile(sender)

    if (!profile?.username || profile.step)
      return reply(fmt(`${icon} ᴀᴘᴘ`, sc('register first — dm the bot /start')))

    const installed = profile?.installedApps || []
    if (!installed.includes(id))
      return reply(fmt(`${icon} ᴀᴘᴘ`,
        `${field(sc('not installed'), '❌')}\n` +
        sc(`use /app install ${app?.name || id} first`)
      ))

    await launchAnimation(sock, chat, msg, app)
    openApps.set(sender, id)

    let body = `${field(sc('status'), '✅ launched')}`

    if (id === 'amongus') {
      body +=
        `\n\n${sc('── 🎮 group commands ──')}\n` +
        `⚘ /create — open a lobby\n` +
        `⚘ /join [code] — join a lobby\n` +
        `⚘ /roomsettings [code] — configure game\n` +
        `⚘ /gamestart [code] — start the game\n` +
        `⚘ /kill [colour] — eliminate a player\n` +
        `⚘ /faketask — fake a task (impostor)\n` +
        `⚘ /meeting — call emergency meeting\n` +
        `⚘ /vote [number] — cast your vote\n` +
        `⚘ /lobby — view lobby players\n` +
        `⚘ /endgame — force end (admin)\n\n` +
        `${sc('── 📩 dm commands ──')}\n` +
        `⚘ /task — view & complete your tasks\n` +
        `⚘ /kill [colour] — kill via dm (impostor)\n` +
        `⚘ /lobby — full intel (impostor only)\n` +
        `⚘ /profile — your stats & wallet\n` +
        `⚘ /leaderboard — top players`
    }

    body += `\n\n${sc('use /closeapp to exit')}`
    return reply(fmt(`📲 ${app.name}`, body))
  }
}
