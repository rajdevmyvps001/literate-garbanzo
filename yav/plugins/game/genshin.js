// ═══════════════════════════════════════════════════════
//   ✨ GENSHIN IMPACT — Bot Integration
//   Profile · Characters · Resin · Daily Reminder
//   Uses Enka.Network API (free, no auth needed)
//   Daily check-in via HoYoLAB (requires user cookie)
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep } from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile } from '../../lib/mongodb.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

const GENSHIN_FILE = './data/genshin.json'

// ── Data helpers ───────────────────────────────────────
function loadGenshin() {
  try { return existsSync(GENSHIN_FILE) ? JSON.parse(readFileSync(GENSHIN_FILE, 'utf8')) : {} } catch { return {} }
}
function saveGenshin(data) {
  mkdirSync('./data', { recursive: true })
  writeFileSync(GENSHIN_FILE, JSON.stringify(data, null, 2))
}
function getGenshinProfile(jid) { return loadGenshin()[jid] || null }
function setGenshinProfile(jid, data) {
  const all = loadGenshin()
  all[jid]  = { ...all[jid], ...data }
  saveGenshin(all)
}

// ── Enka.Network fetch ─────────────────────────────────
async function fetchEnka(uid) {
  const url = `https://enka.network/api/uid/${uid}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'VampireDiariesBot/1.0 (WhatsApp Bot)' }
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('UID not found — make sure your profile is public in Genshin Impact')
    if (res.status === 429) throw new Error('API rate limited — try again in a few seconds')
    throw new Error(`API error ${res.status}`)
  }
  return res.json()
}

// ── HoYoLAB Daily Check-in ─────────────────────────────
const CHECKIN_URL  = 'https://sg-hk4e-api.hoyolab.com/event/sol/sign'
const CHECKIN_INFO = 'https://sg-hk4e-api.hoyolab.com/event/sol/info'
const ACT_ID       = 'e202102251931481'

async function hoylabCheckin(cookie) {
  const headers = {
    'Cookie':       cookie,
    'User-Agent':   'Mozilla/5.0',
    'Referer':      'https://act.hoyolab.com/',
    'Content-Type': 'application/json',
    'x-rpc-app_version': '2.34.1',
    'x-rpc-client_type': '4',
  }
  const res = await fetch(`${CHECKIN_URL}?lang=en-us&act_id=${ACT_ID}`, {
    method:  'POST', headers, body: JSON.stringify({})
  })
  return res.json()
}

async function hoylabCheckinInfo(cookie) {
  const headers = { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://act.hoyolab.com/' }
  const res = await fetch(`${CHECKIN_INFO}?lang=en-us&act_id=${ACT_ID}`, { headers })
  return res.json()
}

// ── Element / stat display ─────────────────────────────
const ELEMENT_EMOJI = {
  Fire:    '🔥 Pyro',    Water:   '💧 Hydro',
  Ice:     '❄️ Cryo',   Electric:'⚡ Electro',
  Wind:    '🌪️ Anemo',  Rock:    '🪨 Geo',
  Grass:   '🌿 Dendro',
}
// Enka prop types for main stats
const PROP_NAMES = {
  FIGHT_PROP_MAX_HP:               'HP',
  FIGHT_PROP_ATTACK:               'ATK',
  FIGHT_PROP_DEFENSE:              'DEF',
  FIGHT_PROP_ELEMENT_MASTERY:      'EM',
  FIGHT_PROP_CRITICAL:             'Crit Rate',
  FIGHT_PROP_CRITICAL_HURT:        'Crit DMG',
  FIGHT_PROP_CHARGE_EFFICIENCY:    'ER',
  FIGHT_PROP_HEAL_ADD:             'Heal Bonus',
  FIGHT_PROP_PHYSICAL_ADD_HURT:    'Phys DMG',
}

function fmtStat(key, val) {
  const name = PROP_NAMES[key] || key
  const pct  = key.includes('CRITICAL') || key.includes('EFFICIENCY') || key.includes('ADD')
  return `${name}: ${pct ? (val * 100).toFixed(1) + '%' : Math.floor(val)}`
}

// ── Character name lookup (subset of known chars) ─────
// Enka uses avatarId numbers. We map the most common ones.
// Full list: enka.network/api/assets/characters
const AVATAR_NAMES = {
  10000002:'Ayaka', 10000003:'Qiqi',  10000004:'Klee',  10000005:'Traveler',
  10000006:'Lisa',  10000007:'Traveler',10000014:'Barbara',10000015:'Kaeya',
  10000016:'Diluc', 10000020:'Razor',  10000021:'Amber', 10000022:'Venti',
  10000023:'Xiangling',10000024:'Beidou',10000025:'Xingqiu',10000026:'Xiao',
  10000027:'Ningguang',10000029:'Klee', 10000030:'Zhongli',10000031:'Fischl',
  10000032:'Bennett',10000033:'Tartaglia',10000034:'Noelle',10000035:'Qiqi',
  10000036:'Chongyun',10000037:'Ganyu',10000038:'Albedo',10000039:'Diona',
  10000041:'Mona',  10000042:'Keqing',10000043:'Sucrose',10000044:'Xinyan',
  10000045:'Rosaria',10000046:'Hu Tao',10000047:'Kazuha',10000048:'Yanfei',
  10000049:'Yoimiya',10000050:'Thoma',10000051:'Eula',  10000052:'Raiden',
  10000053:'Sayu',  10000054:'Kokomi',10000055:'Gorou', 10000056:'Sara',
  10000057:'Itto',  10000058:'Yae Miko',10000059:'Heizou',10000060:'Yelan',
  10000061:'Aloy',  10000062:'Shenhe',10000063:'Yun Jin',10000064:'Kuki',
  10000065:'Kuki',  10000066:'Wanderer',10000067:'Faruzan',10000068:'Yaoyao',
  10000069:'Layla', 10000070:'Nilou', 10000071:'Cyno',  10000072:'Candace',
  10000073:'Nahida',10000074:'Tighnari',10000075:'Collei',10000076:'Dori',
  10000077:'Dehya', 10000078:'Mika',  10000079:'Baizhu',10000080:'Kaveh',
  10000081:'Al-Haitham',10000082:'Kirara',10000083:'Lyney',10000084:'Lynette',
  10000085:'Freminet',10000086:'Neuvillette',10000087:'Wriothesley',10000088:'Charlotte',
  10000089:'Furina',10000090:'Navia', 10000091:'Chevreuse',10000092:'Xianyun',
  10000093:'Gaming',10000094:'Chiori',10000095:'Sigewinne',10000096:'Arlecchino',
  10000097:'Sethos',10000098:'Clorinde',10000099:'Emilie',10000100:'Kachina',
  10000101:'Kinich',10000102:'Mualani',10000103:'Xilonen',10000104:'Chasca',
  10000105:'Ororon',10000106:'Mavuika',10000107:'Citlali',10000108:'Lanyan',
  10000109:'Skirk', 10000110:'Varesa',
}
function getAvatarName(id) { return AVATAR_NAMES[id] || `Character #${id}` }

// ── Resin manager (in memory + genshin.json) ──────────
const RESIN_CAP   = 200
const RESIN_REGEN = 8  // minutes per resin

function calcCurrentResin(profile) {
  if (!profile?.resin) return null
  const { amount, lastUpdated } = profile.resin
  const minsPassed  = (Date.now() - lastUpdated) / 60_000
  const regen       = Math.floor(minsPassed / RESIN_REGEN)
  const current     = Math.min(RESIN_CAP, amount + regen)
  const minsToFull  = current >= RESIN_CAP ? 0 : (RESIN_CAP - current) * RESIN_REGEN
  return { current, minsToFull }
}

function resinBar(current) {
  const filled = Math.round((current / RESIN_CAP) * 10)
  const empty  = 10 - filled
  const emoji  = current >= RESIN_CAP ? '🟣' : current >= 100 ? '🟡' : '🔵'
  return `${emoji} [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${current}/${RESIN_CAP}`
}

// ── Resin reminder loop ────────────────────────────────
const resinAlerts = new Map() // jid → alertThreshold
let _sock = null

export function initGenshinSock(sock) { _sock = sock }

setInterval(async () => {
  if (!_sock) return
  const all = loadGenshin()
  for (const [jid, gp] of Object.entries(all)) {
    if (!gp.resin || !gp.resinAlert) continue
    const { current } = calcCurrentResin(gp) || {}
    if (current !== undefined && current >= gp.resinAlert && !gp.resinNotified) {
      gp.resinNotified = true
      saveGenshin({ ...all, [jid]: gp })
      await _sock.sendMessage(jid, {
        text: fmt('✨ ɢᴇɴsʜɪɴ — ʀᴇsɪɴ ᴀʟᴇʀᴛ',
          `${field(sc('resin'),   resinBar(current))}\\n` +
          `${field(sc('alert'),   'reached ' + gp.resinAlert + ' — do your domains!')}\\n\\n` +
          sc('use /genshin resin to update your current amount')
        )
      }).catch(() => {})
    }
    // Reset notified when it drops below threshold (from spending)
    if (current !== undefined && current < gp.resinAlert && gp.resinNotified) {
      gp.resinNotified = false
      saveGenshin({ ...all, [jid]: gp })
    }
  }
}, 5 * 60 * 1000) // check every 5 minutes

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run(ctx) {
  const { cmd, args } = ctx
  const sub = args[0]?.toLowerCase()

  if (cmd === 'genshin') {
    if (!sub || sub === 'help')     return handleHelp(ctx)
    if (sub === 'link')             return handleLink(ctx)
    if (sub === 'unlink')           return handleUnlink(ctx)
    if (sub === 'profile' || sub === 'stats') return handleProfile(ctx)
    if (sub === 'characters' || sub === 'chars') return handleCharacters(ctx)
    if (sub === 'resin')            return handleResin(ctx)
    if (sub === 'checkin')          return handleCheckin(ctx)
    if (sub === 'cookie')           return handleCookie(ctx)
    if (sub === 'abyss')            return handleAbyss(ctx)
    if (sub === 'reminder')         return handleReminder(ctx)
    if (sub === 'build')            return handleBuild(ctx)
    return handleHelp(ctx)
  }
}

// ══════════════════════════════════════════════════════
//  /genshin help
// ══════════════════════════════════════════════════════
async function handleHelp({ reply }) {
  return reply(fmt('✨ ɢᴇɴsʜɪɴ ɪᴍᴘᴀᴄᴛ',
    `${field(sc('link uid'),       '/genshin link [uid]')}\\n` +
    `${field(sc('profile'),        '/genshin profile')}\\n` +
    `${field(sc('characters'),     '/genshin characters')}\\n` +
    `${field(sc('build'),          '/genshin build [character]')}\\n` +
    `${field(sc('resin'),          '/genshin resin [current amount]')}\\n` +
    `${field(sc('resin alert'),    '/genshin reminder [threshold]')}\\n` +
    `${field(sc('daily checkin'),  '/genshin checkin')}\\n` +
    `${field(sc('set cookie'),     '/genshin cookie [ltuid] [ltoken]')}\\n\\n` +
    sc('profile must be public in game settings → profile → show on enka') + '\\n' +
    sc('uid: found in bottom right corner of game screen')
  ))
}

// ══════════════════════════════════════════════════════
//  /genshin link [uid]
// ══════════════════════════════════════════════════════
async function handleLink({ sender, args, reply }) {
  const uid = args[1]?.replace(/\D/g, '')
  if (!uid || uid.length < 8 || uid.length > 10)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('usage'), '/genshin link 123456789')))

  await reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('linking... fetching your profile from enka.network')))

  try {
    const data = await fetchEnka(uid)
    const pi   = data.playerInfo

    setGenshinProfile(sender, {
      uid,
      nickname:   pi.nickname,
      level:      pi.level,
      signature:  pi.signature || '',
      worldLevel: pi.worldLevel || 0,
      achivements: pi.finishAchievementNum || 0,
      linkedAt:   Date.now(),
    })

    return reply(fmt('✨ ɢᴇɴsʜɪɴ — ʟɪɴᴋᴇᴅ!',
      `${field(sc('nickname'),    pi.nickname)}\\n` +
      `${field(sc('uid'),         uid)}\\n` +
      `${field(sc('ar'),          'AR ' + pi.level)}\\n` +
      `${field(sc('world level'), 'WL ' + (pi.worldLevel || 0))}\\n` +
      `${field(sc('achievements'),pi.finishAchievementNum || 0)}\\n` +
      (pi.signature ? `${field(sc('signature'), pi.signature)}\\n` : '') +
      `\\n${sc('use /genshin profile for full stats')}\\n` +
      sc('use /genshin characters to see your showcase')
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), err.message)}\\n\\n${sc('make sure:')}\\n⚘ your uid is correct\\n⚘ profile is set to public in genshin settings\\n⚘ you have characters on your showcase`))
  }
}

// ══════════════════════════════════════════════════════
//  /genshin unlink
// ══════════════════════════════════════════════════════
async function handleUnlink({ sender, reply }) {
  const gp = getGenshinProfile(sender)
  if (!gp) return reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('no account linked — /genshin link [uid]')))
  const all = loadGenshin()
  delete all[sender]
  saveGenshin(all)
  return reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('account unlinked')))
}

// ══════════════════════════════════════════════════════
//  /genshin profile
// ══════════════════════════════════════════════════════
async function handleProfile({ sender, args, mentions, reply }) {
  const target = mentions?.[0] || sender
  const gp     = getGenshinProfile(target)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('link with: /genshin link [uid]')}`))

  await reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('fetching from enka.network...')))

  try {
    const data = await fetchEnka(gp.uid)
    const pi   = data.playerInfo
    const chars = (data.avatarInfoList || []).length

    // Update stored data
    setGenshinProfile(target, {
      nickname:    pi.nickname,
      level:       pi.level,
      worldLevel:  pi.worldLevel || 0,
      achivements: pi.finishAchievementNum || 0,
      signature:   pi.signature || '',
    })

    const resinData  = calcCurrentResin(gp)
    const resinLine  = resinData
      ? `${field(sc('resin'),  resinBar(resinData.current) + (resinData.minsToFull > 0 ? ' (full in ' + Math.ceil(resinData.minsToFull / 60) + 'h)' : ' FULL'))}\\n`
      : ''

    return reply(fmt('✨ ' + pi.nickname + ' — ᴘʀᴏꜰɪʟᴇ',
      `${field(sc('uid'),          gp.uid)}\\n` +
      `${field(sc('ar'),           'AR ' + pi.level)}\\n` +
      `${field(sc('world level'),  'WL ' + (pi.worldLevel || 0))}\\n` +
      `${field(sc('achievements'), pi.finishAchievementNum || 0)}\\n` +
      `${field(sc('showcase'),     chars + ' character' + (chars !== 1 ? 's' : ''))}\\n` +
      resinLine +
      (pi.signature ? `${field(sc('signature'), pi.signature)}\\n` : '') +
      `\\n${sc('/genshin characters to see showcase')}`
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /genshin characters
// ══════════════════════════════════════════════════════
async function handleCharacters({ sender, args, mentions, reply }) {
  const target = mentions?.[0] || sender
  const gp     = getGenshinProfile(target)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('link with: /genshin link [uid]')}`))

  await reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('fetching character showcase...')))

  try {
    const data  = await fetchEnka(gp.uid)
    const chars = data.avatarInfoList || []

    if (!chars.length)
      return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no characters on showcase')}\\n${sc('add up to 8 characters to your enka showcase in game')}\\n${sc('game menu → profile → character showcase → edit')}`))

    const lines = chars.map(av => {
      const name    = getAvatarName(av.avatarId)
      const level   = av.propMap?.['4001']?.val || '??'
      const cons    = av.talentIdList?.length || 0
      const element = av.element || ''
      const elemEmoji = ELEMENT_EMOJI[element] ? ELEMENT_EMOJI[element].split(' ')[0] : '✨'
      return `⚘ ${elemEmoji} *${name}* C${cons} · Lv${level}`
    }).join('\\n')

    const pi = data.playerInfo
    return reply(fmt(`✨ ${pi.nickname} — sʜᴏᴡᴄᴀsᴇ`,
      `${field(sc('uid'), gp.uid)} · AR${pi.level}\\n\\n` +
      lines + '\\n\\n' +
      sc('/genshin build [name] for detailed stats')
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /genshin build [character name]
// ══════════════════════════════════════════════════════
async function handleBuild({ sender, args, mentions, reply }) {
  const target    = mentions?.[0] || sender
  const charName  = args.slice(1).join(' ').toLowerCase()
  const gp        = getGenshinProfile(target)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('link with: /genshin link [uid]')}`))
  if (!charName)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('usage'), '/genshin build Hu Tao')))

  await reply(fmt('✨ ɢᴇɴsʜɪɴ', sc('fetching build stats...')))

  try {
    const data  = await fetchEnka(gp.uid)
    const chars = data.avatarInfoList || []
    const av    = chars.find(a => getAvatarName(a.avatarId).toLowerCase().includes(charName))
    if (!av)
      return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'character not found in showcase')}\\n${sc('add them to your enka showcase in game first')}`))

    const name    = getAvatarName(av.avatarId)
    const level   = av.propMap?.['4001']?.val || '??'
    const cons    = av.talentIdList?.length || 0

    // Key fight props
    const fp  = av.fightPropMap || {}
    const stats = [
      ['HP',         Math.floor(fp['2000'] || fp['1'] || 0)],
      ['ATK',        Math.floor(fp['2001'] || fp['4'] || 0)],
      ['DEF',        Math.floor(fp['2002'] || fp['7'] || 0)],
      ['EM',         Math.floor(fp['28'] || 0)],
      ['Crit Rate',  ((fp['20'] || 0) * 100).toFixed(1) + '%'],
      ['Crit DMG',   ((fp['22'] || 0) * 100).toFixed(1) + '%'],
      ['ER',         ((fp['23'] || 0) * 100).toFixed(1) + '%'],
    ]

    // Talents (normal, skill, burst)
    const talents = av.skillLevelMap ? Object.values(av.skillLevelMap).slice(0,3) : []
    const talentStr = talents.map((v, i) => ['NA','Skill','Burst'][i] + ':' + v).join(' · ')

    // Weapon
    const weapon   = av.equipList?.find(e => e.flat?.itemType === 'ITEM_WEAPON')
    const weapName = weapon?.flat?.nameTextMapHash ? 'Equipped' : 'Unknown'
    const weapLvl  = weapon?.weapon?.level || '?'

    return reply(fmt(`✨ ${name} — ʙᴜɪʟᴅ`,
      `${field(sc('level'),   'Lv' + level + ' · C' + cons)}\\n` +
      `${field(sc('talents'), talentStr)}\\n` +
      `${field(sc('weapon'),  weapName + ' Lv' + weapLvl)}\\n\\n` +
      sc('stats:') + '\\n' +
      stats.map(([k,v]) => `⚘ ${k}: ${v}`).join('\\n')
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /genshin resin [current amount]
// ══════════════════════════════════════════════════════
async function handleResin({ sender, args, reply }) {
  const gp = getGenshinProfile(sender)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('/genshin link [uid]')}`))

  const input = parseInt(args[1])

  if (!isNaN(input) && input >= 0 && input <= RESIN_CAP) {
    setGenshinProfile(sender, {
      resin: { amount: input, lastUpdated: Date.now() },
      resinNotified: false,
    })
    const resinData = calcCurrentResin({ resin: { amount: input, lastUpdated: Date.now() } })
    const hoursToFull = Math.ceil(resinData.minsToFull / 60)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ — ʀᴇsɪɴ ᴜᴘᴅᴀᴛᴇᴅ',
      `${field(sc('current'),  resinBar(input))}\\n` +
      `${field(sc('full in'),  input >= RESIN_CAP ? 'already full!' : hoursToFull + 'h ' + (resinData.minsToFull % 60) + 'm')}\\n\\n` +
      sc('set an alert: /genshin reminder [threshold]') + '\\n' +
      sc('example: /genshin reminder 160 → alert at 160 resin')
    ))
  }

  // No input — show current
  const resinData = calcCurrentResin(gp)
  if (!resinData)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ — ʀᴇsɪɴ',
      `${field(sc('error'), 'no resin data')}\\n` +
      sc('set your current amount: /genshin resin 120') + '\\n' +
      sc('we track it from there automatically')
    ))

  const { current, minsToFull } = resinData
  const hToFull = Math.ceil(minsToFull / 60)
  return reply(fmt('✨ ɢᴇɴsʜɪɴ — ʀᴇsɪɴ',
    `${field(sc('resin'),    resinBar(current))}\\n` +
    `${field(sc('full in'),  current >= RESIN_CAP ? '🟣 FULL — spend it!' : hToFull + 'h ' + (minsToFull % 60) + 'm')}\\n` +
    `${field(sc('regen'),    '1 resin every 8 minutes')}\\n` +
    (gp.resinAlert ? field(sc('alert at'), gp.resinAlert + ' resin') : '') +
    `\\n\\n${sc('update amount: /genshin resin [current amount]')}`
  ))
}

// ══════════════════════════════════════════════════════
//  /genshin reminder [threshold]
// ══════════════════════════════════════════════════════
async function handleReminder({ sender, args, reply }) {
  const gp = getGenshinProfile(sender)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('/genshin link [uid]')}`))

  const threshold = parseInt(args[1])
  if (isNaN(threshold) || threshold < 20 || threshold > 200)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ',
      `${field(sc('usage'), '/genshin reminder [20-200]')}\\n` +
      `${sc('example: /genshin reminder 160')}\\n` +
      `${sc('bot will dm you when resin hits that amount')}`
    ))

  setGenshinProfile(sender, { resinAlert: threshold, resinNotified: false })
  return reply(fmt('✨ ɢᴇɴsʜɪɴ — ʀᴇᴍɪɴᴅᴇʀ sᴇᴛ',
    `${field(sc('alert at'), threshold + ' / 200 resin')}\\n` +
    `${field(sc('where'),    'dm notification')}\\n\\n` +
    sc('make sure to set current resin: /genshin resin [amount]') + '\\n' +
    sc('cancel alert: /genshin reminder 200')
  ))
}

// ══════════════════════════════════════════════════════
//  /genshin checkin — auto daily check-in
// ══════════════════════════════════════════════════════
async function handleCheckin({ sender, reply }) {
  const gp = getGenshinProfile(sender)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('/genshin link [uid]')}`))

  if (!gp.ltuid || !gp.ltoken)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ — ᴄʜᴇᴄᴋ-ɪɴ',
      `${field(sc('error'), 'no hoyolab cookie set')}\\n\\n` +
      sc('to set up daily check-in:') + '\\n' +
      `⚘ open https://hoyolab.com in a browser\\n` +
      `⚘ log in\\n` +
      `⚘ open browser dev tools (F12)\\n` +
      `⚘ go to Application → Cookies → hoyolab.com\\n` +
      `⚘ find ltuid_v2 and ltoken_v2\\n` +
      `⚘ dm bot: /genshin cookie [ltuid] [ltoken]\\n\\n` +
      sc('⚠️ keep your cookie private — only send in dm, never in group')
    ))

  try {
    const cookie = `ltuid_v2=${gp.ltuid}; ltoken_v2=${gp.ltoken};`
    const [info, signResult] = await Promise.all([
      hoylabCheckinInfo(cookie),
      hoylabCheckin(cookie),
    ])

    const alreadySignedIn = signResult.retcode === -5003
    const signedInDays    = info?.data?.total_sign_day || '?'

    if (alreadySignedIn) {
      return reply(fmt('✨ ɢᴇɴsʜɪɴ — ᴄʜᴇᴄᴋ-ɪɴ',
        `${field(sc('status'),   'already checked in today ✅')}\\n` +
        `${field(sc('streak'),   signedInDays + ' days')}\\n\\n` +
        sc('daily rewards claimed! come back tomorrow')
      ))
    }

    if (signResult.retcode === 0) {
      return reply(fmt('✨ ɢᴇɴsʜɪɴ — ᴄʜᴇᴄᴋ-ɪɴ ✅',
        `${field(sc('status'),   '✅ checked in!')}\\n` +
        `${field(sc('streak'),   signedInDays + ' days')}\\n` +
        `${field(sc('rewards'),  'claimed — check in-game')}\\n\\n` +
        sc('free primogems added to your account')
      ))
    }

    return reply(fmt('✨ ɢᴇɴsʜɪɴ — ᴄʜᴇᴄᴋ-ɪɴ',
      `${field(sc('result'), signResult.message || 'unknown response')}\\n` +
      sc('if cookie expired: /genshin cookie [ltuid] [ltoken]')
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('error'), err.message)))
  }
}

// ══════════════════════════════════════════════════════
//  /genshin cookie [ltuid] [ltoken]  — DM ONLY
// ══════════════════════════════════════════════════════
async function handleCookie({ sender, args, isGroup, reply }) {
  if (isGroup)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'never share your cookie in a group!')}\\n${sc('dm the bot this command privately')}`))

  const ltuid  = args[1]
  const ltoken = args[2]
  if (!ltuid || !ltoken)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('usage'), '/genshin cookie [ltuid] [ltoken]')}\\n${sc('get these from hoyolab.com cookies — see /genshin checkin for instructions')}`))

  setGenshinProfile(sender, { ltuid, ltoken })
  return reply(fmt('✨ ɢᴇɴsʜɪɴ — ᴄᴏᴏᴋɪᴇ sᴀᴠᴇᴅ',
    `${field(sc('status'), '✅ hoyolab account linked')}\\n\\n` +
    sc('test it: /genshin checkin') + '\\n' +
    sc('⚠️ if you log out of hoyolab you will need to update this')
  ))
}

// ══════════════════════════════════════════════════════
//  /genshin abyss — Spiral Abyss data (placeholder)
// ══════════════════════════════════════════════════════
async function handleAbyss({ sender, reply }) {
  const gp = getGenshinProfile(sender)
  if (!gp?.uid)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), 'no account linked')}\\n${sc('/genshin link [uid]')}`))

  // Abyss data requires HoYoLAB game record API (needs cookie)
  if (!gp.ltuid || !gp.ltoken)
    return reply(fmt('✨ ɢᴇɴsʜɪɴ — sᴘɪʀᴀʟ ᴀʙʏss',
      `${field(sc('error'), 'abyss data requires hoyolab login')}\\n` +
      sc('set up: /genshin checkin (follow instructions)')
    ))

  try {
    const cookie  = `ltuid_v2=${gp.ltuid}; ltoken_v2=${gp.ltoken};`
    const url     = `https://bbs-api-os.hoyolab.com/game_record/genshin/api/spiralAbyss?server=os_asia&role_id=${gp.uid}&schedule_type=1`
    const res     = await fetch(url, {
      headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://act.hoyolab.com/' }
    })
    const data = await res.json()
    if (data.retcode !== 0)
      return reply(fmt('✨ ɢᴇɴsʜɪɴ', `${field(sc('error'), data.message || 'failed to fetch abyss data')}\\n${sc('make sure game record is set to public in hoyolab')}`))

    const a   = data.data
    const top = (a.damage_rank?.[0] || a.defeat_rank?.[0])

    return reply(fmt('✨ sᴘɪʀᴀʟ ᴀʙʏss',
      `${field(sc('season'),    a.schedule_id || '?')}\\n` +
      `${field(sc('stars'),     (a.total_star || 0) + ' / 36 ⭐')}\\n` +
      `${field(sc('floors'),    'deepest: ' + (a.max_floor || '?'))}\\n` +
      `${field(sc('battles'),   a.total_battle_times || 0)}\\n` +
      `${field(sc('wins'),      a.total_win_times || 0)}\\n` +
      (top ? `${field(sc('top dmg'), getAvatarName(top.avatar_id) + ': ' + (top.value || 0))}\\n` : '') +
      `\\n${sc('clear 36 stars for maximum primo rewards!')}`
    ))
  } catch (err) {
    return reply(fmt('✨ ɢᴇɴsʜɪɴ', field(sc('error'), err.message)))
  }
}
