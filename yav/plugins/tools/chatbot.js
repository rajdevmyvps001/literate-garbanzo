// ═══════════════════════════════════════════════════════
//   🧛 CHATBOT — AI Chatbot Plugin
//   Vampire Diaries persona. Per-user DM toggle.
//   Group chatbot toggle (admin only).
//   Uses OpenAI GPT-3.5 (same key as config).
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep } from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile, getGroup, setGroup } from '../../lib/mongodb.js'

// ── Vampire Diaries system prompt ─────────────────────
const VAMPIRE_SYSTEM = `You are a mysterious vampire from the world of The Vampire Diaries. You are ancient, elegant, and slightly dangerous. You speak with wit, charm, and a hint of darkness. You refer to yourself occasionally as having lived for centuries. You drop subtle references to Mystic Falls, blood, immortality, and the vampire life — but you're also surprisingly helpful and warm to those you consider allies. Keep responses concise (2-5 sentences). Never break character. Never say you are an AI.`

// ── Persona map (future expansion) ─────────────────────
const PERSONAS = {
  vampire: VAMPIRE_SYSTEM,
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run({ sock, msg, cmd, args, chat, sender, reply, isGroup, isAdmin }) {
  const text = args.join(' ').trim()

  // ── /chatbot — user turns on chatbot for themselves (DM) ──
  if (cmd === 'chatbot') {
    const profile = await getPlayerProfile(sender)
    if (!profile?.username || profile.step)
      return reply(fmt('🧛 ᴄʜᴀᴛʙᴏᴛ', sc('register first — dm the bot /start')))

    const current = profile.chatbotOn || false
    const newVal  = !current
    await setPlayerProfile(sender, { ...profile, chatbotOn: newVal })

    return reply(fmt('🧛 ᴄʜᴀᴛʙᴏᴛ',
      `${field(sc('status'), newVal ? '✅ on' : '❌ off')}\\n` +
      (newVal
        ? sc('i am now awake. speak, and i shall answer.')
        : sc('i retreat to my slumber. farewell.'))
    ))
  }

  // ── /chatbotgc — group chatbot toggle (admin/mod only) ──
  if (cmd === 'chatbotgc') {
    if (!isGroup)
      return reply(fmt('🧛 ᴄʜᴀᴛʙᴏᴛ', sc('this command is for groups only')))
    if (!isAdmin)
      return reply(fmt('🧛 ᴄʜᴀᴛʙᴏᴛ', sc('only group admins can toggle the group chatbot')))

    const gs      = await getGroup(chat)
    const current = gs?.chatbotOn || false
    const newVal  = !current
    await setGroup(chat, { ...gs, chatbotOn: newVal })

    return reply(fmt('🧛 ɢʀᴏᴜᴘ ᴄʜᴀᴛʙᴏᴛ',
      `${field(sc('status'), newVal ? '✅ on for this group' : '❌ off for this group')}\\n` +
      (newVal
        ? sc('the vampire now watches this group.')
        : sc('the vampire has left the group.'))
    ))
  }
}

// ══════════════════════════════════════════════════════
//  AUTO-RESPONDER — call this from handler.js for every
//  non-command message
// ══════════════════════════════════════════════════════
export async function handleChatbot(ctx) {
  const { sock, msg, chat, sender, text, isGroup, reply } = ctx
  if (!text || !text.trim()) return false

  const apiKey = process.env.OPENAI_API

  // ── Check if chatbot should fire ──────────────────
  let shouldReply = false

  if (isGroup) {
    // Group: only if group chatbot is on
    const gs = await getGroup(chat).catch(() => null)
    if (gs?.chatbotOn) shouldReply = true
  } else {
    // DM: only if user has chatbot on
    const profile = await getPlayerProfile(sender).catch(() => null)
    if (profile?.chatbotOn) shouldReply = true
  }

  if (!shouldReply) return false
  if (!apiKey)      return false

  // ── Call OpenAI ────────────────────────────────────
  try {
    const profile  = await getPlayerProfile(sender).catch(() => null)
    const persona  = profile?.chatbotPersona || 'vampire'
    const system   = PERSONAS[persona] || VAMPIRE_SYSTEM

    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model:    'gpt-3.5-turbo',
      messages: [
        { role: 'system',  content: system },
        { role: 'user',    content: text.trim() },
      ],
      max_tokens: 200,
    })

    const response = completion.choices[0].message.content.trim()
    await sock.sendMessage(chat, { text: response }, { quoted: msg })
    return true
  } catch (err) {
    console.error('[Chatbot]', err.message)
    return false
  }
}
