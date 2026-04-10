import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, chat, reply, quoted }) {
  if (!quoted) return reply(fmt('ᴠɪᴇᴡᴏɴᴄᴇ',
    field(sc('usage'), '/viewonce — reply to a view-once message')
  ))

  const mime = quoted?.mimetype || ''
  if (!/image|video|audio/i.test(mime)) return reply(fmt('ᴠɪᴇᴡᴏɴᴄᴇ',
    field(sc('error'), 'replied message is not a view-once media')
  ))

  await reply(fmt('ᴠɪᴇᴡᴏɴᴄᴇ', field(sc('status'), 'revealing...')))

  try {
    const buffer  = await quoted.download()
    const isVideo = /video/i.test(mime)
    const isAudio = /audio/i.test(mime)

    if (isAudio) {
      await sock.sendMessage(chat, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
    } else if (isVideo) {
      await sock.sendMessage(chat, { video: buffer }, { quoted: msg })
    } else {
      await sock.sendMessage(chat, { image: buffer }, { quoted: msg })
    }
  } catch (e) {
    return reply(fmt('ᴠɪᴇᴡᴏɴᴄᴇ', field(sc('error'), e.message)))
  }
}
