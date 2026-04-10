import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, chat, reply, isAdmin, isBotAdmin, isGroup, mentions, quoted }) {
  if (!isGroup)    return reply(fmt('ᴋɪᴄᴋ', field(sc('error'), 'group only')))
  if (!isAdmin)    return reply(fmt('ᴋɪᴄᴋ', field(sc('error'), 'admins only')))
  if (!isBotAdmin) return reply(fmt('ᴋɪᴄᴋ', field(sc('error'), 'bot must be admin')))

  const targets = []
  if (quoted?.sender) targets.push(quoted.sender)
  if (mentions?.length) mentions.forEach(j => { if (!targets.includes(j)) targets.push(j) })

  if (!targets.length) return reply(fmt('ᴋɪᴄᴋ', field(sc('usage'), '/kick @user or reply')))

  // fetch admins to avoid kicking them
  let admins = []
  try {
    const meta = await sock.groupMetadata(chat)
    admins = (meta.participants || []).filter(p => p.admin).map(p => p.id)
  } catch {}

  const toKick   = targets.filter(t => !admins.includes(t))
  const skipped  = targets.filter(t => admins.includes(t))

  if (skipped.length) {
    await sock.sendMessage(chat, {
      text: fmt('ᴋɪᴄᴋ', field(sc('skip'), skipped.map(j => `@${j.split('@')[0]}`).join(', ') + ' — is an admin')),
      mentions: skipped
    }, { quoted: msg })
  }

  if (!toKick.length) return

  await sock.groupParticipantsUpdate(chat, toKick, 'remove')

  return sock.sendMessage(chat, {
    text: fmt('ᴋɪᴄᴋ', field(sc('removed'), toKick.map(j => `@${j.split('@')[0]}`).join(', '))),
    mentions: toKick
  }, { quoted: msg })
}
