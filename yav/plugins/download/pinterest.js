import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

const PIN_REGEX = /pinterest\.com|pin\.it/

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !PIN_REGEX.test(url)) return reply(fmt('ᴘɪɴᴛᴇʀᴇsᴛ',
    field(sc('usage'), '/pinterest <url>')
  ))

  await reply(fmt('ᴘɪɴᴛᴇʀᴇsᴛ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get('https://api.nexoracle.com/downloaders/pinterest', {
      params: { url, apikey: 'free_for_use' },
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result   = data?.result || data?.data || data
    const mediaUrl = result?.url || result?.media || result?.video || result?.image
    if (!mediaUrl) throw new Error('no media found')

    const isVideo = /\.mp4/.test(mediaUrl)
    await sock.sendMessage(chat, {
      [isVideo ? 'video' : 'image']: { url: mediaUrl },
      caption: fmt('ᴘɪɴᴛᴇʀᴇsᴛ', field(sc('status'), 'downloaded'))
    }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴘɪɴᴛᴇʀᴇsᴛ', field(sc('error'), e.message)))
  }
}
