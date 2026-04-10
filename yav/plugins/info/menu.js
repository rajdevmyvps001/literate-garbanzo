// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — MENU PLUGIN
// ═══════════════════════════════════════════════════════
import config from '../../config.js'
import { fmt, field, sc } from '../../lib/utils.js'
import { getPlayerProfile, getAllProfiles } from '../../lib/mongodb.js'
import { sendImage, sendGif, sendProfileImage } from '../../lib/image.js'

const time = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

// ── Rank util ──────────────────────────────────────────
function getRank(wins = 0) {
  if (wins >= 100) return { name: 'Legendary', emoji: '👑' }
  if (wins >= 50)  return { name: 'Diamond',   emoji: '💎' }
  if (wins >= 30)  return { name: 'Platinum',  emoji: '🔷' }
  if (wins >= 15)  return { name: 'Gold',      emoji: '🥇' }
  if (wins >= 5)   return { name: 'Silver',    emoji: '🥈' }
  return { name: 'Bronze', emoji: '🥉' }
}

// ── Static menu text ───────────────────────────────────
const MAIN = () =>
  `•.¸♡ 𝗩𝗮𝗺𝗽𝗶𝗿𝗲 𝗗𝗶𝗮𝗿𝗶𝗲𝘀 ♡¸.•\n        ᴍɪɴɪᴍᴀʟ • ᴡᴏʀʟᴅ\n          ✷──────✷\n     ⚘\n⏱ ${time()} ➳\n「𝑃𝑟𝑜𝑓𝑖𝑙𝑒」\n「𝐴𝑝𝑝𝑠」\n「𝑀𝑎𝑛𝑎𝑔𝑒」\n「𝐷𝑜𝑤𝑛𝑙𝑜𝑎𝑑」\n「𝑇𝑜𝑜𝑙𝑠」\n「𝑆𝑒𝑡𝑡𝑖𝑛𝑔𝑠」\n「𝑆𝑡𝑜𝑟𝑒」\n──────────✷\n➔ ᴀᴜᴅᴇɴᴛᴇs ꜰᴏʀᴛᴜɴᴀ ɪᴜᴠᴀᴛ`

const MANAGE = () =>
  `「𝑀𝑎𝑛𝑎𝑔𝑒」\n──────➳\n๏ ๏\n─ 𝘸𝘦𝘭𝘤𝘰𝘮𝘦\n─ 𝘢𝘯𝘵𝘪𝘭𝘪𝘯𝘬\n─ 𝘢𝘯𝘵𝘪𝘴𝘱𝘢𝘮\n─ 𝘢𝘯𝘵𝘪𝘧𝘭𝘰𝘰𝘥\n─ 𝘢𝘯𝘵𝘪𝘣𝘰𝘵\n─ 𝘸𝘢𝘳𝘯\n─ 𝘬𝘪𝘤𝘬\n─ 𝘱𝘳𝘰𝘮𝘰𝘵𝘦\n─ 𝘥𝘦𝘮𝘰𝘵𝘦\n─ 𝘮𝘶𝘵𝘦\n─ 𝘵𝘢𝘨𝘢𝘭𝘭\n─ 𝘭𝘪𝘴𝘵𝘢𝘥𝘮𝘪𝘯𝘴\n─ 𝘨𝘳𝘰𝘶𝘱𝘪𝘯𝘧𝘰\n─ 𝘨𝘳𝘰𝘶𝘱𝘳𝘶𝘭𝘦𝘴\n─ 𝘴𝘦𝘵𝘨𝘳𝘰𝘶𝘱\n─ 𝘣𝘳𝘰𝘢𝘥𝘤𝘢𝘴𝘵\n─ 𝘴𝘤𝘩𝘦𝘥𝘶𝘭𝘦\n─ 𝘯𝘰𝘵𝘦𝘴\n─ 𝘢𝘧𝘬\n⏱ ${time()}\n──────────✷`

const DOWNLOAD = () =>
  `「𝐷𝑜𝑤𝑛𝑙𝑜𝑎𝑑」\n──────➳\n๏ ๏\n─ 𝘺𝘵𝘮𝘱4\n─ 𝘺𝘵𝘮𝘱3\n─ 𝘵𝘪𝘬𝘵𝘰𝘬\n─ 𝘪𝘯𝘴𝘵𝘢𝘨𝘳𝘢𝘮\n─ 𝘧𝘢𝘤𝘦𝘣𝘰𝘰𝘬\n─ 𝘵𝘸𝘪𝘵𝘵𝘦𝘳\n─ 𝘱𝘪𝘯𝘵𝘦𝘳𝘦𝘴𝘵\n─ 𝘴𝘱𝘰𝘵𝘪𝘧𝘺\n─ 𝘮𝘦𝘥𝘪𝘢𝘧𝘪𝘳𝘦\n⏱ ${time()}\n──────────✷`

const TOOLS = () =>
  `「𝑇𝑜𝑜𝑙𝑠」\n──────➳\n๏ ๏\n─ 𝘴𝘵𝘪𝘤𝘬𝘦𝘳\n─ 𝘵𝘰𝘷𝘪𝘥𝘦𝘰\n─ 𝘵𝘰𝘢𝘶𝘥𝘪𝘰\n─ 𝘵𝘰𝘫𝘱𝘦𝘨\n─ 𝘵𝘰𝘨𝘪𝘧\n─ 𝘮𝘢𝘯𝘨𝘢\n─ 𝘯𝘰𝘷𝘦𝘭\n─ 𝘨𝘦𝘵𝘱𝘱\n─ 𝘷𝘪𝘦𝘸𝘰𝘯𝘤𝘦\n⏱ ${time()}\n──────────✷`

const STORE_TEXT = () =>
  `「𝑆𝑡𝑜𝑟𝑒」\n──────➳\n๏ ๏\n─ 𝘣𝘳𝘰𝘸𝘴𝘦 𝘢𝘱𝘱𝘴:  /store\n─ 𝘪𝘯𝘴𝘵𝘢𝘭𝘭:  /app install [name]\n─ 𝘮𝘺 𝘢𝘱𝘱𝘴:  /apps\n⏱ ${time()}\n──────────✷`

// ── Image senders ──────────────────────────────────────
const GADGET_STORE = () => {
  const t = time()
  return [
    "\u300e\uff27\uff41\uff44\uff47\uff45\uff54 \uff33\uff54\uff4f\uff52\uff45\u300f",
    "\u2500\u2500\u2500\u2500\u2500\u2500\u27a3",
    "\u0e4f \u0e4f",
    "\u2500 /gadgetstore [android | iphone | samsung | xiaomi | oneplus | gaming]",
    "\u2500 /phoneinfo [phone_id]  \u2192 view phone + image",
    "\u2500 /buyphon [phone_id]    \u2192 purchase a phone",
    "\u2500 /phone                 \u2192 my phone & battery",
    "\u2500 /charge                \u2192 charge battery (5 min)",
    "",
    "\u29d8 better phone = faster bot response!",
    "\u29d8 upgrade for longer battery & crash resistance",
    "\u23f1 " + t,
    "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2717"
  ].join("\n")
}

// ── Permission-based help menus ────────────────────────
const OWNER_HELP = (prefix) =>
  `「👑 ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅs」\n──────➳\n๏ ๏\n\n` +
  `🔑 *Sudo Mod Management*\n` +
  `─ ${prefix}addmod @user      → add sudo mod\n` +
  `─ ${prefix}removemod @user   → remove sudo mod\n` +
  `─ ${prefix}modlist           → list all sudo mods\n\n` +
  `💰 *Economy*\n` +
  `─ ${prefix}giveallusers [amt] → give all players $X\n\n` +
  `📢 *Broadcast*\n` +
  `─ ${prefix}broadcast [msg]   → send to all groups\n\n` +
  `🔧 *Bot Control*\n` +
  `─ ${prefix}owner             → owner info\n` +
  `──────────✷`

const MOD_HELP = (prefix) =>
  `「🛡️ ᴍᴏᴅ ᴄᴏᴍᴍᴀɴᴅs」\n──────➳\n๏ ๏\n\n` +
  `📢 *Broadcast*\n` +
  `─ ${prefix}broadcast [msg]   → send to all groups\n\n` +
  `🔧 *Group Manage (same as admin)*\n` +
  `─ ${prefix}warn @user        → warn a member\n` +
  `─ ${prefix}unwarn @user      → remove a warn\n` +
  `─ ${prefix}warnlist          → see all warns\n` +
  `─ ${prefix}kick @user        → remove from group\n` +
  `─ ${prefix}mute / unmute     → mute group\n` +
  `─ ${prefix}antilink on/off   → toggle antilink\n` +
  `─ ${prefix}antispam on/off   → toggle antispam\n` +
  `─ ${prefix}antiflood on/off  → toggle antiflood\n` +
  `─ ${prefix}tagall [msg]      → tag everyone\n` +
  `──────────✷`

const ADMIN_HELP = (prefix) =>
  `「⚙️ ᴀᴅᴍɪɴ ᴄᴏᴍᴍᴀɴᴅs」\n──────➳\n๏ ๏\n\n` +
  `👥 *Members*\n` +
  `─ ${prefix}kick @user        → remove from group\n` +
  `─ ${prefix}promote @user     → make admin\n` +
  `─ ${prefix}demote @user      → remove admin\n` +
  `─ ${prefix}warn @user        → warn a member\n` +
  `─ ${prefix}unwarn @user      → remove a warn\n` +
  `─ ${prefix}warnlist          → see all warns\n` +
  `─ ${prefix}tagall [msg]      → tag everyone\n\n` +
  `🔒 *Group Settings*\n` +
  `─ ${prefix}antilink on/off   → toggle antilink\n` +
  `─ ${prefix}antispam on/off   → toggle antispam\n` +
  `─ ${prefix}antiflood on/off  → toggle antiflood\n` +
  `─ ${prefix}antibot on/off    → toggle antibot\n` +
  `─ ${prefix}mute / unmute     → lock/unlock chat\n` +
  `─ ${prefix}open / close      → open/close group\n` +
  `─ ${prefix}setwelcome [msg]  → set welcome message\n` +
  `─ ${prefix}setgoodbye [msg]  → set goodbye message\n` +
  `─ ${prefix}setrules [text]   → set group rules\n` +
  `─ ${prefix}schedule [msg]    → schedule a message\n` +
  `─ ${prefix}delnote [name]    → delete a note\n` +
  `──────────✷`

const MEMBER_HELP = (prefix) =>
  `「🌙 ᴍᴇᴍʙᴇʀ ᴄᴏᴍᴍᴀɴᴅs」\n──────➳\n๏ ๏\n\n` +
  `👤 *Profile*\n` +
  `─ ${prefix}profile           → view your profile\n` +
  `─ ${prefix}setname [name]    → change username\n` +
  `─ ${prefix}setcolor          → change profile colour\n` +
  `─ ${prefix}leaderboard       → top players\n\n` +
  `📱 *Apps & Store*\n` +
  `─ ${prefix}store             → app store\n` +
  `─ ${prefix}apps              → installed apps\n` +
  `─ ${prefix}app install [name]→ install an app\n` +
  `─ ${prefix}gadgetstore       → phone shop\n` +
  `─ ${prefix}phone             → my phone & battery\n` +
  `─ ${prefix}charge            → charge phone\n` +
  `─ ${prefix}buyphon [id]      → buy a phone\n\n` +
  `🎮 *Games (needs casino app)*\n` +
  `─ ${prefix}slots $50         → spin slots\n` +
  `─ ${prefix}blackjack $100    → beat the dealer\n` +
  `─ ${prefix}roulette $50 red  → bet the wheel\n` +
  `─ ${prefix}poker create      → open poker table\n\n` +
  `💰 *AstralPay*\n` +
  `─ ${prefix}balance           → your wallet\n` +
  `─ ${prefix}pay @user $amt    → send money\n` +
  `─ ${prefix}history           → transaction log\n\n` +
  `🔧 *Group Info*\n` +
  `─ ${prefix}groupinfo         → group details\n` +
  `─ ${prefix}grouprules        → see group rules\n` +
  `─ ${prefix}listadmins        → list group admins\n` +
  `─ ${prefix}note [name]       → save a note\n` +
  `─ ${prefix}notes             → view notes\n` +
  `─ ${prefix}afk [reason]      → set AFK status\n\n` +
  `⬇️ *Downloads*\n` +
  `─ ${prefix}ytmp3 [url/name]  → audio download\n` +
  `─ ${prefix}ytmp4 [url]       → video download\n` +
  `─ ${prefix}tiktok [url]      → tiktok download\n` +
  `─ ${prefix}instagram [url]   → ig download\n` +
  `──────────✷`

const sendGifMenu   = (sock, chat, msg, caption) => sendGif(sock, chat, msg, 'vd-intro.mp4', caption)
const sendImageMenu = (sock, chat, msg, imgName, caption) => sendImage(sock, chat, msg, imgName, caption)

// ── Download menu (with list select) ──────────────────
async function sendDownloadMenu(sock, chat, msg) {
  await sendImageMenu(sock, chat, msg, 'menu-download.jpg', DOWNLOAD())
  try {
    await sock.sendMessage(chat, {
      text:       '🎵 ᴍᴜsɪᴄ & ᴠɪᴅᴇᴏ — sᴇʟᴇᴄᴛ ᴀɴ ᴀᴄᴛɪᴏɴ',
      footer:     '🧛 Vampire Diaries',
      buttonText: '▶️ Play Music',
      sections: [
        {
          title: '🎵 Music',
          rows: [
            { title: '▶️ Play / Search Music', rowId: `${config.prefix}ytmp3 `, description: 'Type a song name to search & play' },
            { title: '⬇️ Download MP3',        rowId: `${config.prefix}ytmp3 `, description: 'Paste a YouTube URL for MP3' },
          ],
        },
        {
          title: '🎬 Video',
          rows: [
            { title: '🎬 Download MP4', rowId: `${config.prefix}ytmp4 `, description: 'Paste a YouTube URL for MP4' },
          ],
        },
      ],
      listType: 1,
    }, { quoted: msg })
  } catch { /* list not supported — banner caption already shows commands */ }
}

// ── /profile ───────────────────────────────────────────
async function sendProfile(sock, chat, msg, sender, mentions, reply, isGroup) {
  const targetJid = mentions?.[0] || sender
  const profile   = await getPlayerProfile(targetJid)

  if (!profile?.username || profile.step) {
    return reply(fmt('👤 ᴘʀᴏꜰɪʟᴇ',
      `${field(sc('not registered'), '❌')}\n` +
      sc('dm /start to create an account')
    ))
  }

  const rank = getRank(profile.gamesWon || 0)

  const caption =
    `「👤 ᴘʀᴏꜰɪʟᴇ」\n` +
    `✷──────────────✷\n` +
    `  ${profile.color?.emoji || '⬜'}  ${profile.username}\n` +
    `  ${rank.emoji} ${rank.name}\n` +
    `✷──────────────✷\n\n` +
    `${field(sc('profile colour'), (profile.color?.emoji || '⬜') + ' ' + (profile.color?.name || 'none'))}\n` +
    `${field(sc('wallet'),         '☀️ ' + (profile.wallet || 0) + ' Solars')}\n` +
    `${field(sc('games played'),   profile.gamesPlayed || 0)}\n` +
    `${field(sc('games won'),      profile.gamesWon || 0)}\n` +
    `${field(sc('total earned'),   '☀️ ' + (profile.totalEarned || 0) + ' Solars')}\n\n` +
    sc('change name: /setname  •  change colour: /setcolor')

  const extra = isGroup ? { mentions: [targetJid] } : {}
  await sendProfileImage(sock, chat, msg, profile.color?.name, caption, extra)
}

// ── /leaderboard ───────────────────────────────────────
async function sendLeaderboard(sock, chat, msg, reply) {
  let profiles = []
  try { profiles = await getAllProfiles() } catch {}

  if (!profiles.length)
    return reply(fmt('🏆 ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ', sc('no players registered yet')))

  profiles.sort((a, b) => (b.wallet || 0) - (a.wallet || 0))
  const top    = profiles.slice(0, 10)
  const medals = ['🥇', '🥈', '🥉']
  const lines  = top.map((p, i) => {
    const medal = medals[i] || `${i + 1}.`
    const rank  = getRank(p.gamesWon || 0)
    return `${medal} ${rank.emoji} ${p.username} — ☀️ ${p.wallet || 0}  |  ${p.gamesWon || 0}W / ${p.gamesPlayed || 0}G`
  }).join('\n')

  return reply(fmt('🏆 ᴛᴏᴘ ᴘʟᴀʏᴇʀs',
    lines + '\n\n' + sc('ranked by wallet balance')
  ))
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run({ sock, msg, cmd, chat, sender, reply, mentions, isGroup, isOwner, isMod, isAdmin }) {
  if (cmd === 'manage')      return sendImageMenu(sock, chat, msg, 'menu-manage.jpg',   MANAGE())
  if (cmd === 'download')    return sendDownloadMenu(sock, chat, msg)
  if (cmd === 'tools')       return sendImageMenu(sock, chat, msg, 'menu-tools.jpg',    TOOLS())
  if (cmd === 'store')       return sendImageMenu(sock, chat, msg, 'menu-store.jpg',    STORE_TEXT())
  if (cmd === 'gadgetstore' || cmd === 'phones' || cmd === 'phonestore')
    return sock.sendMessage(chat, { text: GADGET_STORE() }, { quoted: msg })
  if (cmd === 'profile')     return sendProfile(sock, chat, msg, sender, mentions, reply, !!isGroup)
  if (cmd === 'leaderboard') return sendLeaderboard(sock, chat, msg, reply)

  const p = config.prefix

  if (cmd === 'ownerhelp') {
    if (!isOwner) return reply(`⛔ ᴏᴡɴᴇʀ ᴏɴʟʏ.\n──────────✷`)
    return reply(OWNER_HELP(p))
  }

  if (cmd === 'modhelp') {
    if (!isMod && !isOwner) return reply(`⛔ ᴍᴏᴅs ᴏɴʟʏ.\n──────────✷`)
    return reply(MOD_HELP(p))
  }

  if (cmd === 'adminhelp') {
    if (!isAdmin && !isMod && !isOwner) return reply(`⛔ ᴀᴅᴍɪɴs ᴏɴʟʏ.\n──────────✷`)
    return reply(ADMIN_HELP(p))
  }

  if (cmd === 'memberhelp' || cmd === 'cmds' || cmd === 'commands') {
    return reply(MEMBER_HELP(p))
  }

  // /help or /menu → main menu with vd-intro gif
  return sendGifMenu(sock, chat, msg, MAIN())
}
