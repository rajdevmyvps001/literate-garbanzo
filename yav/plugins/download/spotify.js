import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, args, chat, reply }) {
  const query = args.join(' ').trim()
  if (!query) return reply(fmt('sᴘᴏᴛɪꜰʏ', field(sc('usage'), '/spotify <song name>')))

  await reply(fmt('sᴘᴏᴛɪꜰʏ', field(sc('status'), 'searching...')))

  try {
    const { data } = await axios.get('https://api.nexoracle.com/downloaders/spotify', {
      params: { query, apikey: 'free_for_use' },
      timeout: 25_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = data?.result || data?.data
    if (!result) throw new Error('no results found')

    const name     = result.name   || result.title  || query
    const artist   = result.artist || result.artists || 'unknown'
    const album    = result.album  || '-'
    const duration = result.duration || '?'
    const audioUrl = result.audio  || result.download || result.url
    const coverUrl = result.thumbnail || result.image

    const caption = fmt('sᴘᴏᴛɪꜰʏ',
      `${field(sc('title'),    name)}\n` +
      `${field(sc('artist'),   artist)}\n` +
      `${field(sc('album'),    album)}\n` +
      `${field(sc('duration'), duration)}`
    )

    // send cover image first
    if (coverUrl) {
      await sock.sendMessage(chat, { image: { url: coverUrl }, caption }, { quoted: msg })
    }

    // send audio
    if (audioUrl) {
      await sock.sendMessage(chat, {
        audio:    { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt:      false
      }, { quoted: msg })
    } else if (!coverUrl) {
      await reply(fmt('sᴘᴏᴛɪꜰʏ', `${caption}\n${field(sc('note'), 'no audio available for this track')}`))
    }
  } catch (e) {
    return reply(fmt('sᴘᴏᴛɪꜰʏ', field(sc('error'), e.message)))
  }
}
