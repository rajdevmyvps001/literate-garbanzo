import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'
import config from '../../config.js'

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([\w-]{11})/

export async function run({ sock, msg, args, cmd, chat, reply }) {
  const url = args[0]
  if (!url || !YT_REGEX.test(url)) return reply(fmt(
    cmd === 'ytmp3' ? 'ʏᴛᴍᴘ3' : 'ʏᴛᴍᴘ4',
    `${field(sc('usage'), `/${cmd} <youtube url>`)}\n${field(sc('supports'), 'youtube.com · youtu.be · shorts')}`
  ))

  const label = cmd === 'ytmp3' ? 'ʏᴛᴍᴘ3' : 'ʏᴛᴍᴘ4'
  await reply(fmt(label, field(sc('status'), 'fetching...')))

  try {
    const endpoint = cmd === 'ytmp3' ? 'ytmp3' : 'ytmp4'
    const { data } = await axios.get(`${config.ytApi}/${endpoint}`, {
      params: { url: encodeURIComponent(url) },
      timeout: 30_000
    })

    const result = data?.result || data?.data || data
    if (!result) throw new Error('no result from API')

    const title    = result.title    || result.name   || 'unknown'
    const duration = result.duration || result.dur    || '?'
    const size     = result.size     || result.filesize || '?'
    const dlUrl    = result.url      || result.download || result.link

    if (!dlUrl) throw new Error('download URL not found')

    const caption = fmt(label,
      `${field(sc('title'),    title)}\n` +
      `${field(sc('duration'), duration)}\n` +
      `${field(sc('size'),     size)}`
    )

    if (cmd === 'ytmp3') {
      await sock.sendMessage(chat, { text: caption }, { quoted: msg })
      await sock.sendMessage(chat, {
        audio:    { url: dlUrl },
        mimetype: 'audio/mpeg',
        ptt:      false,
      }, { quoted: msg })
    } else {
      await sock.sendMessage(chat, {
        video:    { url: dlUrl },
        caption,
        mimetype: 'video/mp4',
      }, { quoted: msg })
    }
  } catch (e) {
    return reply(fmt(label, field(sc('error'), e.message)))
  }
}
