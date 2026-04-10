import axios from 'axios'
import config from '../../config.js'

const YT_REGEX = /^(https?:\/\/)?((www|m|music)\.)?(youtube(-nocookie)?\.com\/(watch\?v=|shorts\/|live\/)|youtu\.be\/)[\w-]+(\S+)?$/i

const extractUrl = (text) => {
  if (!text) return null
  const match = text.match(YT_REGEX)
  return match ? match[0] : null
}

const react = (sock, msg, emoji) =>
  sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => {})

// ── API wrappers with nexray fallback ─────────────────────────────────────────

const ytmp3 = async (url) => {
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 30_000 })
    if (data.status && data.result?.mp3) return { url: data.result.mp3, title: data.result.title, thumbnail: data.result.thumbnail, author: data.result.author }
  } catch {}
  const { data } = await axios.get(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 30_000 })
  if (!data.status || !data.result?.url) throw new Error('MP3 download failed')
  return { url: data.result.url, title: data.result.title, thumbnail: null, author: null }
}

const ytmp4 = async (url) => {
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 30_000 })
    if (data.status && data.result?.download_url) return data.result.download_url
  } catch {}
  const { data } = await axios.get(`https://api.nexray.web.id/downloader/ytmp4?url=${encodeURIComponent(url)}`, { timeout: 30_000 })
  if (!data.status || !data.result?.url) throw new Error('MP4 download failed')
  return data.result.url
}

const ytplay = async (query) => {
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/ytplay?query=${encodeURIComponent(query)}`, { timeout: 30_000 })
    if (data.status && data.result?.mp3) return { url: data.result.mp3, title: data.result.title, thumbnail: data.result.thumbnail, author: data.result.author, ytUrl: data.result.url }
  } catch {}
  const { data: s } = await axios.get(`https://api.nexray.web.id/search/youtube?q=${encodeURIComponent(query)}`, { timeout: 15_000 })
  if (!s.status || !s.result?.length) throw new Error('No results found')
  const top = s.result[0]
  const r = await ytmp3(top.url)
  return { ...r, ytUrl: top.url }
}

const ytsearch = async (query) => {
  try {
    const { data } = await axios.get(`https://api-faa.my.id/faa/youtube?q=${encodeURIComponent(query)}`, { timeout: 15_000 })
    if (data.status && data.result?.length) return data.result
  } catch {}
  const { data } = await axios.get(`https://api.nexray.web.id/search/youtube?q=${encodeURIComponent(query)}`, { timeout: 15_000 })
  if (!data.status || !data.result?.length) throw new Error('No results found')
  return data.result
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export async function run({ sock, msg, args, chat, reply, quoted }) {
  const prefix = config.prefix
  let raw = args.join(' ').trim()
  if (!raw && quoted?.text) raw = quoted.text.trim()

  if (!raw) return reply(
    `「ᴘʟᴀʏ」\n──────➳\n๏ ๏\n` +
    `⚘ *Usage:*\n` +
    `  • ${prefix}play <song name> — search & send audio\n` +
    `  • ${prefix}play <url>       — YouTube URL to MP3\n` +
    `  • ${prefix}play v <url>     — YouTube URL to MP4\n` +
    `  • ${prefix}play s <query>   — search & list results\n` +
    `⚘ *Tip:* Reply to a YouTube link also works\n──────────✷`
  )

  if (quoted?.text) {
    const qUrl = extractUrl(quoted.text)
    if (qUrl && !extractUrl(raw)) {
      if (/^v$/i.test(raw)) raw = `v ${qUrl}`
      else if (!/^[vs]\s/i.test(raw)) raw = qUrl
    }
  }

  await react(sock, msg, '🎵')

  try {
    // .play v <url> → MP4
    if (/^v\s+/i.test(raw)) {
      const url = raw.replace(/^v\s+/i, '').trim()
      const ytUrl = extractUrl(url)
      if (!ytUrl) return reply('⚘ Invalid YouTube URL\n──────────✷')
      const videoUrl = await ytmp4(ytUrl)
      await sock.sendMessage(chat, { video: { url: videoUrl }, mimetype: 'video/mp4' }, { quoted: msg })
    }

    // .play s <query> → search list
    else if (/^s\s+/i.test(raw)) {
      const query = raw.replace(/^s\s+/i, '').trim()
      if (!query) return reply(`⚘ Usage: ${prefix}play s <query>\n──────────✷`)
      const results = await ytsearch(query)
      const lines = results.slice(0, 5).map((v, i) =>
        `⚘ *${i + 1}.* ${v.title}\n    ${v.channel || v.author || '-'} • ${v.duration || '-'}\n    ${prefix}play ${v.link || v.url}`
      ).join('\n\n')
      await reply(`「ʏᴛ sᴇᴀʀᴄʜ」\n──────➳\n๏ ๏\n⚘ *Query:* ${query}\n⚘ *Results:* ${results.length}\n\n${lines}\n──────────✷`)
    }

    // .play <url> → MP3
    else if (extractUrl(raw)) {
      const ytUrl = extractUrl(raw)
      const r = await ytmp3(ytUrl)
      await sock.sendMessage(chat, {
        audio: { url: r.url },
        mimetype: 'audio/mpeg',
        fileName: `${r.title || 'audio'}.mp3`,
        contextInfo: r.thumbnail ? {
          externalAdReply: {
            title: r.title || 'YouTube Audio',
            body: r.author || 'Downloaded',
            thumbnailUrl: r.thumbnail,
            mediaUrl: ytUrl,
            mediaType: 2,
            renderLargerThumbnail: true,
          }
        } : undefined,
      }, { quoted: msg })
    }

    // .play <query> → search & play
    else {
      const r = await ytplay(raw)
      await sock.sendMessage(chat, {
        audio: { url: r.url },
        mimetype: 'audio/mpeg',
        fileName: `${r.title || 'audio'}.mp3`,
        contextInfo: r.thumbnail ? {
          externalAdReply: {
            title: r.title || 'YouTube Audio',
            body: r.author || 'Unknown',
            thumbnailUrl: r.thumbnail,
            mediaUrl: r.ytUrl,
            mediaType: 2,
            renderLargerThumbnail: true,
          }
        } : undefined,
      }, { quoted: msg })
    }

    await react(sock, msg, '🍁')
  } catch (e) {
    await react(sock, msg, '❌')
    reply(`⚘ Error: ${e.message}\n──────────✷`)
  }
}
