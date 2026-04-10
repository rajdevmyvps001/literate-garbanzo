// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — HANDLER (Baileys)
// ═══════════════════════════════════════════════════════
import { getContentType, downloadMediaMessage, jidNormalizedUser } from 'baileys'
import config from './config.js'
import { connectMongo, getGroup, setGroup } from './lib/mongodb.js'
import { isFlood, isSpam } from './lib/anti-engine.js'
import { resolvePerms, isAllowed, addMod, removeMod, listMods, toNumber, PERM, DENY } from './lib/permissions.js'
import { fmt, field, sc } from './lib/utils.js'

// ── Plugin imports ────────────────────────────────────
import { run as menu }       from './plugins/info/menu.js'
import { run as ping }       from './plugins/info/ping.js'
import { run as owner }      from './plugins/info/owner.js'

import { run as welcome }    from './plugins/manage/welcome.js'
import { run as antilink }   from './plugins/manage/antilink.js'
import { run as antispam }   from './plugins/manage/antispam.js'
import { run as antiflood }  from './plugins/manage/antiflood.js'
import { run as antibot }    from './plugins/manage/antibot.js'
import { run as warn }       from './plugins/manage/warn.js'
import { run as kick }       from './plugins/manage/kick.js'
import { run as promote }    from './plugins/manage/promote.js'
import { run as demote }     from './plugins/manage/demote.js'
import { run as mute }       from './plugins/manage/mute.js'
import { run as tagall }     from './plugins/manage/tagall.js'
import { run as listadmins } from './plugins/manage/listadmins.js'
import { run as groupinfo }  from './plugins/manage/groupinfo.js'
import { run as grouprules } from './plugins/manage/grouprules.js'
import { run as setgroup }   from './plugins/manage/setgroup.js'
import { run as broadcast }  from './plugins/manage/broadcast.js'
import { run as schedule }   from './plugins/manage/schedule.js'
import { run as notes }      from './plugins/manage/notes.js'
import { run as afk }        from './plugins/manage/afk.js'

import { run as dl }         from './plugins/download/universal.js'
import { run as play }       from './plugins/download/play.js'

import { run as sticker }    from './plugins/tools/sticker.js'
import { run as tovideo }    from './plugins/tools/tovideo.js'
import { run as toaudio }    from './plugins/tools/toaudio.js'
import { run as tojpeg }     from './plugins/tools/tojpeg.js'
import { run as togif }      from './plugins/tools/togif.js'
import { run as manga }      from './plugins/tools/manga.js'
import { run as novel }      from './plugins/tools/novel.js'
import { run as getpp }      from './plugins/tools/getpp.js'
import { run as viewonce }   from './plugins/tools/viewonce.js'
import { handleChatbot, run as chatbotCmd } from './plugins/tools/chatbot.js'
import { run as converter } from './plugins/tools/converter.js'

import { run as amongus, handleDMMessage } from './plugins/game/amongus.js'
import { openApps } from './plugins/game/apps.js'
import { run as appsPlugin }                from './plugins/game/apps.js'
import { run as settingsPlugin }            from './plugins/game/settings-cmd.js'
import { run as gamestatus, startMonitor } from './plugins/game/monitor.js'
import { run as gadgetStore, notifyCrash } from './plugins/gadget/phones.js'
import { run as astralPay }            from './plugins/economy/astralpay.js'
import { run as casino }               from './plugins/game/casino.js'
import { run as genshin, initGenshinSock } from './plugins/game/genshin.js'

import {
  phoneMiddleware,
  DEAD_BATTERY_OK,
  APP_COMMANDS,
  batteryBar,
  getPhone,
} from './lib/phone-middleware.js'

// ── Command map ───────────────────────────────────────
const commands = {
  help:       { run: menu, perm: PERM.PUBLIC },
  menu:       { run: menu, perm: PERM.PUBLIC },
  manage:     { run: menu, perm: PERM.PUBLIC },
  dlmenu:     { run: menu, perm: PERM.PUBLIC },
  tools:      { run: menu, perm: PERM.PUBLIC },
  memberhelp: { run: menu, perm: PERM.PUBLIC },
  cmds:       { run: menu, perm: PERM.PUBLIC },
  commands:   { run: menu, perm: PERM.PUBLIC },
  adminhelp:  { run: menu, perm: PERM.PUBLIC },
  modhelp:    { run: menu, perm: PERM.PUBLIC },
  ownerhelp:  { run: menu, perm: PERM.PUBLIC },
  ping: { run: ping,  perm: PERM.PUBLIC },
  owner:{ run: owner, perm: PERM.PUBLIC },

  welcome:    { run: welcome,    perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  goodbye:    { run: welcome,    perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  setwelcome: { run: welcome,    perm: PERM.ADMIN, group: true,  private: false },
  setgoodbye: { run: welcome,    perm: PERM.ADMIN, group: true,  private: false },
  antilink:   { run: antilink,   perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  antispam:   { run: antispam,   perm: PERM.ADMIN, group: true,  private: false },
  antiflood:  { run: antiflood,  perm: PERM.ADMIN, group: true,  private: false },
  antibot:    { run: antibot,    perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  warn:       { run: warn,       perm: PERM.ADMIN, group: true,  private: false },
  unwarn:     { run: warn,       perm: PERM.ADMIN, group: true,  private: false },
  warnlist:   { run: warn,       perm: PERM.ADMIN, group: true,  private: false },
  kick:       { run: kick,       perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  promote:    { run: promote,    perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  demote:     { run: demote,     perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  mute:       { run: mute,       perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  unmute:     { run: mute,       perm: PERM.ADMIN, group: true,  private: false, botAdmin: true },
  tagall:     { run: tagall,     perm: PERM.ADMIN, group: true,  private: false },
  everyone:   { run: tagall,     perm: PERM.ADMIN, group: true,  private: false },
  listadmins: { run: listadmins, perm: PERM.PUBLIC, group: true, private: false },
  groupinfo:  { run: groupinfo,  perm: PERM.PUBLIC, group: true, private: false },
  grouprules: { run: grouprules, perm: PERM.PUBLIC, group: true, private: false },
  setrules:   { run: grouprules, perm: PERM.ADMIN,  group: true, private: false },
  setgroup:   { run: setgroup,   perm: PERM.ADMIN,  group: true, private: false, botAdmin: true },
  open:       { run: setgroup,   perm: PERM.ADMIN,  group: true, private: false, botAdmin: true },
  close:      { run: setgroup,   perm: PERM.ADMIN,  group: true, private: false, botAdmin: true },
  lock:       { run: setgroup,   perm: PERM.ADMIN,  group: true, private: false, botAdmin: true },
  unlock:     { run: setgroup,   perm: PERM.ADMIN,  group: true, private: false, botAdmin: true },
  broadcast:  { run: broadcast,  perm: PERM.MOD,    group: true, private: true  },
  schedule:   { run: schedule,   perm: PERM.ADMIN,  group: true, private: false },
  unschedule: { run: schedule,   perm: PERM.ADMIN,  group: true, private: false },
  note:       { run: notes,      perm: PERM.PUBLIC, group: true, private: true  },
  notes:      { run: notes,      perm: PERM.PUBLIC, group: true, private: true  },
  delnote:    { run: notes,      perm: PERM.ADMIN,  group: true, private: false },
  listnotes:  { run: notes,      perm: PERM.PUBLIC, group: true, private: true  },
  afk:        { run: afk,        perm: PERM.PUBLIC, group: true, private: true  },

  dl:          { run: dl, perm: PERM.PUBLIC },
  download:    { run: dl, perm: PERM.PUBLIC },
  play:        { run: play, perm: PERM.PUBLIC },
  ytmp4:       { run: dl, perm: PERM.PUBLIC },
  ytmp3:       { run: dl, perm: PERM.PUBLIC },
  youtube:     { run: dl, perm: PERM.PUBLIC },
  yt:          { run: dl, perm: PERM.PUBLIC },
  tiktok:      { run: dl, perm: PERM.PUBLIC },
  tt:          { run: dl, perm: PERM.PUBLIC },
  instagram:   { run: dl, perm: PERM.PUBLIC },
  ig:          { run: dl, perm: PERM.PUBLIC },
  facebook:    { run: dl, perm: PERM.PUBLIC },
  fb:          { run: dl, perm: PERM.PUBLIC },
  twitter:     { run: dl, perm: PERM.PUBLIC },
  tw:          { run: dl, perm: PERM.PUBLIC },
  pinterest:   { run: dl, perm: PERM.PUBLIC },
  pin:         { run: dl, perm: PERM.PUBLIC },
  spotify:     { run: dl, perm: PERM.PUBLIC },
  sp:          { run: dl, perm: PERM.PUBLIC },
  soundcloud:  { run: dl, perm: PERM.PUBLIC },
  sc:          { run: dl, perm: PERM.PUBLIC },
  threads:     { run: dl, perm: PERM.PUBLIC },
  th:          { run: dl, perm: PERM.PUBLIC },
  mega:        { run: dl, perm: PERM.PUBLIC },
  mg:          { run: dl, perm: PERM.PUBLIC },
  videy:       { run: dl, perm: PERM.PUBLIC },
  vd:          { run: dl, perm: PERM.PUBLIC },
  mediafire:   { run: dl, perm: PERM.PUBLIC },
  mf:          { run: dl, perm: PERM.PUBLIC },
  sfile:       { run: dl, perm: PERM.PUBLIC },
  sf:          { run: dl, perm: PERM.PUBLIC },

  sticker:   { run: sticker,  perm: PERM.PUBLIC },
  s:         { run: sticker,  perm: PERM.PUBLIC },
  tovideo:   { run: tovideo,  perm: PERM.PUBLIC },
  toaudio:   { run: toaudio,  perm: PERM.PUBLIC },
  tojpeg:    { run: tojpeg,   perm: PERM.PUBLIC },
  toimage:   { run: tojpeg,   perm: PERM.PUBLIC },
  togif:     { run: togif,    perm: PERM.PUBLIC },
  manga:     { run: manga,    perm: PERM.PUBLIC },
  mangaload: { run: manga,    perm: PERM.PUBLIC },
  mangadl:   { run: manga,    perm: PERM.PUBLIC },
  murl:      { run: manga,    perm: PERM.PUBLIC },
  novel:     { run: novel,    perm: PERM.PUBLIC },
  novelload: { run: novel,    perm: PERM.PUBLIC },
  noveldl:   { run: novel,    perm: PERM.PUBLIC },
  nurl:      { run: novel,    perm: PERM.PUBLIC },
  getpp:     { run: getpp,    perm: PERM.PUBLIC },
  pp:        { run: getpp,    perm: PERM.PUBLIC },
  viewonce:  { run: viewonce, perm: PERM.PUBLIC },
  vv:        { run: viewonce, perm: PERM.PUBLIC },

  // ── Among Us ──────────────────────────────────────────
  auon:         { run: amongus,     perm: PERM.ADMIN,  group: true,  private: false },
  auoff:        { run: amongus,     perm: PERM.ADMIN,  group: true,  private: false },
  create:       { run: amongus,     perm: PERM.ADMIN,  group: true,  private: false },
  join:         { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  gamestart:    { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  roomsettings: { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  kill:         { run: amongus,     perm: PERM.PUBLIC },  // works in group AND dm (impostor dm kill)
  task:         { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false }, // group task answers
  faketask:     { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  meeting:      { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  vote:         { run: amongus,     perm: PERM.PUBLIC, group: true,  private: false },
  lobby:        { run: amongus,     perm: PERM.PUBLIC },  // works in group AND dm (impostor intel)
  endgame:      { run: amongus,     perm: PERM.ADMIN,  group: true,  private: false },
  profile:      { run: amongus,     perm: PERM.PUBLIC },
  leaderboard:  { run: menu,        perm: PERM.PUBLIC },
  setname:      { run: amongus,     perm: PERM.PUBLIC },
  setcolor:     { run: amongus,     perm: PERM.PUBLIC },

  // ── Apps & Store ──────────────────────────────────
  apps:         { run: appsPlugin,  perm: PERM.PUBLIC },
  store:        { run: appsPlugin,  perm: PERM.PUBLIC },
  app:          { run: appsPlugin,  perm: PERM.PUBLIC },
  amongus:      { run: appsPlugin,  perm: PERM.PUBLIC },
  au:           { run: appsPlugin,  perm: PERM.PUBLIC },
  closeapp:     { run: appsPlugin,  perm: PERM.PUBLIC },

  // ── Settings ──────────────────────────────────────
  settings:     { run: settingsPlugin, perm: PERM.PUBLIC },
  gamestatus:   { run: gamestatus,  perm: PERM.ADMIN  },

  // ── Economy — AstralPay ───────────────────────────
  astralpay:    { run: astralPay, perm: PERM.PUBLIC },
  balance:      { run: astralPay, perm: PERM.PUBLIC },
  wallet:       { run: astralPay, perm: PERM.PUBLIC },
  pay:          { run: astralPay, perm: PERM.PUBLIC },
  request:      { run: astralPay, perm: PERM.PUBLIC },
  accept:       { run: astralPay, perm: PERM.PUBLIC },
  decline:      { run: astralPay, perm: PERM.PUBLIC },
  history:      { run: astralPay, perm: PERM.PUBLIC },
  txlog:        { run: astralPay, perm: PERM.PUBLIC },

  // ── Casino ─────────────────────────────────────────
  casino:       { run: casino, perm: PERM.PUBLIC },
  slots:        { run: casino, perm: PERM.PUBLIC },
  blackjack:    { run: casino, perm: PERM.PUBLIC },
  bj:           { run: casino, perm: PERM.PUBLIC },
  hit:          { run: casino, perm: PERM.PUBLIC },
  stand:        { run: casino, perm: PERM.PUBLIC },
  double:       { run: casino, perm: PERM.PUBLIC },
  roulette:     { run: casino, perm: PERM.PUBLIC },
  poker:        { run: casino, perm: PERM.PUBLIC },

  // ── Genshin Impact ─────────────────────────────────
  genshin:      { run: genshin, perm: PERM.PUBLIC },

  // ── Gadget Store & Phone ───────────────────────────
  gadgetstore:  { run: gadgetStore, perm: PERM.PUBLIC },
  phones:       { run: gadgetStore, perm: PERM.PUBLIC },
  phonestore:   { run: gadgetStore, perm: PERM.PUBLIC },
  phoneinfo:    { run: gadgetStore, perm: PERM.PUBLIC },
  phone:        { run: gadgetStore, perm: PERM.PUBLIC },
  charge:       { run: gadgetStore, perm: PERM.PUBLIC },
  buyphon:      { run: gadgetStore, perm: PERM.PUBLIC },

  // ── Chatbot ───────────────────────────────────────────
  chatbot:      { run: chatbotCmd, perm: PERM.ADMIN, group: true,  private: false },
  chatbotgc:    { run: chatbotCmd, perm: PERM.ADMIN, group: true,  private: false },

  // ── Converter ─────────────────────────────────────────
  converter:    { run: converter, perm: PERM.PUBLIC },
  tomp3:        { run: converter, perm: PERM.PUBLIC },
  tomp4:        { run: converter, perm: PERM.PUBLIC },
  toimg:        { run: converter, perm: PERM.PUBLIC },
  togif2:       { run: converter, perm: PERM.PUBLIC },
  toqr:         { run: converter, perm: PERM.PUBLIC },
  topdf:        { run: converter, perm: PERM.PUBLIC },
  tourl:        { run: converter, perm: PERM.PUBLIC },

  // ── Storage info ──────────────────────────────────────
  storage:      { run: appsPlugin, perm: PERM.PUBLIC },
}

// ── App gate map — cmd → required open app ────────────
const APP_GATE = {
  slots:     'casino',
  blackjack: 'casino',
  bj:        'casino',
  hit:       'casino',
  stand:     'casino',
  double:    'casino',
  roulette:  'casino',
  poker:     'casino',
  genshin:   'genshin',
  balance:   'astralpay',
  pay:       'astralpay',
  request:   'astralpay',
  accept:    'astralpay',
  decline:   'astralpay',
  history:   'astralpay',
  txlog:     'astralpay',
  wallet:    'astralpay',
}

const APP_NAMES = {
  casino:    '🎰 Casino',
  genshin:   '✨ Genshin Impact',
  astralpay: '💰 AstralPay',
  amongus:   '🚀 Among Us',
}

const REACTIONS = ['🖤', '🧛', '♟️', '♠️', '♣️', '⚫']
const pickReaction = () => REACTIONS[Math.floor(Math.random() * REACTIONS.length)]

// ── Connect MongoDB on load ────────────────────────────
await connectMongo().catch(e => console.error('[MongoDB]', e.message))

// ── Atlas-style JID sanitizer ──────────────────────────
// Strips device suffix (:0, :1 etc) so LID and main JID both match
const sanitizeJid = jid => jid ? jid.replace(/:[0-9]+@/, '@') : ''

export const afkUsers = new Map()
let _genshinSockInited = false

// ── Parse raw baileys message into a clean ctx ────────
function parseMsg(sock, rawMsg, store) {
  const key      = rawMsg.key
  const chat     = key?.remoteJid
  if (!chat) return null
  const fromMe   = key.fromMe
  const isGroup  = chat.endsWith('@g.us')
  const sender   = isGroup
    ? (key.participant || rawMsg.participant || '')
    : (fromMe ? sock.user?.id : chat)

  // normalise sender JID
  const senderJid = (sender || '').replace(/:[0-9]+@/, '@')

  // extract message content — unwrap ephemeral/view-once wrappers first
  let msgContent = rawMsg.message
  if (msgContent?.ephemeralMessage)        msgContent = msgContent.ephemeralMessage.message
  if (msgContent?.viewOnceMessage)         msgContent = msgContent.viewOnceMessage.message
  if (msgContent?.viewOnceMessageV2)       msgContent = msgContent.viewOnceMessageV2.message
  if (msgContent?.documentWithCaptionMessage) msgContent = msgContent.documentWithCaptionMessage.message

  const type = getContentType(msgContent)
  if (!type) return null

  const inner = msgContent[type]

  // get text — cover every known carrier field
  const text =
    msgContent?.conversation ||
    inner?.text ||
    inner?.caption ||
    ''

  // quoted message
  let quoted = null
  const ctx = inner?.contextInfo
  if (ctx?.quotedMessage) {
    const qType    = getContentType(ctx.quotedMessage)
    const qInner   = ctx.quotedMessage[qType] || {}
    const qSender  = (ctx.participant || '').replace(/:[0-9]+@/, '@')
    quoted = {
      sender:   qSender,
      type:     qType,
      mimetype: qInner?.mimetype || '',
      text:     qInner?.text || qInner?.caption || ctx.quotedMessage?.conversation || '',
      download: () => downloadMediaMessage({ key: { ...key, id: ctx.stanzaId }, message: ctx.quotedMessage }, 'buffer', {}),
    }
  }

  // media download helper
  const hasMedia = ['imageMessage','videoMessage','audioMessage','stickerMessage','documentMessage'].includes(type)
  if (hasMedia && inner) {
    inner.download = () => downloadMediaMessage(rawMsg, 'buffer', {})
    inner.mimetype = inner.mimetype || ''
  }

  const mentions = ctx?.mentionedJid || []

  return {
    key,
    chat,
    sender:  senderJid,
    fromMe,
    isGroup,
    text:    text.trim(),
    type,
    message: rawMsg,
    quoted,
    mentions,
    mimetype: inner?.mimetype || '',
    download: hasMedia ? (() => downloadMediaMessage(rawMsg, 'buffer', {})) : null,
  }
}

// ── Main message handler ──────────────────────────────
export async function handleMessage(sock, rawMsg, store) {
  const msg = parseMsg(sock, rawMsg, store)
  if (!msg) {
    console.log('[DEBUG] parseMsg returned null for:', JSON.stringify(rawMsg?.key), '| message keys:', Object.keys(rawMsg?.message || {}))
    return
  }
  if (msg.fromMe) return
  console.log(`[DEBUG] msg received | chat=${msg.chat} | sender=${msg.sender} | text="${msg.text}" | type=${msg.type}`)

  // Wire Genshin resin monitor to active socket (once)
  if (!_genshinSockInited) { _genshinSockInited = true; initGenshinSock(sock) }

  const { chat, sender, text, isGroup, quoted, mentions } = msg

  // fetch group metadata for admin checks
  let isAdmin    = false
  let isBotAdmin = false
  let groupMeta  = null

  if (isGroup) {
    try {
      groupMeta  = await sock.groupMetadata(chat)
      // Atlas-style: filter real admins, sanitize all JIDs to strip device suffix
      const adminRaw = (groupMeta.participants || [])
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id)
      const admins   = adminRaw.map(sanitizeJid)
      const botRaw   = sock.user?.id || ''
      const botId    = sanitizeJid(botRaw)
      const botLid   = sock.user?.lid ? sanitizeJid(sock.user.lid) : ''
      isAdmin    = admins.includes(sender) || admins.includes(sanitizeJid(sender))
      isBotAdmin = admins.includes(botId) || admins.includes(botLid) || adminRaw.includes(botRaw)
    } catch {}
  }

  // resolve owner/mod perms
  const isOwner = toNumber(sender) === toNumber(config.ownerNumber) ||
                  toNumber(sender) === toNumber(config.ownerLid)
  const { isMod } = resolvePerms({ sender: { jid: sender }, from: sender, isAdmin }, config)

  // ── Auto moderation ─────────────────────────────────
  if (isGroup && groupMeta) {
    const gs = await getGroup(chat).catch(() => ({ jid: chat }))

    if (gs.antiflood && !isAdmin && !isMod && isFlood(sender)) {
      await sock.sendMessage(chat, {
        text: `「ᴀɴᴛɪꜰʟᴏᴏᴅ」\n──────➳\n๏ ๏\n⚘ @${sender.split('@')[0]} ʀᴇᴍᴏᴠᴇᴅ ꜰᴏʀ ꜰʟᴏᴏᴅɪɴɢ\n──────────✷`,
        mentions: [sender]
      })
      await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {})
      return
    }

    if (gs.antispam && !isAdmin && !isMod && text && isSpam(sender, text)) {
      await sock.sendMessage(chat, {
        text: `「ᴀɴᴛɪsᴘᴀᴍ」\n──────➳\n๏ ๏\n⚘ @${sender.split('@')[0]} ʀᴇᴍᴏᴠᴇᴅ ꜰᴏʀ sᴘᴀᴍᴍɪɴɢ\n──────────✷`,
        mentions: [sender]
      })
      await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {})
      return
    }

    if (gs.muted && !isAdmin && !isMod) return

    if (Array.isArray(gs.mutedMembers) && gs.mutedMembers.includes(sender) && !isAdmin && !isMod) return

    if (gs.antibot && (rawMsg?.key?.participant || '').includes(':') && !isAdmin && !isMod) {
      await sock.groupParticipantsUpdate(chat, [rawMsg.key.participant], 'remove').catch(() => {})
      return
    }

    if (gs.antilink && !isAdmin && !isMod && text) {
      const linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com)[^\s]*/i
      if (linkRegex.test(text)) {
        await sock.sendMessage(chat, {
          text: `「ᴀɴᴛɪʟɪɴᴋ」\n──────➳\n๏ ๏\n⚘ @${sender.split('@')[0]} ʀᴇᴍᴏᴠᴇᴅ ꜰᴏʀ sᴇɴᴅɪɴɢ ᴀ ʟɪɴᴋ\n──────────✷`,
          mentions: [sender]
        })
        await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {})
        return
      }
    }

    // AFK mention check
    for (const m of mentions) {
      if (afkUsers.has(m)) {
        const { reason, since } = afkUsers.get(m)
        await sock.sendMessage(chat, {
          text: `「ᴀꜰᴋ」\n──────➳\n๏ ๏\n⚘ @${m.split('@')[0]} ɪs ᴀᴡᴀʏ\n⚘ ʀᴇᴀsᴏɴ: ${reason}\n⚘ sɪɴᴄᴇ: ${since}\n──────────✷`,
          mentions: [m]
        })
      }
    }
  }

  // ── AFK return (fires in groups AND private chat) ────
  if (afkUsers.has(sender)) {
    afkUsers.delete(sender)
    await sock.sendMessage(chat, {
      text: `「ᴀꜰᴋ」\n──────➳\n๏ ๏\n⚘ @${sender.split('@')[0]} ɪs ʙᴀᴄᴋ\n──────────✷`,
      mentions: [sender]
    }).catch(() => {})
  }

  // ── Among Us DM: /start and /task ────────────────────
  if (!isGroup && text?.startsWith(config.prefix)) {
    const dmParts = text.slice(config.prefix.length).trim().split(/\s+/)
    const dmCmd   = dmParts[0]?.toLowerCase()
    const dmArgs  = dmParts.slice(1)
    const dmReply = (content) => sock.sendMessage(chat,
      typeof content === 'string' ? { text: content } : content,
      { quoted: rawMsg }
    )
    if (dmCmd === 'start') {
      return amongus({ sock, msg: rawMsg, cmd: 'start', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
    if (dmCmd === 'task') {
      return amongus({ sock, msg: rawMsg, cmd: 'task', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
    if (dmCmd === 'setname') {
      return amongus({ sock, msg: rawMsg, cmd: 'setname', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
    if (dmCmd === 'profile') {
      return amongus({ sock, msg: rawMsg, cmd: 'profile', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
    if (dmCmd === 'kill') {
      return amongus({ sock, msg: rawMsg, cmd: 'kill', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
    if (dmCmd === 'lobby') {
      return amongus({ sock, msg: rawMsg, cmd: 'lobby', args: dmArgs, chat, sender, reply: dmReply, isAdmin: false, isGroup: false, mentions: [], isOwner })
    }
  }

  // ── Among Us DM plain-text (registration + task answers) ──
  if (!isGroup && text && !text.startsWith(config.prefix)) {
    const dmReply = (content) => sock.sendMessage(chat,
      typeof content === 'string' ? { text: content } : content,
      { quoted: rawMsg }
    )
    await handleDMMessage({ sock, chat, sender, text, reply: dmReply })
    // Vampire chatbot handles DM non-command messages too
    await handleChatbot({ sock, msg: rawMsg, chat, sender, text, isGroup: false, reply: dmReply }).catch(() => {})
    return
  }

  // ── Command routing ──────────────────────────────────
  if (!text || !text.startsWith(config.prefix)) {
    // Group non-command messages → chatbot (if enabled for group)
    if (isGroup && text) {
      const gcReply = (content) => sock.sendMessage(chat,
        typeof content === 'string' ? { text: content } : content,
        { quoted: rawMsg }
      )
      await handleChatbot({ sock, msg: rawMsg, chat, sender, text, isGroup: true, reply: gcReply }).catch(() => {})
    }
    return
  }

  // ── Auto react (commands only) ───────────────────────
  try {
    await sock.sendMessage(chat, { react: { text: pickReaction(), key: rawMsg.key } })
  } catch {}

  const parts = text.slice(config.prefix.length).trim().split(/\s+/)
  const cmd   = parts[0].toLowerCase()
  const args  = parts.slice(1)

  const reply = (content) => sock.sendMessage(
    chat,
    typeof content === 'string' ? { text: content } : content,
    { quoted: rawMsg }
  )

  // ── Owner mod management ─────────────────────────────
  if (isOwner) {
    if (cmd === 'addmod') {
      const target = mentions?.[0] || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null)
      if (!target) return reply('⚘ ᴛᴀɢ ᴀ ᴜsᴇʀ ᴏʀ ᴘʀᴏᴠɪᴅᴇ ᴀ ɴᴜᴍʙᴇʀ.\n──────────✷')
      const added = addMod(target)
      return sock.sendMessage(chat, {
        text: added ? `✅ @${target.split('@')[0]} ᴀᴅᴅᴇᴅ ᴀs sᴜᴅᴏ ᴍᴏᴅ 🧛\n──────────✷` : `⚘ ᴀʟʀᴇᴀᴅʏ ᴀ ᴍᴏᴅ.\n──────────✷`,
        mentions: [target]
      }, { quoted: rawMsg })
    }
    if (cmd === 'removemod' || cmd === 'delmod') {
      const target = mentions?.[0] || (args[0] ? `${args[0].replace(/\D/g, '')}@s.whatsapp.net` : null)
      if (!target) return reply('⚘ ᴛᴀɢ ᴀ ᴜsᴇʀ.\n──────────✷')
      const removed = removeMod(target)
      return sock.sendMessage(chat, {
        text: removed ? `✅ @${target.split('@')[0]} ʀᴇᴍᴏᴠᴇᴅ ꜰʀᴏᴍ ᴍᴏᴅs.\n──────────✷` : `⚘ ɴᴏᴛ ɪɴ ᴍᴏᴅ ʟɪsᴛ.\n──────────✷`,
        mentions: [target]
      }, { quoted: rawMsg })
    }
    if (cmd === 'modlist') {
      const mods = listMods()
      if (!mods.length) return reply('⚘ ɴᴏ sᴜᴅᴏ ᴍᴏᴅs sᴇᴛ.\n──────────✷')
      return sock.sendMessage(chat, {
        text: `「sᴜᴅᴏ ᴍᴏᴅs」\n──────➳\n๏ ๏\n${mods.map((m, i) => `⚘ ${i+1}. @${m.split('@')[0]}`).join('\n')}\n──────────✷`,
        mentions: mods
      }, { quoted: rawMsg })
    }
    if (cmd === 'giveallusers') {
      const amount = parseInt(args[0]) || 50
      if (amount <= 0 || amount > 1_000_000)
        return reply('⚘ ᴜsᴀɢᴇ: /giveallusers [amount]\n──────────✷')
      const { recordTx }     = await import('./lib/astralpay.js')
      const { getAllProfiles, setPlayerProfile: setSP } = await import('./lib/mongodb.js')
      const profs = await getAllProfiles()
      if (!profs.length) return reply('⚘ ɴᴏ ᴘʟᴀʏᴇʀs ꜰᴏᴜɴᴅ.\n──────────✷')
      let credited = 0
      for (const p of profs) {
        await setSP(p.jid, {
          wallet:      (p.wallet      || 0) + amount,
          totalEarned: (p.totalEarned || 0) + amount,
        })
        await recordTx({ from: 'owner', to: p.jid, amount, type: 'credit', note: 'owner airdrop' })
        credited++
      }
      return reply(
        `「💰 ᴀɪʀᴅʀᴏᴘ ᴄᴏᴍᴘʟᴇᴛᴇ」\n──────➳\n๏ ๏\n\n` +
        `⚘ $${amount} sent to ${credited} player${credited !== 1 ? 's' : ''}\n──────────✷`
      )
    }

    // ── /cleardb confirm — wipe all MongoDB collections ──
    if (cmd === 'cleardb') {
      if (args[0]?.toLowerCase() !== 'confirm')
        return reply(
          `「🗑️ ᴄʟᴇᴀʀ ᴅʙ」\n──────➳\n๏ ๏\n\n` +
          `⚘ ᴛʜɪs ᴡɪʟʟ ᴅᴇʟᴇᴛᴇ ᴀʟʟ ᴘʟᴀʏᴇʀs, ʀᴏᴏᴍs, ᴡᴀʀɴs, ɴᴏᴛᴇs & ᴛʀᴀɴsᴀᴄᴛɪᴏɴs\n` +
          `⚘ ᴛʏᴘᴇ /cleardb confirm ᴛᴏ ᴘʀᴏᴄᴇᴇᴅ\n──────────✷`
        )

      await reply(`「🗑️ ᴄʟᴇᴀʀ ᴅʙ」\n──────➳\n๏ ๏\n\n⚘ ᴡɪᴘɪɴɢ ᴅᴀᴛᴀʙᴀsᴇ...\n──────────✷`)

      const mongoose = (await import('mongoose')).default
      const db = mongoose.connection.db
      const COLS = ['profiles','rooms','groups','warns','notes','transactions','mods']
      let total = 0
      const results = []

      for (const name of COLS) {
        try {
          const col   = db.collection(name)
          const count = await col.countDocuments()
          if (count > 0) { await col.deleteMany({}); total += count }
          results.push(`⚘ ${name}: ${count} deleted`)
        } catch (e) {
          results.push(`⚘ ${name}: error — ${e.message}`)
        }
      }

      return reply(
        `「✅ ᴅʙ ᴡɪᴘᴇᴅ」\n──────➳\n๏ ๏\n\n` +
        results.join('\n') +
        `\n\n⚘ ᴛᴏᴛᴀʟ: ${total} ʀᴇᴄᴏʀᴅs ᴅᴇʟᴇᴛᴇᴅ\n⚘ ᴇᴠᴇʀʏᴏɴᴇ sᴛᴀʀᴛs ꜰʀᴇsʜ 🚀\n──────────✷`
      )
    }
  }

  // ── Look up command ───────────────────────────────────
  const entry = commands[cmd]
  if (!entry) return

  const handler      = typeof entry === 'function' ? entry : entry.run
  const perm         = typeof entry === 'function' ? PERM.PUBLIC : (entry.perm || PERM.PUBLIC)
  const groupOnly    = typeof entry === 'object' && entry.group === true  && entry.private === false
  const privOnly     = typeof entry === 'object' && entry.private === true && entry.group === false
  const needsBotAdmin = typeof entry === 'object' && entry.botAdmin === true

  if (groupOnly && !isGroup)    return reply(DENY.group)
  if (privOnly  && isGroup)     return reply(DENY.private)
  if (needsBotAdmin && !isBotAdmin) return reply(DENY.botAdmin)
  if (!isAllowed(perm, { isOwner, isMod, isAdmin })) return reply(DENY[perm] || DENY[PERM.OWNER])

  const ctx = {
    sock,
    msg:      rawMsg,
    args,
    cmd,
    text,
    chat,
    sender,
    isOwner,
    isMod,
    isAdmin,
    isBotAdmin,
    isGroup,
    mentions,
    quoted,
    reply,
  }

  // ── App gate — cmd must have matching app open ────────
  const requiredApp = APP_GATE[cmd]
  if (requiredApp) {
    const currentApp = openApps.get(sender)
    if (currentApp !== requiredApp) {
      const appName = APP_NAMES[requiredApp] || requiredApp
      return reply(
        `「📱 ᴀᴘᴘ ɴᴏᴛ ᴏᴘᴇɴ」\n──────➳\n๏ ๏\n\n` +
        `⚘ open *${appName}* first\n` +
        `⚘ type /${requiredApp} to launch it\n──────────✷`
      )
    }
  }

  try {
    // ══ PHONE MIDDLEWARE — delay + battery + crash ════
    const phoneStatus = await phoneMiddleware(sender, cmd)

    // ── If phone just crashed, notify and kick from game ─
    if (phoneStatus.justCrashed) {
      const { getPlayerProfile, setPlayerProfile } = await import('./lib/mongodb.js')
      const { getRoom, setRoom }                   = await import('./lib/mongodb.js')
      const profile = await getPlayerProfile(sender).catch(() => null)
      if (profile?.activeRoom) {
        try {
          const room = await getRoom(profile.activeRoom)
          if (room && room.status !== 'ended') {
            const player = room.players?.find(p => p.jid === sender)
            if (player) {
              player.alive = false // mark dead / disconnected
              await setRoom(room.code, room)
            }
          }
          await setPlayerProfile(sender, { ...profile, activeRoom: null, activeTask: null })
        } catch {}
        await notifyCrash(sock, sender, chat, phoneStatus.phoneName, phoneStatus)
      }
    }

    // ── Dead battery blocks app commands ──────────────
    if (phoneStatus.isDead && APP_COMMANDS.has(cmd)) {
      const ph = phoneStatus.phone
      return reply(fmt('🪫 ᴅᴇᴀᴅ ʙᴀᴛᴛᴇʀʏ',
        `${field(sc('phone'),   ph.emoji + ' ' + ph.name)}\n` +
        `${field(sc('battery'), batteryBar(0))}\n\n` +
        sc('your phone is dead — you cannot use apps') + '\n' +
        sc('use /charge to recharge (takes 5 minutes)') + '\n' +
        sc('basic commands still work while dead')
      ))
    }

    // ── Crashed phone blocks app commands (2 min restart) ─
    if (phoneStatus.isCrashed && !phoneStatus.justCrashed && APP_COMMANDS.has(cmd)) {
      const ph = phoneStatus.phone
      return reply(fmt('💥 ᴘʜᴏɴᴇ ʀᴇsᴛᴀʀᴛɪɴɢ',
        `${field(sc('phone'),   ph.emoji + ' ' + ph.name)}\n` +
        `${field(sc('status'),  'crashed — restarting...')}\n\n` +
        sc('wait 2 minutes for your phone to restart') + '\n' +
        sc('upgrade at /gadgetstore for longer session limits')
      ))
    }

    await handler(ctx)
  } catch (err) {
    console.error(`[${cmd} error]`, err.message)
  }
}

// ── Group participant events (welcome/goodbye) ────────
export async function handleGroupParticipants(sock, event, store) {
  const { id: chat, participants, action } = event
  const gs = await getGroup(chat)

  for (const jid of participants) {
    const num = jid.split('@')[0]

    if (action === 'add' && gs.welcome) {
      const msg = gs.customWelcome
        ? gs.customWelcome.replace('{name}', `@${num}`)
        : `「ᴡᴇʟᴄᴏᴍᴇ」\n──────➳\n๏ ๏\n⚘ ᴡᴇʟᴄᴏᴍᴇ @${num} ᴛᴏ ᴛʜᴇ ɢʀᴏᴜᴘ!\n──────────✷`
      await sock.sendMessage(chat, { text: msg, mentions: [jid] }).catch(() => {})
    }

    if (action === 'remove' && gs.goodbye) {
      const msg = gs.customGoodbye
        ? gs.customGoodbye.replace('{name}', `@${num}`)
        : `「ɢᴏᴏᴅʙʏᴇ」\n──────➳\n๏ ๏\n⚘ @${num} ʜᴀs ʟᴇꜰᴛ ᴛʜᴇ ɢʀᴏᴜᴘ.\n──────────✷`
      await sock.sendMessage(chat, { text: msg, mentions: [jid] }).catch(() => {})
    }
  }
}
