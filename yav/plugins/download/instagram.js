import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

const IG_REGEX = /instagram\.com\/(p|reel|tv)\//

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !IG_REGEX.test(url)) return reply(fmt('ɪɴsᴛᴀɢʀᴀᴍ',
    field(sc('usage'), '/instagram <url>')
  ))

  await reply(fmt('ɪɴsᴛᴀɢʀᴀᴍ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get('https://api.tiklydown.eu.org/api/download/instagram', {
      params: { url },
      timeout: 25_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = data?.result || data
    if (!result) throw new Error('no result')

    const contents = result.contents || result.medias || (result.url ? [{ url: result.url }] : [])
    if (!contents.length) throw new Error('no media found')

    const meta    = result.metadata || {}
    const caption = fmt('ɪɴsᴛᴀɢʀᴀᴍ',
      `${field(sc('user'),     meta.username || 'unknown')}\n` +
      `${field(sc('caption'),  (meta.title || '').slice(0, 100) || '-')}`
    )

    for (let i = 0; i < contents.length; i++) {
      const item     = contents[i]
      const mediaUrl = item.url || item.video_url || item.image_url
      if (!mediaUrl) continue
      const isVideo  = item.type === 'video' || /\.mp4/.test(mediaUrl)
      await sock.sendMessage(chat, {
        [isVideo ? 'video' : 'image']: { url: mediaUrl },
        ...(i === 0 && { caption })
      }, { quoted: msg })
    }
  } catch (e) {
    return reply(fmt('ɪɴsᴛᴀɢʀᴀᴍ', field(sc('error'), e.message)))
  }
}
