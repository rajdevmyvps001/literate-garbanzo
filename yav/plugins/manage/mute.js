import { fmt, field, sc } from '../../lib/utils.js'
import { getGroup, setGroup } from '../../lib/mongodb.js'

export async function run({ sock, msg, cmd, args, chat, reply, isAdmin, isBotAdmin, isGroup, mentions, quoted }) {
  if (!isGroup) return reply(fmt('ᴍᴜᴛᴇ', field(sc('error'), 'group only')))
  if (!isAdmin) return reply(fmt('ᴍᴜᴛᴇ', field(sc('error'), 'admins only')))

  const target = quoted?.sender || mentions?.[0]
  if (target) {
    if (!isBotAdmin) return reply(fmt('ᴍᴜᴛᴇ', field(sc('error'), 'bot must be admin')))
    const num = target.split('@')[0]

    if (cmd === 'unmute') {
      const gs = await getGroup(chat)
      const muted = (gs.mutedMembers || []).filter(j => j !== target)
      await setGroup(chat, { ...gs, mutedMembers: muted })
      return sock.sendMessage(chat, {
        text: fmt('ᴜɴᴍᴜᴛᴇ', field(sc('user'), `@${num} — unmuted`)),
        mentions: [target]
      }, { quoted: msg })
    }

    const gs = await getGroup(chat)
    const muted = [...new Set([...(gs.mutedMembers || []), target])]
    await setGroup(chat, { ...gs, mutedMembers: muted })
    return sock.sendMessage(chat, {
      text: fmt('ᴍᴜᴛᴇ', field(sc('user'), `@${num} — muted`)),
      mentions: [target]
    }, { quoted: msg })
  }

  if (!isBotAdmin) return reply(fmt('ᴍᴜᴛᴇ', field(sc('error'), 'bot must be admin')))

  const gs = await getGroup(chat)

  if (cmd === 'unmute') {
    await setGroup(chat, { ...gs, muted: false })
    await sock.groupSettingUpdate(chat, 'not_announcement').catch(() => {})
    return reply(fmt('ᴜɴᴍᴜᴛᴇ', field(sc('status'), 'group unmuted — all can send')))
  }

  await setGroup(chat, { ...gs, muted: true })
  await sock.groupSettingUpdate(chat, 'announcement').catch(() => {})
  return reply(fmt('ᴍᴜᴛᴇ', field(sc('status'), 'group muted — admins only')))
}
