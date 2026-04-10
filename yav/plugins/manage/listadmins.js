import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, chat, reply, isGroup }) {
  if (!isGroup) return reply(fmt('ʟɪsᴛᴀᴅᴍɪɴs', field(sc('error'), 'group only')))

  let meta
  try { meta = await sock.groupMetadata(chat) } catch {}
  if (!meta) return reply(fmt('ʟɪsᴛᴀᴅᴍɪɴs', field(sc('error'), 'could not fetch group')))

  const admins = (meta.participants || []).filter(p => p.admin)
  if (!admins.length) return reply(fmt('ʟɪsᴛᴀᴅᴍɪɴs', field(sc('result'), 'no admins found')))

  const mentions = admins.map(p => p.id)
  const lines    = admins.map(p => {
    const tag = p.admin === 'superadmin' ? ' ✷' : ''
    return `⚘ @${p.id.split('@')[0]}${tag}`
  }).join('\n')

  return sock.sendMessage(chat, {
    text: fmt('ʟɪsᴛᴀᴅᴍɪɴs', `${lines}\n${field(sc('total'), `${admins.length} admins`)}`),
    mentions
  }, { quoted: msg })
}
