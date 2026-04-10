import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, cmd, args, chat, reply, isAdmin, isBotAdmin, isGroup }) {
  if (!isGroup)    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('error'), 'group only')))
  if (!isAdmin)    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('error'), 'admins only')))
  if (!isBotAdmin) return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('error'), 'bot must be admin')))

  // /setgroup open | close | lock  OR  direct /open /close /lock
  const action = cmd === 'setgroup' ? (args[0] || '').toLowerCase() : cmd

  if (action === 'open') {
    await sock.groupSettingUpdate(chat, 'not_announcement')
    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('status'), 'group opened — all members can send')))
  }

  if (action === 'close') {
    await sock.groupSettingUpdate(chat, 'announcement')
    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('status'), 'group closed — admins only')))
  }

  if (action === 'lock') {
    await sock.groupSettingUpdate(chat, 'locked')
    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('status'), 'group locked — only admins can edit info')))
  }

  if (action === 'unlock') {
    await sock.groupSettingUpdate(chat, 'unlocked')
    return reply(fmt('sᴇᴛɢʀᴏᴜᴘ', field(sc('status'), 'group unlocked — all members can edit info')))
  }

  return reply(fmt('sᴇᴛɢʀᴏᴜᴘ',
    `${field(sc('usage'), '/setgroup open | close | lock | unlock')}`
  ))
}
