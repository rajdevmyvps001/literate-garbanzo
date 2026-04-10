import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

const TT_REGEX = /tiktok\.com/

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !TT_REGEX.test(url)) return reply(fmt('ᴛɪᴋᴛᴏᴋ',
    field(sc('usage'), '/tiktok <url>')
  ))

  await reply(fmt('ᴛɪᴋᴛᴏᴋ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get('https://api.tiklydown.eu.org/api/download/v3', {
      params: { url },
      timeout: 25_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = data?.result || data
    if (!result) throw new Error('no result')

    const author   = result.author?.nickname || result.author?.unique_id || 'unknown'
    const desc     = result.desc || result.title || '-'
    const duration = result.duration ? `${result.duration}s` : '?'
    const dlUrl    = result.video?.noWatermark || result.video?.origin || result.download?.video

    if (!dlUrl) throw new Error('video URL not found')

    const caption = fmt('ᴛɪᴋᴛᴏᴋ',
      `${field(sc('author'),   author)}\n` +
      `${field(sc('caption'),  desc.slice(0, 100))}\n` +
      `${field(sc('duration'), duration)}`
    )

    await sock.sendMessage(chat, { video: { url: dlUrl }, caption }, { quoted: msg })

    // send audio separately if available
    const audioUrl = result.music || result.download?.music
    if (audioUrl) {
      await sock.sendMessage(chat, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' }, { quoted: msg })
    }
  } catch (e) {
    return reply(fmt('ᴛɪᴋᴛᴏᴋ', field(sc('error'), e.message)))
  }
}
