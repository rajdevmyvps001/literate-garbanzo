import { fmt, field, sc } from '../../lib/utils.js'
import sharp from 'sharp'

export async function run({ sock, msg, chat, reply, quoted }) {
  const q    = quoted || msg
  const mime = q?.mimetype || ''

  if (!/webp|sticker/i.test(mime)) return reply(fmt('ᴛᴏᴊᴘᴇɢ',
    field(sc('usage'), '/tojpeg — reply to a sticker')
  ))

  await reply(fmt('ᴛᴏᴊᴘᴇɢ', field(sc('status'), 'converting...')))

  try {
    const buffer = await q.download()
    const jpeg   = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
    await sock.sendMessage(chat, { image: jpeg, mimetype: 'image/jpeg' }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴛᴏᴊᴘᴇɢ', field(sc('error'), e.message)))
  }
}
