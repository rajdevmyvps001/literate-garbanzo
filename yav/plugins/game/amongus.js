// ═══════════════════════════════════════════════════════
//   🚀 AMONG US — GAME PLUGIN
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep } from '../../lib/utils.js'
import {
  getRoom, setRoom, deleteRoom, getRooms,
  getPlayerProfile, setPlayerProfile,
  getGroupSetting, setGroupSetting,
  getAllProfiles,
} from '../../lib/mongodb.js'

// ── Profile colours ─────────────────────────────────────
const GAME_COLORS = [
  { name: 'Red',    emoji: '🔴', pfp: 'pfp-red.jpg'    },
  { name: 'Blue',   emoji: '🔵', pfp: 'pfp-blue.jpg'   },
  { name: 'Green',  emoji: '🟢', pfp: 'pfp-green.jpg'  },
  { name: 'Pink',   emoji: '🩷', pfp: 'pfp-pink.jpg'   },
  { name: 'Orange', emoji: '🟠', pfp: 'pfp-orange.jpg' },
  { name: 'Yellow', emoji: '🟡', pfp: 'pfp-yellow.jpg' },
  { name: 'Black',  emoji: '⚫', pfp: 'pfp-black.jpg'  },
  { name: 'White',  emoji: '⚪', pfp: 'pfp-white.jpg'  },
  { name: 'Purple', emoji: '🟣', pfp: 'pfp-purple.jpg' },
  { name: 'Brown',  emoji: '🟤', pfp: 'pfp-brown.jpg'  },
  { name: 'Cyan',   emoji: '🩵', pfp: 'pfp-cyan.jpg'   },
  { name: 'Lime',   emoji: '💚', pfp: 'pfp-lime.jpg'   },
  { name: 'Maroon', emoji: '🍷', pfp: 'pfp-maroon.jpg' },
  { name: 'Rose',   emoji: '🌸', pfp: 'pfp-rose.jpg'   },
  { name: 'Navy',   emoji: '🌊', pfp: 'pfp-navy.jpg'   },
]
const COLORS = GAME_COLORS

const ALL_TASKS = [
  { id: 'science',    name: 'Science Trivia',   type: 'answer', answer: 'mercury',                desc: 'Answer: What planet is closest to the sun?' },
  { id: 'math',       name: 'Math Check',        type: 'answer', answer: '102',                    desc: 'Answer: What is 17 x 6?' },
  { id: 'geo',        name: 'Geography Test',    type: 'answer', answer: 'tokyo',                  desc: 'Answer: What is the capital of Japan?' },
  { id: 'history',    name: 'History Quiz',      type: 'answer', answer: '1945',                   desc: 'Answer: What year did World War II end?' },
  { id: 'nature',     name: 'Nature Study',      type: 'answer', answer: '8',                      desc: 'Answer: How many legs does a spider have?' },
  { id: 'unscramble', name: 'Word Unscramble',   type: 'answer', answer: 'space',                  desc: 'Unscramble this word and reply: ACESP' },
  { id: 'riddle1',    name: 'Wiring Riddle',     type: 'answer', answer: 'map',                    desc: 'Riddle: I have cities but no houses, mountains but no trees, water but no fish. What am I?' },
  { id: 'riddle2',    name: 'Engine Riddle',     type: 'answer', answer: 'footsteps',              desc: 'Riddle: The more you take the more you leave behind. What am I?' },
  { id: 'tech',       name: 'Tech Scan',         type: 'answer', answer: 'central processing unit',desc: 'Answer: What does CPU stand for?' },
  { id: 'sport',      name: 'Sports Data',       type: 'answer', answer: '5',                      desc: 'Answer: How many players per team are on a basketball court?' },
  { id: 'music',      name: 'Music Calibration', type: 'answer', answer: '6',                      desc: 'Answer: How many strings does a standard guitar have?' },
  { id: 'sequence',   name: 'Number Sequence',   type: 'answer', answer: '32',                     desc: 'Complete the sequence and reply: 2, 4, 8, 16, ___' },
  { id: 'body',       name: 'Medical Scan',      type: 'answer', answer: '206',                    desc: 'Answer: How many bones are in the adult human body?' },
  { id: 'decode',     name: 'Code Decode',       type: 'answer', answer: 'crewmate',               desc: 'Decode (shift each letter back 3): FUDFZPDWH' },
  { id: 'tag4', name: 'Tag 4 Crewmates', type: 'tag4',
    desc: 'Go to the game group chat and tag 4 different active players in one message. Then come back and type: /task confirm' },
]

const ROLES = {
  CREWMATE:  { name: 'Crewmate',  emoji: '🟦' },
  IMPOSTOR:  { name: 'Impostor',  emoji: '🔴' },
  DETECTIVE: { name: 'Detective', emoji: '🔍' },
}

// ── Cooldowns ───────────────────────────────────────────
const KILL_COOLDOWN_MS = 20_000   // 20 seconds
const TASK_COOLDOWN_MS =  5_000   // 5 seconds

// ── Fake task names shown to impostors to blend in ──────
const FAKE_TASK_NAMES = [
  'Fix Wiring', 'Data Upload', 'Fix Lights', 'Empty Garbage',
  'Calibrate Distributor', 'Fuel Engines', 'Clean O2 Filter',
  'Align Engine Output', 'Chart Course', 'Clear Asteroids',
  'Stabilise Steering', 'Submit Scan', 'Inspect Sample',
  'Store Artifacts', 'Activate Weather Nodes',
]

// ── Helpers ─────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function pickTasks(n = 4)   { return shuffle(ALL_TASKS).slice(0, n).map(t => ({ ...t })) }
function pickFakeTasks(n = 4) { return shuffle(FAKE_TASK_NAMES).slice(0, n) }
function genCode() {
  const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => C[Math.floor(Math.random() * C.length)]).join('')
}
function maxImpostors(n) { return n >= 8 ? 3 : n >= 7 ? 2 : 1 }
function jnum(jid = '')  { return jid.split('@')[0] }
function isValidUsername(name) { return /^[A-Za-z]+$/.test(name) }
function randInt(min, max)     { return Math.floor(Math.random() * (max - min + 1)) + min }

function checkWin(room) {
  const alive     = room.players.filter(p => p.alive)
  const impAlive  = alive.filter(p => p.role === 'IMPOSTOR')
  const crewAlive = alive.filter(p => p.role !== 'IMPOSTOR')
  if (impAlive.length === 0)
    return { winner: 'CREW', reason: 'All impostors were found and ejected!' }
  if (impAlive.length >= crewAlive.length)
    return { winner: 'IMPOSTOR', reason: 'Impostors now equal or outnumber the crew!' }
  const crewPlayers = room.players.filter(p => p.role !== 'IMPOSTOR' && p.alive)
  if (crewPlayers.length > 0 && crewPlayers.every(p => (p.tasksCompleted || 0) >= (p.tasks?.length || 4)))
    return { winner: 'CREW', reason: 'All crew tasks completed!' }
  return null
}

function resolveTarget(room, raw) {
  if (!raw) return null
  const q = raw.replace(/^@/, '').toLowerCase()
  const p = room.players.find(pl =>
    pl.username.toLowerCase() === q || jnum(pl.jid) === q
  )
  return p?.jid || null
}

// ── App install+open guard ───────────────────────────────
// Returns true (allowed) or sends an error and returns false.
async function requireAppOpen(sender, reply) {
  const profile = await getPlayerProfile(sender)
  if (!(profile?.installedApps || []).includes('amongus')) {
    await reply(fmt('ᴀᴍᴏɴɢ ᴜs',
      `${field(sc('app not installed'), '❌')}\\n` +
      sc('install: /app install Among Us') + '\\n' +
      sc('then open it: /amongus')
    ))
    return false
  }
  // Lazy-import to avoid circular dep — apps.js is a sibling plugin
  let openApps
  try { openApps = (await import('./apps.js')).openApps } catch { return true }
  if (!openApps.has(sender) || openApps.get(sender) !== 'amongus') {
    await reply(fmt('ᴀᴍᴏɴɢ ᴜs',
      `${field(sc('app not open'), '❌')}\\n` +
      sc('open it first: /amongus')
    ))
    return false
  }
  return true
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run(ctx) {
  const { sock, msg, cmd, args, chat, sender, reply, isAdmin, isGroup, mentions, isOwner } = ctx
  try {
    if (cmd === 'auon' || cmd === 'auoff') {
      if (!isGroup)             return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'group only')))
      if (!isAdmin && !isOwner) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'admins only')))
      const on = cmd === 'auon'
      await setGroupSetting(chat, { enabled: on })
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('among us'), on ? '✅ enabled in this group!' : '❌ disabled')))
    }

    if (isGroup) {
      const gated = !['auon','auoff','profile','setname','leaderboard'].includes(cmd)
      if (gated) {
        const gs = await getGroupSetting(chat)
        if (!gs?.enabled)
          return reply(fmt('ᴀᴍᴏɴɢ ᴜs',
            `${field(sc('error'), 'Among Us is not enabled in this group')}\\n` +
            sc('an admin must use /auon to enable it')
          ))
      }
    }

    if (cmd === 'setname')     return handleSetname(ctx)
    if (cmd === 'setcolor')    return handleSetcolor(ctx)
    if (cmd === 'profile')     return handleProfile(ctx)
    if (cmd === 'leaderboard') return handleLeaderboard(ctx)

    if (!isGroup) {
      if (cmd === 'start')     return handleStart(ctx)
      if (cmd === '_dm_reply') return handleDMReply(ctx)
      if (cmd === 'task')      return handleTaskCmd(ctx)
      if (cmd === 'kill')      return handleKillDM(ctx)
      if (cmd === 'lobby')     return handleImpostorDMLobby(ctx)
      return
    }

    if (cmd === 'create')       return handleCreate(ctx)
    if (cmd === 'join')         return handleJoin(ctx)
    if (cmd === 'roomsettings') return handleRoomSettings(ctx)
    if (cmd === 'gamestart')    return handleGameStart(ctx)
    if (cmd === 'kill')         return handleKill(ctx)
    if (cmd === 'faketask')     return handleFakeTask(ctx)
    if (cmd === 'task')         return handleTaskGroup(ctx)
    if (cmd === 'meeting')      return handleMeeting(ctx)
    if (cmd === 'vote')         return handleVote(ctx)
    if (cmd === 'lobby')        return handleLobby(ctx)
    if (cmd === 'endgame')      return handleEndGame(ctx)

  } catch (err) {
    console.error(`[among-us cmd=${cmd} error]`, err.message, err.stack)
    reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'something went wrong — please try again'))).catch(() => {})
  }
}

// ══════════════════════════════════════════════════════
//  /start (DM)
// ══════════════════════════════════════════════════════
async function handleStart({ sender, reply }) {
  const existing = await getPlayerProfile(sender)
  if (existing?.username && !existing.step) {
    return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ',
      `${field(sc('already registered'), '✅')}\\n` +
      `${field(sc('username'), existing.username)}\\n` +
      `${field(sc('color'), (existing.color?.emoji || '') + ' ' + (existing.color?.name || ''))}\\n` +
      `${field(sc('wallet'), '$' + (existing.wallet || 0))}\\n\\n` +
      sc('use /setname NewName to change your username')
    ))
  }
  await setPlayerProfile(sender, { step: 'awaiting_name' })
  return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ — ʀᴇɢɪsᴛʀᴀᴛɪᴏɴ',
    `${sc('welcome! this account works for all apps & games.')}\\n\\n` +
    `${field(sc('step 1 of 2'), 'what is your username?')}\\n` +
    sc('letters only — no numbers or symbols')
  ))
}

// ══════════════════════════════════════════════════════
//  DM reply handler
// ══════════════════════════════════════════════════════
async function handleDMReply({ sock, sender, args, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile) return

  if (profile.step === 'awaiting_name') {
    const name = args.join(' ').trim().slice(0, 20)
    if (!name || name.length < 2)
      return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ', field(sc('error'), 'name must be at least 2 characters')))
    if (!isValidUsername(name))
      return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ', field(sc('error'), 'letters only — no numbers, spaces, or symbols')))
    await setPlayerProfile(sender, { step: 'awaiting_color', pendingName: name })
    const list = COLORS.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}`).join('\n')
    return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ — ᴘɪᴄᴋ ʏᴏᴜʀ ᴄᴏʟᴏᴜʀ',
      `${field(sc('name saved'), name)}\\n\\n` +
      sc('this colour shows on your profile across all games.') + '\n' +
      sc('in-game you may get assigned a different lobby colour.') + '\n\n' +
      sc('pick your profile colour:') + '\n' + list + '\n\n' +
      sc('reply with the number (1-15)')
    ))
  }

  if (profile.step === 'awaiting_color') {
    const pick = parseInt(args[0])
    if (isNaN(pick) || pick < 1 || pick > COLORS.length)
      return reply(`⚘ ${sc('send a number from 1 to')} ${COLORS.length}`)
    const color = COLORS[pick - 1]
    const STARTER_BONUS = 50
    await setPlayerProfile(sender, {
      step: null, pendingName: null,
      username:    profile.pendingName,
      color,
      wallet:      STARTER_BONUS,
      gamesPlayed: profile.gamesPlayed ?? 0,
      gamesWon:    profile.gamesWon    ?? 0,
      totalEarned: STARTER_BONUS,
    })
    return reply(fmt('✅ ʀᴇɢɪsᴛʀᴀᴛɪᴏɴ ᴄᴏᴍᴘʟᴇᴛᴇ!',
      `${field(sc('username'), profile.pendingName)}\\n` +
      `${field(sc('profile colour'), color.emoji + ' ' + color.name)}\\n` +
      `${field(sc('wallet'), '$50 🎁 starter bonus!')}\\n\\n` +
      sc('your account works for all apps & games!') + '\n' +
      sc('join a lobby with /join XXXX in a game group!')
    ))
  }

  if (profile.activeTask) {
    return completeTaskAnswer({ sock, sender, args, reply, profile })
  }
}

// ══════════════════════════════════════════════════════
//  /task (DM)
// ══════════════════════════════════════════════════════
async function handleTaskCmd({ sock, sender, args, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile?.username)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('register first — dm the bot /start')))

  // App must be installed and open
  if (!(await requireAppOpen(sender, reply))) return

  const code = profile.activeRoom
  if (!code) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in an active game')))

  const room = await getRoom(code)
  if (!room || room.status !== 'playing') {
    await setPlayerProfile(sender, { ...profile, activeRoom: null, activeTask: null })
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('that game has ended')))
  }

  const player = room.players.find(p => p.jid === sender)
  if (!player)       return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in this game')))
  if (!player.alive) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are dead — rest in peace 💀')))

  // Impostors see their fake task list but can't actually do anything
  if (player.role === 'IMPOSTOR') {
    const fakes = player.fakeTasks || []
    const list = fakes.map((t, i) => `⚘ ${i + 1}. ⬜ ${t}`).join('\n')
    return reply(fmt('📋 ʏᴏᴜʀ ᴛᴀsᴋs',
      list + '\n\n' +
      sc('complete tasks in the group to progress.') + '\n' +
      sc('use /task [number] in the group to work on a task.')
    ))
  }

  const sub = args[0]?.toLowerCase()

  if (!sub) {
    const list = player.tasks.map((t, i) => {
      const done = player.taskProgress?.[t.id]
      return `⚘ ${i + 1}. ${done ? '✅' : '⬜'} ${t.name}`
    }).join('\n')
    return reply(fmt('📋 ʏᴏᴜʀ ᴛᴀsᴋs',
      list + '\n\n' + sc('start a task: /task [number]') + '\n' + sc('confirm tag task: /task confirm')
    ))
  }

  if (sub === 'confirm') {
    if (!profile.activeTask)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('open a task first with /task [number]')))
    const task = ALL_TASKS.find(t => t.id === profile.activeTask)
    if (!task) {
      await setPlayerProfile(sender, { ...profile, activeTask: null })
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('task not found — try /task again')))
    }
    if (task.type !== 'tag4')
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('/task confirm is only for the tag 4 task')))
    // Re-fetch room to check halted state
    const freshRoom = await getRoom(code)
    if (freshRoom?.taskingHalted)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('tasks halted'), '⛔ a body was found — wait for the meeting to conclude')))
    await markTaskDone({ sock, sender, taskId: task.id, player, room: freshRoom, reply, profile })
    return
  }

  const n = parseInt(sub)
  if (isNaN(n) || n < 1 || n > player.tasks.length)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), `pick a number between 1 and ${player.tasks.length}`)))

  const task = player.tasks[n - 1]
  if (player.taskProgress?.[task.id])
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', `${field(sc('task'), task.name)}\n${field(sc('status'), '✅ already completed!')}`))

  await setPlayerProfile(sender, { ...profile, activeTask: task.id })
  return reply(fmt('📋 ' + sc(task.name),
    `${field(sc('task'), task.desc)}\\n\\n` +
    sc('⚠️ go to the game group and type:') + '\n' +
    `⚘ */task ${n}*\n\n` +
    sc('you must answer there, not here in dm!')
  ))
}

async function completeTaskAnswer({ sock, sender, args, reply, profile }) {
  const task = ALL_TASKS.find(t => t.id === profile.activeTask)
  if (!task) { await setPlayerProfile(sender, { ...profile, activeTask: null }); return }
  if (task.type === 'tag4')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('tag 4 players in the group first, then: /task confirm')))

  // Block answers during meeting/halt
  const room = await getRoom(profile.activeRoom)
  if (room?.taskingHalted)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('tasks halted'), '⛔ a body was found — wait for the meeting to conclude')))

  const answer  = args.join(' ').trim().toLowerCase()
  const correct = task.answer.toLowerCase()
  if (answer !== correct)
    return reply(fmt('❌ ᴡʀᴏɴɢ ᴀɴsᴡᴇʀ', sc('try again!') + '\n' + field(sc('hint'), task.desc)))

  if (!room) {
    await setPlayerProfile(sender, { ...profile, activeRoom: null, activeTask: null })
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('game not found — it may have ended')))
  }
  const player = room.players.find(p => p.jid === sender)
  if (!player) return
  await markTaskDone({ sock, sender, taskId: task.id, player, room, reply, profile })
}

async function markTaskDone({ sock, sender, taskId, player, room, reply, profile }) {
  player.taskProgress         = player.taskProgress || {}
  player.taskProgress[taskId] = true
  player.tasksCompleted       = Object.values(player.taskProgress).filter(Boolean).length
  const task = ALL_TASKS.find(t => t.id === taskId)
  await setRoom(room.code, room)
  await setPlayerProfile(sender, { ...profile, activeTask: null, lastTaskAt: null })
  await sock.sendMessage(room.groupJid, {
    text: fmt('✅ ᴛᴀsᴋ ᴄᴏᴍᴘʟᴇᴛᴇᴅ',
      `${field(sc('player'), '@' + jnum(sender))}\n` +
      `${field(sc('task'), task.name)}\n` +
      `${field(sc('progress'), player.tasksCompleted + '/' + player.tasks.length)}`
    ),
    mentions: [sender]
  }).catch(() => {})
  await reply(fmt('✅ ᴄᴏʀʀᴇᴄᴛ!',
    `${field(sc('task'), task.name)}\n` +
    `${field(sc('progress'), player.tasksCompleted + '/' + player.tasks.length)}\n\n` +
    (player.tasksCompleted < player.tasks.length
      ? sc('keep going! type /task to see your list')
      : sc('all tasks done! great work crew!'))
  ))
  const win = checkWin(room)
  if (win) await endGame(sock, room.groupJid, room, win)
}

// ══════════════════════════════════════════════════════
//  /setname
// ══════════════════════════════════════════════════════
async function handleSetname({ sender, args, reply }) {
  const name = args.join(' ').trim().slice(0, 20)
  if (!name || name.length < 2)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('usage'), '/setname YourName (letters only, min 2)')))
  if (!isValidUsername(name))
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'letters only — no numbers or symbols')))
  const profile = await getPlayerProfile(sender)
  if (!profile?.username)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not registered. dm the bot /start first')))
  await setPlayerProfile(sender, { ...profile, username: name })
  return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('username updated to'), name)))
}

// ══════════════════════════════════════════════════════
//  /setcolor
// ══════════════════════════════════════════════════════
async function handleSetcolor({ sock, sender, args, reply }) {
  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('register first — dm the bot /start')))

  const sub = args[0]?.toLowerCase()

  if (!sub) {
    const list = GAME_COLORS.map((c, i) => `${i + 1}. ${c.emoji} ${c.name}`).join('\n')
    return reply(fmt('🎨 ᴄʜᴀɴɢᴇ ᴘʀᴏꜰɪʟᴇ ᴄᴏʟᴏᴜʀ',
      `${field(sc('current'), (profile.color?.emoji || '⬜') + ' ' + (profile.color?.name || 'none'))}\n\n` +
      sc('pick a new colour:') + '\n' + list + '\n\n' +
      sc('reply with the number (1-15)')
    ))
  }

  const pick = parseInt(sub)
  if (!isNaN(pick) && pick >= 1 && pick <= GAME_COLORS.length) {
    const color = GAME_COLORS[pick - 1]
    await setPlayerProfile(sender, { ...profile, color })
    return reply(fmt('🎨 ᴄᴏʟᴏᴜʀ ᴜᴘᴅᴀᴛᴇᴅ',
      `${field(sc('new colour'), color.emoji + ' ' + color.name)}\n` +
      sc('this will show on your profile card')
    ))
  }

  const byName = GAME_COLORS.find(c => c.name.toLowerCase() === sub)
  if (byName) {
    await setPlayerProfile(sender, { ...profile, color: byName })
    return reply(fmt('🎨 ᴄᴏʟᴏᴜʀ ᴜᴘᴅᴀᴛᴇᴅ',
      `${field(sc('new colour'), byName.emoji + ' ' + byName.name)}\n` +
      sc('this will show on your profile card')
    ))
  }

  return reply(fmt('ᴀᴍᴏɴɢ ᴜs',
    `${field(sc('error'), 'colour not found')}\n` +
    sc('use /setcolor to see the full list')
  ))
}

// ══════════════════════════════════════════════════════
//  /profile
// ══════════════════════════════════════════════════════
async function handleProfile({ sock, msg, chat, sender, mentions, reply, isGroup }) {
  const target  = mentions?.[0] || sender
  const profile = await getPlayerProfile(target)
  if (!profile?.username)
    return reply(fmt('🎮 ɢᴀᴍᴇʙᴏᴛ', field(sc('error'), 'that player is not registered')))

  const ph      = profile.phone ? (await import('../../lib/phone-middleware.js')).getPhone(profile.phone.id) : null
  const battery = profile.phone?.battery ?? 100
  const { batteryBar } = await import('../../lib/phone-middleware.js')

  const body = fmt(`${profile.color?.emoji || '⬜'} ${profile.username}`,
    `${field(sc('color'),       (profile.color?.emoji || '') + ' ' + (profile.color?.name || ''))}\n` +
    `${field(sc('wallet'),      '$' + (profile.wallet || 0))}\n` +
    `${field(sc('games played'),profile.gamesPlayed || 0)}\n` +
    `${field(sc('games won'),   profile.gamesWon || 0)}\n` +
    `${field(sc('total earned'),'$' + (profile.totalEarned || 0))}\n` +
    (ph ? `${field(sc('phone'), ph.emoji + ' ' + ph.name)}\n${field(sc('battery'), batteryBar(battery))}` : '')
  )
  if (isGroup) return sock.sendMessage(chat, { text: body, mentions: [target] }, { quoted: msg })
  return reply(body)
}

// ══════════════════════════════════════════════════════
//  /leaderboard
// ══════════════════════════════════════════════════════
async function handleLeaderboard({ reply }) {
  let profiles = []
  try { profiles = await getAllProfiles() } catch {}
  if (!profiles.length)
    return reply(fmt('🏆 ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ', sc('no players registered yet')))

  profiles.sort((a, b) => (b.wallet || 0) - (a.wallet || 0))
  const top    = profiles.slice(0, 10)
  const medals = ['🥇', '🥈', '🥉']
  const lines  = top.map((p, i) => {
    const medal = medals[i] || `${i + 1}.`
    return `${medal} ${p.username} — $${p.wallet || 0} | ${p.gamesWon || 0}W / ${p.gamesPlayed || 0}G`
  }).join('\n')

  return reply(fmt('🏆 ᴛᴏᴘ ᴘʟᴀʏᴇʀs',
    lines + '\n\n' + sc('ranked by wallet balance')
  ))
}

// ══════════════════════════════════════════════════════
//  /create
// ══════════════════════════════════════════════════════
async function handleCreate({ sock, msg, chat, sender, args, reply, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only admins can create a room')))
  if (!(await requireAppOpen(sender, reply))) return

  const creatorProfile = await getPlayerProfile(sender)
  const rooms    = await getRooms()
  const existing = Object.values(rooms).find(r => r.groupJid === chat && r.status !== 'ended')
  if (existing)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs',
      `${field(sc('error'), 'a lobby already exists in this group')}\n` +
      `${field(sc('code'), existing.code)}\n${field(sc('status'), existing.status)}\n\n` +
      sc('use /endgame to close it first')
    ))

  let code = args[0]?.toUpperCase().slice(0, 4) || genCode()
  if (!/^[A-Z0-9]{4}$/.test(code))
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'code must be 4 letters/numbers e.g. LSJE')))
  while (rooms[code] && rooms[code].status !== 'ended') code = genCode()

  const room = {
    code, groupJid: chat, creator: sender, players: [],
    status: 'waiting', settings: { impostorCount: 1, detectiveEnabled: false },
    meetingActive: false, votes: {}, createdAt: Date.now(), gameStartedAt: null,
    taskingHalted: false,
  }

  const creatorLobbyColor = GAME_COLORS[0]
  room.players.push({
    jid: sender, username: creatorProfile.username,
    pfpColor:   creatorProfile.color,
    lobbyColor: creatorLobbyColor,
    role: null, alive: true, tasks: [], tasksCompleted: 0,
    meetingsCalled: 0, taskProgress: {}, lastKill: null, lastTaskAt: null,
  })
  await setPlayerProfile(sender, { ...creatorProfile, activeRoom: null })
  await setRoom(code, room)

  setTimeout(async () => {
    try {
      const r = await getRoom(code)
      if (!r || r.status !== 'waiting') return
      if (r.players.length < 4) {
        await deleteRoom(code)
        sock.sendMessage(chat, { text: fmt('⏱ ʟᴏʙʙʏ ᴛɪᴍᴇᴅ ᴏᴜᴛ',
          `${field(sc('room'), code)}\n${field(sc('reason'), 'not enough players joined in 5 minutes')}`
        )}).catch(() => {})
      }
    } catch (err) { console.error('[lobby timeout]', err.message) }
  }, 5 * 60 * 1000)

  let meta
  try { meta = await sock.groupMetadata(chat) } catch {}
  const members  = meta?.participants || []
  const mJids    = members.map(p => p.id)
  const tagLines = members.map(p => `⚘ @${jnum(p.id)}`).join('\n')

  return sock.sendMessage(chat, {
    text: fmt('🚀 ɴᴇᴡ ʟᴏʙʙʏ ᴏᴘᴇɴᴇᴅ!',
      `${field(sc('room code'), '🔑 ' + code)}\n${field(sc('host'), '@' + jnum(sender))}\n` +
      `${field(sc('players'), '1 / 15')} ← ${sc('host already joined')}\n${field(sc('min to start'), '4 players')}\n` +
      `${field(sc('lobby closes in'), '5 minutes if under 4 players')}\n\n` +
      sc('join with: /join ' + code) + '\n\n' + sc('attention:') + '\n' + tagLines
    ),
    mentions: [sender, ...mJids]
  }, { quoted: msg })
}

// ══════════════════════════════════════════════════════
//  /join
// ══════════════════════════════════════════════════════
async function handleJoin({ sock, msg, chat, sender, args, reply }) {
  const code = args[0]?.toUpperCase()
  if (!code) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('usage'), '/join XXXX')))
  const profile = await getPlayerProfile(sender)
  if (!profile?.username || profile.step)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', `${field(sc('error'), 'you are not registered!')}\n${sc('dm the bot /start to register first')}`))
  if (!(await requireAppOpen(sender, reply))) return

  const room = await getRoom(code)
  if (!room)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no room found with code ' + code)))
  if (room.groupJid !== chat)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'that room belongs to a different group')))
  if (room.status !== 'waiting')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'that room is not open for joining')))
  if (room.players.find(p => p.jid === sender))
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are already in this lobby')))
  if (room.players.length >= 15)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'lobby is full (max 15)')))

  const usedLobbyColors = room.players.map(p => p.lobbyColor?.name).filter(Boolean)
  const availableColors = GAME_COLORS.filter(c => !usedLobbyColors.includes(c.name))
  const lobbyColor = availableColors[0] || GAME_COLORS[room.players.length % GAME_COLORS.length]

  room.players.push({
    jid: sender, username: profile.username,
    pfpColor:   profile.color,
    lobbyColor,
    role: null, alive: true, tasks: [], tasksCompleted: 0,
    meetingsCalled: 0, taskProgress: {}, lastKill: null, lastTaskAt: null,
  })
  await setRoom(code, room)

  if (profile.phone && !profile.phone.gamingStartedAt) {
    profile.phone.gamingStartedAt = Date.now()
    await setPlayerProfile(sender, { ...profile })
  }

  const count = room.players.length
  const list  = room.players.map(p => `⚘ ${(p.lobbyColor || p.pfpColor || p.color)?.emoji || '⬜'} ${p.username}`).join('\n')
  return sock.sendMessage(chat, {
    text: fmt('🚀 ᴘʟᴀʏᴇʀ ᴊᴏɪɴᴇᴅ',
      `${field(sc('player'), lobbyColor.emoji + ' ' + profile.username)}\n` +
      `${field(sc('room'), code)}\n${field(sc('lobby'), count + ' / 15')}\n\n` +
      sc('players:') + '\n' + list + '\n\n' +
      (count >= 4 ? '✅ ' + sc('enough players! host can /gamestart ' + code) : '⌛ ' + sc('waiting for more players...'))
    ),
    mentions: [sender]
  }, { quoted: msg })
}

// ══════════════════════════════════════════════════════
//  /roomsettings
// ══════════════════════════════════════════════════════
async function handleRoomSettings({ chat, sender, args, reply, isAdmin, isOwner }) {
  const code = args[0]?.toUpperCase()
  if (!code) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('usage'), '/roomsettings XXXX [option] [value]')))
  const room = await getRoom(code)
  if (!room || room.groupJid !== chat)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'room not found in this group')))
  if (room.creator !== sender && !isAdmin && !isOwner)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only the room creator or an admin can change settings')))
  if (room.status !== 'waiting')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'game already started — settings locked')))

  const opt = args[1]?.toLowerCase()
  const val = args[2]?.toLowerCase()

  if (!opt) {
    const maxImp = maxImpostors(Math.max(room.players.length, 4))
    return reply(fmt('⚙️ ʀᴏᴏᴍ sᴇᴛᴛɪɴɢs — ' + code,
      `${field(sc('impostors'), room.settings.impostorCount + ' (max: ' + maxImp + ')')}\n` +
      `${field(sc('detective role'), room.settings.detectiveEnabled ? 'on ✅' : 'off ❌')}\n\n` +
      sc('to change:') + `\n⚘ /roomsettings ${code} impostors [1-3]\n⚘ /roomsettings ${code} detective [on/off]`
    ))
  }
  if (opt === 'impostors') {
    const n   = parseInt(val)
    const max = maxImpostors(Math.max(room.players.length, 4))
    if (isNaN(n) || n < 1 || n > max)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'impostors must be 1-' + max)))
    room.settings.impostorCount = n
    await setRoom(code, room)
    return reply(fmt('⚙️ ᴜᴘᴅᴀᴛᴇᴅ', field(sc('impostors set to'), n)))
  }
  if (opt === 'detective') {
    room.settings.detectiveEnabled = val === 'on'
    await setRoom(code, room)
    return reply(fmt('⚙️ ᴜᴘᴅᴀᴛᴇᴅ', field(sc('detective role'), val === 'on' ? 'enabled ✅' : 'disabled ❌')))
  }
  return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('unknown option'), opt + ' — try impostors or detective')))
}

// ══════════════════════════════════════════════════════
//  /gamestart
// ══════════════════════════════════════════════════════
async function handleGameStart({ sock, msg, chat, sender, args, reply, isAdmin, isOwner }) {
  const code = args[0]?.toUpperCase()
  if (!code) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('usage'), '/gamestart XXXX')))
  const room = await getRoom(code)
  if (!room || room.groupJid !== chat)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'room not found in this group')))
  if (room.creator !== sender && !isAdmin && !isOwner)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only the room creator can start the game')))
  if (room.status !== 'waiting')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'game already started or ended')))
  if (room.players.length < 4)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'need at least 4 players — have ' + room.players.length)))

  const shuffled   = shuffle(room.players)
  const autoImpCount = maxImpostors(room.players.length)
  const impCount   = Math.min(
    Math.max(room.settings.impostorCount, autoImpCount),
    maxImpostors(room.players.length)
  )
  room.settings.impostorCount = impCount
  let detectiveSet = false

  for (let i = 0; i < shuffled.length; i++) {
    if (i < impCount) { shuffled[i].role = 'IMPOSTOR'; shuffled[i].lastKill = null }
    else if (room.settings.detectiveEnabled && !detectiveSet) { shuffled[i].role = 'DETECTIVE'; detectiveSet = true }
    else { shuffled[i].role = 'CREWMATE' }
  }
  for (const p of room.players) {
    if (p.role !== 'IMPOSTOR') {
      p.tasks = pickTasks(4); p.taskProgress = {}; p.tasksCompleted = 0; p.lastTaskAt = null
    } else {
      // Impostors get a fake task list for blending in — not completable
      p.fakeTasks = pickFakeTasks(4)
    }
  }

  room.status = 'playing'
  room.gameStartedAt = Date.now()
  room.taskingHalted = false
  await setRoom(code, room)

  const totalTasks = room.players.filter(p => p.role !== 'IMPOSTOR').reduce((a, p) => a + p.tasks.length, 0)

  await sock.sendMessage(chat, {
    text: fmt('🚀 ɢᴀᴍᴇ sᴛᴀʀᴛᴇᴅ! — ' + code,
      `${field(sc('players'), room.players.length)}\n${field(sc('impostors'), impCount + ' (secret)')}\n` +
      `${field(sc('total tasks'), totalTasks)}\n\n` +
      sc('check your dms for your role!') + '\n\n' + sc('players:') + '\n' +
      room.players.map(p => `⚘ ${(p.lobbyColor || p.color)?.emoji || '⬜'} @${jnum(p.jid)}`).join('\n')
    ),
    mentions: room.players.map(p => p.jid)
  }, { quoted: msg })

  for (const p of room.players) {
    const role = ROLES[p.role]
    const pLobbyColor = p.lobbyColor || p.color
    let dm = fmt('🚀 ʏᴏᴜʀ ʀᴏʟᴇ — ' + code,
      `${field(sc('room'), code)}\n${field(sc('role'), role.emoji + ' ' + role.name)}\n` +
      `${field(sc('lobby colour'), (pLobbyColor?.emoji || '⬜') + ' ' + (pLobbyColor?.name || ''))}\n\n`
    )
    if (p.role === 'IMPOSTOR') {
      const teammates = room.players.filter(x => x.role === 'IMPOSTOR' && x.jid !== p.jid)
      dm += sc('your mission: eliminate all crewmates!') + '\n' +
        sc('kill in group: /kill [colour]  e.g. /kill Red') + '\n' +
        sc('kill in dm: /kill [colour]  (same command works here!)') + '\n' +
        sc('kill cooldown: 20 seconds') + '\n' +
        sc('blend in: use /faketask in group — shows a fake task completion like crew') + '\n' +
        sc('view your fake task list: /task (in dm)') + '\n' +
        sc('full player intel: /lobby (in dm)') + '\n\n' +
        (teammates.length
          ? sc('fellow impostors:') + '\n' + teammates.map(t => `⚘ ${(t.lobbyColor || t.color)?.emoji} ${t.username}`).join('\n')
          : sc('you are the only impostor — stay low!'))
    } else {
      dm += (p.role === 'DETECTIVE' ? sc('special role: detective! find the impostor!') + '\n\n' : sc('complete all your tasks to win!') + '\n\n') +
        sc('your tasks:') + '\n' + p.tasks.map((t, i) => `⚘ ${i + 1}. ${t.name}`).join('\n') + '\n\n' +
        sc('step 1: dm /task to see task details') + '\n' +
        sc('step 2: go to the group and type /task [number] [answer]') + '\n' +
        sc('view task list anytime: dm /task')
    }
    const profile = await getPlayerProfile(p.jid)
    await setPlayerProfile(p.jid, { ...profile, activeRoom: code, activeTask: null, lastTaskAt: null })
    await sleep(1500 + Math.random() * 500)
    await sock.sendMessage(p.jid, { text: dm }).catch(() => {})
    await sleep(1000)
  }
}

// ══════════════════════════════════════════════════════
//  /kill (group)
// ══════════════════════════════════════════════════════
async function handleKill({ sock, chat, sender, args, mentions, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const room = await findActiveRoom(chat)
  if (!room) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no active game in this group')))

  const attacker = room.players.find(p => p.jid === sender)
  if (!attacker)                    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are not in this game')))
  if (attacker.role !== 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only impostors can kill')))
  if (!attacker.alive)              return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are already dead')))

  // Block kills during an active meeting
  if (room.meetingActive)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill during a meeting!')))

  if (attacker.lastKill) {
    const elapsed = Date.now() - attacker.lastKill
    if (elapsed < KILL_COOLDOWN_MS) {
      const remaining = Math.ceil((KILL_COOLDOWN_MS - elapsed) / 1000)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('cooldown'), `wait ${remaining}s before your next kill`)))
    }
  }

  const colorInput = args[0]?.replace(/^@/, '').toLowerCase()
  let target = colorInput
    ? room.players.find(p => (p.lobbyColor || p.color)?.name?.toLowerCase() === colorInput)
    : null
  if (!target && mentions?.[0]) target = room.players.find(p => p.jid === mentions[0])
  if (!target) return reply(fmt('ᴀᴍᴏɴɢ ᴜs',
    `${field(sc('usage'), '/kill [colour]  e.g. /kill Red')}\n` +
    sc('use the lobby colour shown next to each player')
  ))
  if (!target.alive)              return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'that player is already dead')))
  if (target.jid === sender)      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill yourself')))
  if (target.role === 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill a fellow impostor!')))

  target.alive      = false
  attacker.lastKill = Date.now()

  // Halt all tasks — a body was found, meeting must happen before tasks resume
  room.taskingHalted = true

  await setRoom(room.code, room)

  // Abort any active tasks for all alive players
  await abortActiveTasks(room)

  await sock.sendMessage(chat, {
    text: fmt('💀 ʙᴏᴅʏ ꜰᴏᴜɴᴅ!',
      `${field(sc('victim'), ((target.lobbyColor || target.color)?.emoji || '') + ' ' + target.username)}\n` +
      `${field(sc('status'), 'eliminated 💀')}\n\n` +
      sc('⚠️ all tasks are halted — call /meeting to discuss!')
    ),
    mentions: [target.jid]
  })
  await sock.sendMessage(target.jid, {
    text: fmt('💀 ʏᴏᴜ ᴡᴇʀᴇ ᴋɪʟʟᴇᴅ',
      `${field(sc('room'), room.code)}\n` + sc('an impostor got you. you can still watch!')
    )
  }).catch(() => {})

  const win = checkWin(room)
  if (win) await endGame(sock, chat, room, win)
}

// ══════════════════════════════════════════════════════
//  /kill (DM)
// ══════════════════════════════════════════════════════
async function handleKillDM({ sock, sender, args, mentions, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const profile = await getPlayerProfile(sender)
  if (!profile?.activeRoom)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in an active game')))

  const room = await getRoom(profile.activeRoom)
  if (!room || room.status !== 'playing')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('your game has ended or not started')))

  const attacker = room.players.find(p => p.jid === sender)
  if (!attacker)                    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are not in this game')))
  if (attacker.role !== 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only impostors can kill')))
  if (!attacker.alive)              return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are already dead')))

  if (room.meetingActive)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill during a meeting!')))

  if (attacker.lastKill) {
    const elapsed = Date.now() - attacker.lastKill
    if (elapsed < KILL_COOLDOWN_MS) {
      const remaining = Math.ceil((KILL_COOLDOWN_MS - elapsed) / 1000)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('cooldown'), `wait ${remaining}s before your next kill`)))
    }
  }

  const colorInput = args[0]?.replace(/^@/, '').toLowerCase()
  let target = colorInput
    ? room.players.find(p => (p.lobbyColor || p.color)?.name?.toLowerCase() === colorInput)
    : null
  if (!target && mentions?.[0]) target = room.players.find(p => p.jid === mentions[0])
  if (!target) return reply(fmt('ᴀᴍᴏɴɢ ᴜs',
    `${field(sc('usage'), '/kill [colour]  e.g. /kill Red')}\n` +
    sc('use the lobby colour shown next to each player')
  ))
  if (!target.alive)              return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'that player is already dead')))
  if (target.jid === sender)      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill yourself')))
  if (target.role === 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you cannot kill a fellow impostor!')))

  target.alive      = false
  attacker.lastKill = Date.now()
  room.taskingHalted = true
  await setRoom(room.code, room)

  await abortActiveTasks(room)

  await sock.sendMessage(room.groupJid, {
    text: fmt('💀 ʙᴏᴅʏ ꜰᴏᴜɴᴅ!',
      `${field(sc('victim'), ((target.lobbyColor || target.color)?.emoji || '') + ' ' + target.username)}\n` +
      `${field(sc('status'), 'eliminated 💀')}\n\n` +
      sc('⚠️ all tasks are halted — call /meeting to discuss!')
    ),
    mentions: [target.jid]
  }).catch(() => {})

  await reply(fmt('🔴 ᴋɪʟʟ ᴄᴏɴꜰɪʀᴍᴇᴅ',
    `${field(sc('eliminated'), ((target.lobbyColor || target.color)?.emoji || '') + ' ' + target.username)}\n` +
    sc('body reported in group. stay low!')
  ))

  await sock.sendMessage(target.jid, {
    text: fmt('💀 ʏᴏᴜ ᴡᴇʀᴇ ᴋɪʟʟᴇᴅ',
      `${field(sc('room'), room.code)}\n` + sc('an impostor got you. you can still watch!')
    )
  }).catch(() => {})

  const win = checkWin(room)
  if (win) await endGame(sock, room.groupJid, room, win)
}

// ── Abort active tasks for all players in room ─────────
// Called when a kill happens so no one can sneak in a task completion mid-body.
async function abortActiveTasks(room) {
  for (const p of room.players) {
    if (!p.alive) continue
    try {
      const profile = await getPlayerProfile(p.jid)
      if (profile?.activeTask) {
        await setPlayerProfile(p.jid, { ...profile, activeTask: null })
      }
    } catch {}
  }
}

// ══════════════════════════════════════════════════════
//  /task [number] in GROUP
// ══════════════════════════════════════════════════════
async function handleTaskGroup({ sock, chat, sender, args, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const profile = await getPlayerProfile(sender)
  if (!profile?.username)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('register first — dm the bot /start')))

  const code = profile.activeRoom
  if (!code) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in an active game')))

  const room = await getRoom(code)
  if (!room || room.status !== 'playing' || room.groupJid !== chat) {
    await setPlayerProfile(sender, { ...profile, activeRoom: null, activeTask: null })
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('that game has ended or this is the wrong group')))
  }

  const player = room.players.find(p => p.jid === sender)
  if (!player)       return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in this game')))
  if (!player.alive) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are dead — rest in peace 💀')))

  // Block tasks while halted (body found, meeting pending)
  if (room.taskingHalted)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('tasks halted'), '⛔ a body was found — call /meeting before tasks can resume')))

  // Block tasks during an active meeting
  if (room.meetingActive)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('tasks halted'), '⛔ meeting in progress — wait until it concludes')))

  // Impostors using /task in group see their fake task list (no completions possible)
  if (player.role === 'IMPOSTOR') {
    const fakes = player.fakeTasks || []
    const list = fakes.map((t, i) => `⚘ ${i + 1}. ⬜ ${t}`).join('\n')
    return reply(fmt('📋 ʏᴏᴜʀ ᴛᴀsᴋs',
      list + '\n\n' + sc('complete tasks to progress.')
    ))
  }

  const sub = args[0]?.toLowerCase()

  if (!sub) {
    const list = player.tasks.map((t, i) => {
      const done = player.taskProgress?.[t.id]
      return `⚘ ${i + 1}. ${done ? '✅' : '⬜'} ${t.name}`
    }).join('\n')
    return reply(fmt('📋 ʏᴏᴜʀ ᴛᴀsᴋs',
      list + '\n\n' +
      sc('dm the bot /task to see details') + '\n' +
      sc('then come back here and type /task [number] [answer]')
    ))
  }

  if (sub === 'confirm') {
    if (!profile.activeTask)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('open a task in dm first with /task [number]')))
    const task = ALL_TASKS.find(t => t.id === profile.activeTask)
    if (!task || task.type !== 'tag4') {
      await setPlayerProfile(sender, { ...profile, activeTask: null })
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('/task confirm is only for the tag 4 task')))
    }
    await markTaskDone({ sock, sender, taskId: task.id, player, room, reply, profile })
    return
  }

  const n = parseInt(sub)
  if (isNaN(n) || n < 1 || n > player.tasks.length)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), `pick a number between 1 and ${player.tasks.length}`)))

  const task = player.tasks[n - 1]
  if (player.taskProgress?.[task.id])
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', `${field(sc('task'), task.name)}\n${field(sc('status'), '✅ already completed!')}`))

  // Task cooldown — 5 seconds between starting tasks
  if (player.lastTaskAt) {
    const elapsed = Date.now() - player.lastTaskAt
    if (elapsed < TASK_COOLDOWN_MS) {
      const remaining = Math.ceil((TASK_COOLDOWN_MS - elapsed) / 1000)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('cooldown'), `wait ${remaining}s before starting another task`)))
    }
  }

  const answer = args.slice(1).join(' ').trim().toLowerCase()
  if (!answer) {
    player.lastTaskAt = Date.now()
    await setRoom(room.code, room)
    await setPlayerProfile(sender, { ...profile, activeTask: task.id })
    return reply(fmt('📋 ' + sc(task.name),
      `${field(sc('task'), task.desc)}\n\n` +
      (task.type === 'tag4'
        ? sc('tag 4 players in this group, then type: /task confirm')
        : sc('answer here: /task ' + n + ' [your answer]'))
    ))
  }

  if (task.type === 'tag4')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('tag 4 players in this group, then type: /task confirm')))

  const correct = task.answer.toLowerCase()
  if (answer !== correct)
    return reply(fmt('❌ ᴡʀᴏɴɢ ᴀɴsᴡᴇʀ', sc('try again!') + '\n' + field(sc('hint'), task.desc)))

  player.lastTaskAt = Date.now()
  await setRoom(room.code, room)
  await setPlayerProfile(sender, { ...profile, activeTask: task.id })
  await markTaskDone({ sock, sender, taskId: task.id, player, room, reply, profile })
}

// ══════════════════════════════════════════════════════
//  /faketask (impostors only — group)
// ══════════════════════════════════════════════════════
async function handleFakeTask({ sock, chat, sender, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const room = await findActiveRoom(chat)
  if (!room) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no active game')))
  const player = room.players.find(p => p.jid === sender)
  if (!player)                    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are not in this game')))
  if (!player.alive)              return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you are dead')))
  if (player.role !== 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only impostors can use /faketask')))

  // Block during meeting or halted (to avoid flooding group with fake completions mid-crisis)
  if (room.meetingActive || room.taskingHalted)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'cannot fake a task right now — meeting or body pending')))

  // Pick a fake task from the impostor's assigned fake list, cycling through them
  const fakes = player.fakeTasks || FAKE_TASK_NAMES.slice(0, 4)
  const idx   = (player.fakeTaskIdx || 0) % fakes.length
  const t     = fakes[idx]
  player.fakeTaskIdx = (idx + 1) % fakes.length
  await setRoom(room.code, room)

  return sock.sendMessage(chat, {
    text: fmt('✅ ᴛᴀsᴋ ᴄᴏᴍᴘʟᴇᴛᴇᴅ',
      `${field(sc('player'), '@' + jnum(sender))}\n${field(sc('task'), t)}`
    ),
    mentions: [sender]
  })
}

// ══════════════════════════════════════════════════════
//  /meeting
// ══════════════════════════════════════════════════════
async function handleMeeting({ sock, msg, chat, sender, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const room = await findActiveRoom(chat)
  if (!room) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no active game')))
  if (room.meetingActive) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'a meeting is already in progress!')))
  const caller = room.players.find(p => p.jid === sender && p.alive)
  if (!caller) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you must be alive to call a meeting')))
  caller.meetingsCalled = (caller.meetingsCalled || 0) + 1
  if (caller.meetingsCalled > 2) {
    caller.meetingsCalled = 2
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you have no meeting calls left (limit: 2 per game)')))
  }
  room.meetingActive    = true
  room.meetingStartedAt = Date.now()
  room.votes            = {}
  // Tasking is halted during the meeting (if not already halted)
  room.taskingHalted    = true
  await setRoom(room.code, room)

  const alive    = room.players.filter(p => p.alive)
  const voteList = alive.map((p, i) =>
    `⚘ ${i + 1}. ${(p.lobbyColor || p.color)?.emoji || '⬜'} ${p.username} — @${jnum(p.jid)}`
  ).join('\n')

  await sock.sendMessage(chat, {
    text: fmt('🚨 ᴇᴍᴇʀɢᴇɴᴄʏ ᴍᴇᴇᴛɪɴɢ!',
      `${field(sc('called by'), ((caller.lobbyColor || caller.color)?.emoji || '') + ' ' + caller.username)}\n` +
      `${field(sc('meetings left'), (2 - caller.meetingsCalled) + ' / 2')}\n\n` +
      sc('discuss! who is sus?') + '\n' +
      sc('vote: /vote [number] or /vote skip') + '\n\n' +
      sc('alive players:') + '\n' + voteList + '\n\n' +
      sc('voting closes in 40 seconds!')
    ),
    mentions: alive.map(p => p.jid)
  }, { quoted: msg })

  setTimeout(async () => {
    try {
      const r = await getRoom(room.code)
      if (!r || !r.meetingActive) return

      const tally = {}
      for (const vote of Object.values(r.votes || {})) {
        if (vote === 'skip') continue
        tally[vote] = (tally[vote] || 0) + 1
      }

      let ejected = null, topVotes = 0, tie = false
      for (const [jid, count] of Object.entries(tally)) {
        if (count > topVotes)        { ejected = jid; topVotes = count; tie = false }
        else if (count === topVotes) { tie = true }
      }

      r.meetingActive    = false
      r.meetingStartedAt = null
      r.votes            = {}
      // Resume tasking now that the meeting is concluded
      r.taskingHalted    = false

      if (!ejected || tie || topVotes === 0) {
        await setRoom(r.code, r)
        return sock.sendMessage(chat, {
          text: fmt('🗳️ ᴠᴏᴛɪɴɢ ᴄʟᴏsᴇᴅ',
            field(sc('result'), 'no consensus — nobody ejected') + '\n\n' +
            sc('✅ tasks have resumed!')
          )
        }).catch(() => {})
      }

      const target = r.players.find(p => p.jid === ejected)
      if (!target) { await setRoom(r.code, r); return }
      target.alive = false
      await setRoom(r.code, r)

      const isImp = target.role === 'IMPOSTOR'
      await sock.sendMessage(chat, {
        text: fmt('🗳️ ᴘʟᴀʏᴇʀ ᴇᴊᴇᴄᴛᴇᴅ!',
          `${field(sc('player'), ((target.lobbyColor || target.color)?.emoji || '') + ' ' + target.username)}\n` +
          `${field(sc('votes'), topVotes)}\n` +
          `${field(sc('was'), isImp ? '🔴 IMPOSTOR — great catch!' : '🟦 NOT the impostor... oops')}\n\n` +
          (isImp ? sc('nice work crew!') : sc('the impostors are still out there...')) + '\n\n' +
          sc('✅ tasks have resumed!')
        ),
        mentions: [target.jid]
      }).catch(() => {})

      const win = checkWin(r)
      if (win) await endGame(sock, chat, r, win)
    } catch (err) { console.error('[meeting vote close error]', err.message) }
  }, 40_000)
}

// ══════════════════════════════════════════════════════
//  /vote
// ══════════════════════════════════════════════════════
async function handleVote({ chat, sender, args, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const room = await findActiveRoom(chat)
  if (!room || !room.meetingActive)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no active meeting right now')))
  const voter = room.players.find(p => p.jid === sender && p.alive)
  if (!voter) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'only alive players can vote')))
  if (room.votes?.[sender]) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'you already voted!')))

  const raw = args[0]?.toLowerCase()
  if (raw === 'skip') {
    room.votes = room.votes || {}; room.votes[sender] = 'skip'
    await setRoom(room.code, room)
    return reply(fmt('🗳️ ᴠᴏᴛᴇ ᴄᴀsᴛ', field(sc('voted'), 'skip — no eject')))
  }

  const alive = room.players.filter(p => p.alive)
  const pick  = parseInt(raw)
  if (isNaN(pick) || pick < 1 || pick > alive.length)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'vote a number from 1 to ' + alive.length + ' or /vote skip')))

  room.votes = room.votes || {}; room.votes[sender] = alive[pick - 1].jid
  await setRoom(room.code, room)
  return reply(fmt('🗳️ ᴠᴏᴛᴇ ᴄᴀsᴛ',
    `${field(sc('voted for'), ((alive[pick - 1].lobbyColor || alive[pick - 1].color)?.emoji || '') + ' ' + alive[pick - 1].username)}\n` +
    sc('results in 40 seconds')
  ))
}

// ══════════════════════════════════════════════════════
//  /lobby (group — public view)
// ══════════════════════════════════════════════════════
async function handleLobby({ chat, args, reply }) {
  const code  = args[0]?.toUpperCase()
  const rooms = await getRooms()
  let room
  if (code) {
    room = rooms[code]
    if (!room || room.groupJid !== chat)
      return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'room not found in this group')))
  } else {
    room = Object.values(rooms).find(r => r.groupJid === chat && r.status !== 'ended')
    if (!room) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('no active lobby in this group')))
  }

  const list = room.players.map(p =>
    `⚘ ${(p.lobbyColor || p.color)?.emoji || '⬜'} ${p.username}${!p.alive ? ' 💀' : ''}`
  ).join('\n') || sc('no players yet')

  return reply(fmt('🚀 ʟᴏʙʙʏ — ' + room.code,
    `${field(sc('status'), room.status)}\n${field(sc('players'), room.players.length + ' / 15')}\n` +
    `${field(sc('impostors'), room.settings.impostorCount)}\n` +
    `${field(sc('detective'), room.settings.detectiveEnabled ? 'on ✅' : 'off ❌')}\n` +
    `${field(sc('tasking'), room.taskingHalted ? '⛔ halted' : room.meetingActive ? '⛔ meeting' : '✅ active')}\n\n` +
    sc('players:') + '\n' + list
  ))
}

// ══════════════════════════════════════════════════════
//  /lobby (DM — impostor intel only)
// ══════════════════════════════════════════════════════
async function handleImpostorDMLobby({ sender, reply }) {
  if (!(await requireAppOpen(sender, reply))) return
  const profile = await getPlayerProfile(sender)
  if (!profile?.activeRoom)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in an active game')))
  const room = await getRoom(profile.activeRoom)
  if (!room || room.status !== 'playing')
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('your game has ended or not started')))
  const player = room.players.find(p => p.jid === sender)
  if (!player)                    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('you are not in this game')))
  if (player.role !== 'IMPOSTOR') return reply(fmt('ᴀᴍᴏɴɢ ᴜs', sc('only impostors can view full lobby intel')))

  const impostors = room.players.filter(p => p.role === 'IMPOSTOR')
  const crew      = room.players.filter(p => p.role !== 'IMPOSTOR')

  const impLines  = impostors.map(p =>
    `🔴 ${(p.lobbyColor || p.color)?.emoji || '⬜'} ${p.username} ${p.alive ? '✅ alive' : '💀 dead'}`
  ).join('\n')
  const crewLines = crew.map(p =>
    `🟦 ${(p.lobbyColor || p.color)?.emoji || '⬜'} ${p.username} ${p.alive ? '✅ alive' : '💀 dead'} | tasks ${p.tasksCompleted || 0}/${p.tasks?.length || 4}`
  ).join('\n')

  return reply(fmt('🔴 ɪᴍᴘᴏsᴛᴏʀ ɪɴᴛᴇʟ — ' + room.code,
    sc('impostors:') + '\n' + impLines + '\n\n' +
    sc('crew:') + '\n' + crewLines
  ))
}

// ══════════════════════════════════════════════════════
//  /endgame
// ══════════════════════════════════════════════════════
async function handleEndGame({ sock, chat, sender, args, reply, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'admins only')))
  const code  = args[0]?.toUpperCase()
  const rooms = await getRooms()
  let room
  if (code) { room = rooms[code] }
  else { room = Object.values(rooms).find(r => r.groupJid === chat && r.status !== 'ended') }
  if (!room || room.groupJid !== chat)
    return reply(fmt('ᴀᴍᴏɴɢ ᴜs', field(sc('error'), 'no active room found in this group')))
  return endGame(sock, chat, room, { winner: 'ADMIN', reason: 'Game force-ended by admin.' })
}

// ══════════════════════════════════════════════════════
//  END GAME
// ══════════════════════════════════════════════════════
async function endGame(sock, chat, room, { winner, reason }) {
  room.status = 'ended'; room.meetingActive = false; room.taskingHalted = false
  await setRoom(room.code, room)

  const crewWin  = winner === 'CREW'
  const impWin   = winner === 'IMPOSTOR'
  const winEmoji = crewWin ? '🟦' : impWin ? '🔴' : '🏁'
  const winLabel = crewWin ? 'Crewmates Win!' : impWin ? 'Impostors Win!' : 'Game Ended'

  const reveal = room.players.map(p =>
    `⚘ ${(p.lobbyColor || p.color)?.emoji || '⬜'} ${p.username} — ${ROLES[p.role]?.emoji || ''} ${p.role} ${p.alive ? '✅' : '💀'}`
  ).join('\n')

  await sock.sendMessage(chat, {
    text: fmt(winEmoji + ' ' + sc(winLabel),
      `${field(sc('reason'), reason)}\n\n` +
      sc('final reveal:') + '\n' + reveal + '\n\n' + sc('thanks for playing!')
    ),
    mentions: room.players.map(p => p.jid)
  }).catch(() => {})

  const aliveCrew = room.players.filter(p => p.role !== 'IMPOSTOR' && p.alive).length

  for (const p of room.players) {
    try {
      const profile = await getPlayerProfile(p.jid)
      if (!profile?.username) continue

      const isImp    = p.role === 'IMPOSTOR'
      const teamWon  = (crewWin && !isImp) || (impWin && isImp)
      const didWin   = teamWon && p.alive

      let earn = 0
      if (winner === 'ADMIN') {
        earn = 0
      } else if (didWin) {
        if (isImp) {
          earn = randInt(50, 100)
        } else {
          const survivors = Math.max(aliveCrew, 1)
          const base = Math.round(80 - (survivors - 1) * 5)
          earn = Math.min(80, Math.max(40, base + randInt(-5, 5)))
        }
      } else if (!p.alive && teamWon) {
        earn = 30
      } else {
        earn = randInt(-10, 0)
      }

      const newWallet = Math.max(0, (profile.wallet || 0) + earn)
      const earnLabel = earn >= 0 ? '+$' + earn : '-$' + Math.abs(earn)
      const resultLabel = didWin
        ? '🏆 You Won!'
        : !p.alive && teamWon
          ? '💀 Eliminated — but your team won'
          : '💔 You Lost'

      await setPlayerProfile(p.jid, {
        ...profile,
        activeRoom:  null,
        activeTask:  null,
        lastTaskAt:  null,
        wallet:      newWallet,
        gamesPlayed: (profile.gamesPlayed || 0) + 1,
        gamesWon:    (profile.gamesWon    || 0) + (didWin ? 1 : 0),
        totalEarned: (profile.totalEarned || 0) + Math.max(0, earn),
        phone: profile.phone ? { ...profile.phone, gamingStartedAt: null } : undefined,
      })

      await sock.sendMessage(p.jid, {
        text: fmt('🏆 ɢᴀᴍᴇ ᴏᴠᴇʀ',
          `${field(sc('result'), resultLabel)}\n` +
          `${field(sc('payout'), earnLabel)}\n` +
          `${field(sc('wallet'), '$' + newWallet)}`
        )
      }).catch(() => {})
    } catch (err) { console.error('[endgame reward error]', err.message) }
  }

  await deleteRoom(room.code)
}

// ══════════════════════════════════════════════════════
//  DM message handler
// ══════════════════════════════════════════════════════
export async function handleDMMessage({ sock, chat, sender, text, reply }) {
  try {
    const profile = await getPlayerProfile(sender)
    if (!profile) return
    if (!profile.step && !profile.activeTask) return
    const args = text.trim().split(/\s+/)
    await handleDMReply({ sock, chat, sender, args, reply })
  } catch (err) { console.error('[among-us DM flow error]', err.message) }
}

// ══════════════════════════════════════════════════════
//  Utils
// ══════════════════════════════════════════════════════
async function findActiveRoom(groupJid) {
  try {
    const rooms = await getRooms()
    return Object.values(rooms).find(r => r.groupJid === groupJid && r.status === 'playing') || null
  } catch { return null }
}
