import { fmt, field, sc } from '../../lib/utils.js'
import { getGroup, setGroup } from '../../lib/mongodb.js'

export async function run({ args, chat, reply, isAdmin, isGroup }) {
  if (!isGroup) return reply(fmt('ᴀɴᴛɪʙᴏᴛ', field(sc('error'), 'group only')))
  if (!isAdmin) return reply(fmt('ᴀɴᴛɪʙᴏᴛ', field(sc('error'), 'admins only')))

  const gs  = await getGroup(chat)
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'on')  { await setGroup(chat, { ...gs, antibot: true });  return reply(fmt('ᴀɴᴛɪʙᴏᴛ', field(sc('status'), 'enabled'))) }
  if (sub === 'off') { await setGroup(chat, { ...gs, antibot: false }); return reply(fmt('ᴀɴᴛɪʙᴏᴛ', field(sc('status'), 'disabled'))) }

  return reply(fmt('ᴀɴᴛɪʙᴏᴛ',
    `${field(sc('status'), gs.antibot ? 'on' : 'off')}\n` +
    `${field(sc('usage'),  '/antibot on | off')}`
  ))
}
