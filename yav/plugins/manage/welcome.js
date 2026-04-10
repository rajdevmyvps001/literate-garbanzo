import { fmt, field, sc } from '../../lib/utils.js'
import { getGroup, setGroup } from '../../lib/mongodb.js'

export async function run({ sock, msg, args, cmd, chat, sender, reply, isAdmin, isGroup, quoted }) {
  if (!isGroup)  return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', '⚘ ɢʀᴏᴜᴘ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ'))
  if (!isAdmin)  return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', '⚘ ᴀᴅᴍɪɴs ᴏɴʟʏ'))

  const gs  = await getGroup(chat)
  const sub = (args[0] || '').toLowerCase()

  if (cmd === 'welcome') {
    if (sub === 'on')  { await setGroup(chat, { ...gs, welcome: true });  return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', field(sc('status'), 'enabled'))) }
    if (sub === 'off') { await setGroup(chat, { ...gs, welcome: false }); return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', field(sc('status'), 'disabled'))) }
    return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', `${field(sc('status'), gs.welcome ? 'on' : 'off')}\n${field(sc('usage'), '/welcome on | off | /setwelcome msg')}`))
  }

  if (cmd === 'goodbye') {
    if (sub === 'on')  { await setGroup(chat, { ...gs, goodbye: true });  return reply(fmt('ɢᴏᴏᴅʙʏᴇ', field(sc('status'), 'enabled'))) }
    if (sub === 'off') { await setGroup(chat, { ...gs, goodbye: false }); return reply(fmt('ɢᴏᴏᴅʙʏᴇ', field(sc('status'), 'disabled'))) }
    return reply(fmt('ɢᴏᴏᴅʙʏᴇ', `${field(sc('status'), gs.goodbye ? 'on' : 'off')}\n${field(sc('usage'), '/goodbye on | off | /setgoodbye msg')}`))
  }

  if (cmd === 'setwelcome') {
    const custom = args.join(' ')
    if (!custom) return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', '⚘ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇssᴀɢᴇ. ᴜsᴇ {name} ꜰᴏʀ ᴛʜᴇ ɴᴀᴍᴇ'))
    await setGroup(chat, { ...gs, customWelcome: custom, welcome: true })
    return reply(fmt('ᴡᴇʟᴄᴏᴍᴇ', `${field(sc('set'), custom)}`))
  }

  if (cmd === 'setgoodbye') {
    const custom = args.join(' ')
    if (!custom) return reply(fmt('ɢᴏᴏᴅʙʏᴇ', '⚘ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇssᴀɢᴇ. ᴜsᴇ {name}'))
    await setGroup(chat, { ...gs, customGoodbye: custom, goodbye: true })
    return reply(fmt('ɢᴏᴏᴅʙʏᴇ', `${field(sc('set'), custom)}`))
  }
}
