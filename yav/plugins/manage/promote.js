import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, cmd, chat, reply, isAdmin, isBotAdmin, isGroup, mentions, quoted }) {
  if (!isGroup)    return reply(fmt('ᴘʀᴏᴍᴏᴛᴇ', field(sc('error'), 'group only')))
  if (!isAdmin)    return reply(fmt('ᴘʀᴏᴍᴏᴛᴇ', field(sc('error'), 'admins only')))
  if (!isBotAdmin) return reply(fmt('ᴘʀᴏᴍᴏᴛᴇ', field(sc('error'), 'bot must be admin')))

  const targets = []
  if (quoted?.sender) targets.push(quoted.sender)
  if (mentions?.length) mentions.forEach(j => { if (!targets.includes(j)) targets.push(j) })

  if (!targets.length) return reply(fmt('ᴘʀᴏᴍᴏᴛᴇ',
    `${field(sc('usage'), '/promote @user or reply')}\n` +
    `${field(sc('also'),  '/demote @user or reply')}`
  ))

  const isPromote = cmd === 'promote'
  const action    = isPromote ? 'promote' : 'demote'
  const label     = isPromote ? 'promoted to admin' : 'demoted from admin'

  await sock.groupParticipantsUpdate(chat, targets, action)

  return sock.sendMessage(chat, {
    text: fmt(isPromote ? 'ᴘʀᴏᴍᴏᴛᴇ' : 'ᴅᴇᴍᴏᴛᴇ',
      field(sc(label), targets.map(j => `@${j.split('@')[0]}`).join(', '))
    ),
    mentions: targets
  }, { quoted: msg })
}
