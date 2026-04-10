import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, args, chat, reply, isAdmin, isBotAdmin, isGroup }) {
  if (!isGroup)    return reply(fmt('ᴛᴀɢᴀʟʟ', field(sc('error'), 'group only')))
  if (!isAdmin)    return reply(fmt('ᴛᴀɢᴀʟʟ', field(sc('error'), 'admins only')))
  if (!isBotAdmin) return reply(fmt('ᴛᴀɢᴀʟʟ', field(sc('error'), 'bot must be admin')))

  let meta
  try { meta = await sock.groupMetadata(chat) } catch {}
  if (!meta) return reply(fmt('ᴛᴀɢᴀʟʟ', field(sc('error'), 'could not fetch members')))

  const participants = meta.participants || []
  const mentions     = participants.map(p => p.id)
  const customMsg    = args.join(' ').trim()
  const header       = customMsg || sc('attention everyone')
  const lines        = participants.map(p => `⚘ @${p.id.split('@')[0]}`).join('\n')

  return sock.sendMessage(chat, {
    text: fmt('ᴛᴀɢᴀʟʟ', `${header}\n${lines}\n${field(sc('total'), `${participants.length} members`)}`),
    mentions
  }, { quoted: msg })
}
