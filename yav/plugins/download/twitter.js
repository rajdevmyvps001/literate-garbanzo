import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

const TW_REGEX = /twitter\.com|x\.com|t\.co/

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !TW_REGEX.test(url)) return reply(fmt('ᴛᴡɪᴛᴛᴇʀ',
    field(sc('usage'), '/twitter <url>')
  ))

  await reply(fmt('ᴛᴡɪᴛᴛᴇʀ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get('https://api.nexoracle.com/downloaders/twitter', {
      params: { url, apikey: 'free_for_use' },
      timeout: 25_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = data?.result || data?.medias || data?.data
    if (!result) throw new Error('no media found — tweet may be private or text-only')

    const item    = Array.isArray(result) ? result[0] : result
    const mediaUrl = item?.url || item?.video_url || item?.hd || item?.sd
    if (!mediaUrl) throw new Error('could not extract media URL')

    const isVideo = /\.mp4|video/.test(mediaUrl)
    await sock.sendMessage(chat, {
      [isVideo ? 'video' : 'image']: { url: mediaUrl },
      caption: fmt('ᴛᴡɪᴛᴛᴇʀ', field(sc('status'), 'downloaded'))
    }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴛᴡɪᴛᴛᴇʀ', field(sc('error'), e.message)))
  }
}
