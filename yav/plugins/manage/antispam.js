import { fmt, field, sc } from '../../lib/utils.js'
import { getGroup, setGroup } from '../../lib/mongodb.js'

export async function run({ args, chat, reply, isAdmin, isGroup }) {
  if (!isGroup) return reply(fmt('ᴀɴᴛɪsᴘᴀᴍ', field(sc('error'), 'group only')))
  if (!isAdmin) return reply(fmt('ᴀɴᴛɪsᴘᴀᴍ', field(sc('error'), 'admins only')))

  const gs  = await getGroup(chat)
  const sub = (args[0] || '').toLowerCase()

  if (sub === 'on')  { await setGroup(chat, { ...gs, antispam: true });  return reply(fmt('ᴀɴᴛɪsᴘᴀᴍ', field(sc('status'), 'enabled'))) }
  if (sub === 'off') { await setGroup(chat, { ...gs, antispam: false }); return reply(fmt('ᴀɴᴛɪsᴘᴀᴍ', field(sc('status'), 'disabled'))) }

  return reply(fmt('ᴀɴᴛɪsᴘᴀᴍ',
    `${field(sc('status'), gs.antispam ? 'on' : 'off')}\n` +
    `${field(sc('usage'),  '/antispam on | off')}`
  ))
}
