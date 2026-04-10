import axios from 'axios'

// ─── URL Patterns ────────────────────────────────────────────────────────────
const TT  = /(?<!\S)https?:\/\/(www\.)?(vm\.|vt\.|m\.)?tiktok\.com\/[^\s]+(?=\s|$)/gi
const IG  = /https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi
const MF  = /(?<!\S)https?:\/\/(www\.)?mediafire\.com\/\S+(?=\s|$)/gi
const PIN = /https?:\/\/(www\.)?(pinterest\.(com|fr|de|co\.uk|jp|ru|ca|it|com\.au|com\.mx|com\.br|es|pl)|pin\.it)\/[^\s]+/gi
const FB  = /(?<!\S)https?:\/\/(www\.|m\.|web\.)?facebook\.com\/[^\s]+(?=\s|$)/gi
const TW  = /(?<!\S)https?:\/\/(www\.)?(twitter\.com|x\.com)\/[^\s]+(?=\s|$)/gi
const VD  = /https?:\/\/(www\.)?videy\.co\/[^\s]+/gi
const TH  = /https?:\/\/(www\.)?threads\.(net|com)\/[^\s]+/gi
const MG  = /https?:\/\/mega\.nz\/[^\s]+/gi
const SC  = /(?<!\S)https?:\/\/(www\.|on\.)?soundcloud\.com\/[^\s]+(?=\s|$)/gi
const SP  = /https?:\/\/open\.spotify\.com\/[^\s]+/gi
const YT  = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/gi
const SF  = /https?:\/\/sfile\.co\/[^\s]+/gi

// ─── URL Extractor ───────────────────────────────────────────────────────────
const ext = (txt) => {
  if (!txt) return null
  const clean = (m) => m?.[0]?.replace(/[.,!?]$/, '')
  let m
  m = txt.match(TT);  if (m) return { type: 'tt',  url: clean(m) }
  m = txt.match(IG);  if (m && !clean(m).includes('/stories/')) return { type: 'ig',  url: clean(m) }
  m = txt.match(PIN); if (m) return { type: 'pin', url: clean(m) }
  m = txt.match(FB);  if (m) {
    const u = clean(m)
    if (!u.includes('/login') && !u.includes('/dialog') && !u.includes('/plugins/'))
      return { type: 'fb', url: u }
  }
  m = txt.match(TW);  if (m) return { type: 'tw',  url: clean(m) }
  m = txt.match(VD);  if (m) return { type: 'vd',  url: clean(m) }
  m = txt.match(TH);  if (m) return { type: 'th',  url: clean(m) }
  m = txt.match(MG);  if (m) return { type: 'mg',  url: clean(m) }
  m = txt.match(SC);  if (m) return { type: 'sc',  url: clean(m) }
  m = txt.match(SP);  if (m) return { type: 'sp',  url: clean(m) }
  m = txt.match(YT);  if (m) return { type: 'yt',  url: clean(m) }
  m = txt.match(SF);  if (m) return { type: 'sf',  url: clean(m) }
  m = txt.match(MF);  if (m) return { type: 'mf',  url: clean(m) }
  return null
}

// ─── Platform API Handlers ───────────────────────────────────────────────────
const api = {
  tt: async (url) => {
    const { data: d } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`)
    if (d.code !== 0 || !d.data) throw new Error(d.msg || 'TikTok API error')
    return d.data.images?.length
      ? { type: 'image', data: d.data.images }
      : { type: 'video', data: d.data.play }
  },

  ig: async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.url) throw new Error(d.message || 'Instagram API error')
    return { urls: d.result.url, isVideo: d.result.metadata?.isVideo }
  },

  pin: async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/pin-down?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.medias) throw new Error(d.message || 'Pinterest API error')
    return d.result.medias
  },

  fb: async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/fbdownload?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.media) throw new Error(d.message || 'Facebook API error')
    return d.result.media
  },

  tw: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/twitter?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result) throw new Error(d.message || 'Twitter/X API error')
    return { type: d.result.type, data: d.result.download_url }
  },

  vd: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/videy?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result) throw new Error(d.message || 'Videy API error')
    return d.result
  },

  mf: async (url) => {
    const { data: d } = await axios.get(`https://api-faa.my.id/faa/mediafire?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result) throw new Error(d.message || 'MediaFire API error')
    return d.result
  },

  th: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/threads?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.media) throw new Error(d.message || 'Threads API error')
    return d.result.media
  },

  mg: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/mega?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result) throw new Error(d.message || 'Mega API error')
    return d.result
  },

  sc: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/soundcloud?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.url) throw new Error(d.message || 'SoundCloud API error')
    return d.result
  },

  sp: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/spotify?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.url) throw new Error(d.message || 'Spotify API error')
    return d.result
  },

  yt: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/ytmp3?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.url) throw new Error(d.message || 'YouTube API error')
    return d.result
  },

  sf: async (url) => {
    const { data: d } = await axios.get(`https://api.nexray.web.id/downloader/sfile?url=${encodeURIComponent(url)}`)
    if (!d.status || !d.result?.url) throw new Error(d.message || 'Sfile API error')
    return d.result
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const react = (sock, msg, emoji) =>
  sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => {})

const send = (sock, chat, content, msg) =>
  sock.sendMessage(chat, content, { quoted: msg })

// ─── Main Plugin ─────────────────────────────────────────────────────────────
export async function run({ sock, msg, args, chat, reply, quoted }) {
  let raw = args.join(' ').trim()
  if (!raw && quoted?.text) raw = quoted.text

  if (!raw) {
    return reply(
      `「ᴜɴɪᴠᴇʀsᴀʟ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ」\n──────➳\n๏ ๏\n` +
      `⚘ *Supported Platforms:*\n` +
      `TikTok • Instagram • Pinterest • Facebook\n` +
      `Twitter/X • Threads • Videy • Mega\n` +
      `SoundCloud • Spotify • YouTube • Sfile • MediaFire\n\n` +
      `⚘ *Usage:* .dl <url>\n` +
      `⚘ *Note:* Reply to a link also works\n──────────✷`
    )
  }

  const parsed = ext(raw)
  if (!parsed) return reply('⚘ Invalid URL. Please provide a valid link from a supported platform.\n──────────✷')

  await react(sock, msg, '📥')

  try {
    switch (parsed.type) {
      case 'tt': {
        const r = await api.tt(parsed.url)
        if (r.type === 'video') {
          await send(sock, chat, { video: { url: r.data }, mimetype: 'video/mp4' }, msg)
        } else {
          if (!r.data?.length) throw new Error('No image data found')
          for (const img of r.data)
            await send(sock, chat, { image: { url: img } }, msg)
        }
        break
      }

      case 'ig': {
        const { urls, isVideo } = await api.ig(parsed.url)
        if (!urls?.length) throw new Error('No media found')
        for (const link of urls) {
          if (isVideo) await send(sock, chat, { video: { url: link }, mimetype: 'video/mp4' }, msg)
          else         await send(sock, chat, { image: { url: link } }, msg)
        }
        break
      }

      case 'pin': {
        const meds = await api.pin(parsed.url)
        if (!meds?.length) throw new Error('No media found')
        const imgs = meds.filter(x => x.type === 'image')
        if (imgs.length) {
          for (const img of imgs) await send(sock, chat, { image: { url: img.url } }, msg)
        } else {
          const vid = meds.find(x => x.type === 'video')
          const gif = meds.find(x => x.type === 'gif')
          if (vid)      await send(sock, chat, { video: { url: vid.url }, mimetype: 'video/mp4' }, msg)
          else if (gif) await send(sock, chat, { video: { url: gif.url }, gifPlayback: true }, msg)
        }
        break
      }

      case 'fb': {
        const med = await api.fb(parsed.url)
        const vu = med.video_hd || med.video_sd
        if (vu)             await send(sock, chat, { video: { url: vu }, mimetype: 'video/mp4' }, msg)
        else if (med.photo_image) await send(sock, chat, { image: { url: med.photo_image } }, msg)
        else throw new Error('No downloadable media found in this Facebook post')
        break
      }

      case 'tw': {
        const r = await api.tw(parsed.url)
        if (r.type === 'image') {
          if (!r.data?.length) throw new Error('No image data found')
          for (const img of r.data) await send(sock, chat, { image: { url: img.url } }, msg)
        } else if (r.type === 'video') {
          if (!r.data?.length) throw new Error('No video data found')
          const vqs = r.data.filter(x => x.type === 'mp4')
          const best = vqs.find(v => v.resolusi === '768p')
            || vqs.find(v => v.resolusi === '640p')
            || vqs.find(v => v.resolusi === '426p')
            || vqs[0]
          if (!best) throw new Error('No video URL found')
          await send(sock, chat, { video: { url: best.url }, mimetype: 'video/mp4' }, msg)
        }
        break
      }

      case 'vd': {
        const vu = await api.vd(parsed.url)
        await send(sock, chat, { video: { url: vu }, mimetype: 'video/mp4' }, msg)
        break
      }

      case 'mf': {
        const r = await api.mf(parsed.url)
        await send(sock, chat, {
          document: { url: r.download_url },
          fileName: r.filename,
          mimetype: r.mime ? `application/${r.mime}` : 'application/octet-stream',
          caption: `*MediaFire Download*\n\n📄 *Filename:* ${r.filename}\n📦 *Size:* ${r.size}`
        }, msg)
        break
      }

      case 'th': {
        const meds = await api.th(parsed.url)
        if (!meds?.length) throw new Error('No media found')
        const vids = meds.filter(x => x.thumbnail && x.thumbnail !== '-')
        const imgs = meds.filter(x => !x.thumbnail || x.thumbnail === '-')
        if (vids.length) await send(sock, chat, { video: { url: vids[0].url }, mimetype: 'video/mp4' }, msg)
        else for (const img of imgs) await send(sock, chat, { image: { url: img.url } }, msg)
        break
      }

      case 'mg': {
        const r = await api.mg(parsed.url)
        const durl = Array.isArray(r.download_url) ? r.download_url[0] : r.download_url
        await send(sock, chat, {
          document: { url: durl },
          fileName: r.filename,
          mimetype: r.mimetype || 'application/octet-stream',
          caption: `*Mega Download*\n\n📄 *Filename:* ${r.filename}\n📦 *Size:* ${r.filesize}`
        }, msg)
        break
      }

      case 'sc': {
        const r = await api.sc(parsed.url)
        await send(sock, chat, { audio: { url: r.url }, mimetype: 'audio/mpeg', fileName: r.fileName }, msg)
        break
      }

      case 'sp': {
        const r = await api.sp(parsed.url)
        await send(sock, chat, { audio: { url: r.url }, mimetype: 'audio/mpeg', fileName: `${r.title} - ${r.artist}.mp3` }, msg)
        break
      }

      case 'yt': {
        const r = await api.yt(parsed.url)
        await send(sock, chat, { audio: { url: r.url }, mimetype: 'audio/mpeg', fileName: `${r.title}.mp3` }, msg)
        break
      }

      case 'sf': {
        const r = await api.sf(parsed.url)
        await send(sock, chat, {
          document: { url: r.url },
          fileName: r.file_name,
          mimetype: r.mimetype === '7ZIP' ? 'application/x-7z-compressed' : 'application/octet-stream',
          caption: `*Sfile Download*\n\n📄 *Filename:* ${r.file_name}\n📦 *Size:* ${r.size}`
        }, msg)
        break
      }
    }

    await react(sock, msg, '🍁')
  } catch (e) {
    await react(sock, msg, '❌')
    reply(`⚘ Error: ${e.message}\n──────────✷`)
  }
}
