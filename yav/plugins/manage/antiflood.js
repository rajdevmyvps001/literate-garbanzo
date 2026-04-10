import { fmt, field, sc } from '../../lib/utils.js'
import { getGroup, setGroup } from '../../lib/mongodb.js'

export async function run({ args, chat, reply, isAdmin, isGroup }) {
  if (!isGroup) return reply(fmt('ᴀɴᴛɪꜰʟᴏᴏᴅ', field(sc('error'), 'group only')))
  if (!isAdmin) return reply(fmt('ᴀɴᴛɪꜰʟᴏᴏᴅ', field(sc('error'), 'admins only')))

  const gs  = await getGroup(chat)
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'on')  { await setGroup(chat, { ...gs, antiflood: true });  return reply(fmt('ᴀɴᴛɪꜰʟᴏᴏᴅ', field(sc('status'), 'enabled'))) }
  if (sub === 'off') { await setGroup(chat, { ...gs, antiflood: false }); return reply(fmt('ᴀɴᴛɪꜰʟᴏᴏᴅ', field(sc('status'), 'disabled'))) }

  return reply(fmt('ᴀɴᴛɪꜰʟᴏᴏᴅ',
    `${field(sc('status'), gs.antiflood ? 'on' : 'off')}\n` +
    `${field(sc('usage'),  '/antiflood on | off')}`
  ))
}
