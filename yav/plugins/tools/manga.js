// ─────────────────────────────────────────────
//  Vampire Diaries — Manga Plugin
//  Ported from Astral of the Sun manga.js
//  Sources: MangaDex API + AsuraScans/direct URL scraper
// ─────────────────────────────────────────────

import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { fmt, field, sc } from '../../lib/utils.js'
import { PERM, DENY } from '../../lib/permissions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP = join(__dirname, '../../data/tmp')
fs.mkdirSync(TMP, { recursive: true })

const BASE = 'https://api.mangadex.org'
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
const mangaSessions = new Map()

let _pdfLib = null
async function loadPdfLib() { if (!_pdfLib) _pdfLib = await import('pdf-lib'); return _pdfLib }
let _sharp  = null
async function loadSharp()  { if (!_sharp)  _sharp  = (await import('sharp')).default; return _sharp }

// ── Astro props decoder ──────────────────────────────
function decodeAstro(encoded) {
  if (!Array.isArray(encoded)) return encoded
  const [type, val] = encoded
  if (type === 0) return val
  if (type === 1) return val.map(decodeAstro)
  return val
}

// ── HTTP helpers ─────────────────────────────────────
async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    timeout: 30_000,
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': new URL(url).origin + '/' }
  })
  return data
}

function absUrl(base, href) {
  if (!href) return ''
  if (href.startsWith('http')) return href
  try { return new URL(href, base).href } catch { return href }
}

// ── Chapter image scraper ────────────────────────────
async function scrapeChapterImages(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  let imgs = []

  $('astro-island[props]').each((_, el) => {
    if (imgs.length) return
    try {
      const props = JSON.parse($(el).attr('props').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))
      if (!props.pages) return
      for (const pr of decodeAstro(props.pages)) {
        const page   = decodeAstro(pr)
        const imgUrl = page && (Array.isArray(page.url) ? decodeAstro(page.url) : page.url)
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) imgs.push(imgUrl)
      }
    } catch {}
  })

  if (!imgs.length) $('#readerarea img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (src?.startsWith('http') && !src.includes('placeholder')) imgs.push(src)
  })

  if (!imgs.length) throw new Error('No images found — site layout may not be supported')
  return imgs
}

// ── PDF builder ──────────────────────────────────────
async function buildPdfFromUrls(imageUrls, referer) {
  const { PDFDocument } = await loadPdfLib()
  const sharp   = await loadSharp()
  const pdfDoc  = await PDFDocument.create()
  let added = 0

  for (let i = 0; i < imageUrls.length; i++) {
    const imgPath = join(TMP, `manga_${Date.now()}_${i}.tmp`)
    try {
      const res  = await axios.get(imageUrls[i], { responseType: 'arraybuffer', timeout: 45_000, headers: { 'User-Agent': UA, 'Referer': referer } })
      let mime   = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim()
      fs.writeFileSync(imgPath, Buffer.from(res.data))

      if (!['image/jpeg', 'image/png'].includes(mime)) {
        const conv = await sharp(imgPath).jpeg({ quality: 85 }).toBuffer()
        fs.writeFileSync(imgPath, conv); mime = 'image/jpeg'
      }

      let buf = fs.readFileSync(imgPath)
      let image
      try { image = mime === 'image/png' ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf) }
      catch { const conv = await sharp(buf).jpeg({ quality: 85 }).toBuffer(); image = await pdfDoc.embedJpg(conv) }
      buf = null

      const page = pdfDoc.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      added++
    } catch (e) {
      console.warn(`[manga] skipped image ${i + 1}:`, e.message)
    } finally {
      try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath) } catch {}
    }
  }

  if (added === 0) throw new Error('No images could be embedded into PDF')
  return Buffer.from(await pdfDoc.save())
}

// ── MangaDex API ─────────────────────────────────────
async function mdApi(path, params = {}) {
  const { data } = await axios.get(`${BASE}${path}`, { params, timeout: 25_000, headers: { 'User-Agent': UA } })
  return data
}

async function searchMangaDex(query) {
  const data = await mdApi('/manga', { title: query, limit: 8, 'order[relevance]': 'desc', includes: ['cover_art'] })
  return (data.data || []).map(m => {
    const attrs    = m.attributes
    const title    = attrs.title?.en || Object.values(attrs.title || {})[0] || 'Unknown'
    const coverRel = m.relationships?.find(r => r.type === 'cover_art')
    const cover    = coverRel?.attributes?.fileName
      ? `https://uploads.mangadex.org/covers/${m.id}/${coverRel.attributes.fileName}.256.jpg` : null
    const lang     = attrs.originalLanguage || '?'
    const typeTag  = lang === 'ko' ? 'manhwa' : lang === 'zh' || lang === 'zh-hk' ? 'manhua' : 'manga'
    return { id: m.id, title, cover, type: typeTag, status: attrs.status || '?', year: attrs.year || '?' }
  })
}

async function scrapeAsuraMeta(mangaUrl) {
  try {
    const html = await fetchHtml(mangaUrl)
    const $    = cheerio.load(html)
    const cover = $('meta[property="og:image"]').attr('content') || null
    const desc  = $('meta[property="og:description"]').attr('content') || ''
    const title = $('meta[property="og:title"]').attr('content')?.replace(/\s*\|\s*Asura Scans$/, '').trim() || ''
    return { cover, desc: desc.slice(0, 400) + (desc.length > 400 ? '…' : ''), title }
  } catch { return null }
}

async function fetchMDexMeta(mangaId) {
  const data = await mdApi(`/manga/${mangaId}`, { includes: ['cover_art'] })
  const attrs = data.data?.attributes || {}
  const desc  = attrs.description?.en || Object.values(attrs.description || {})[0] || 'No description available.'
  const coverRel = data.data?.relationships?.find(r => r.type === 'cover_art')
  const cover = coverRel?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${mangaId}/${coverRel.attributes.fileName}.512.jpg` : null
  return { desc: desc.slice(0, 400) + (desc.length > 400 ? '…' : ''), cover }
}

async function fetchMDexChapters(mangaId) {
  const chapters = []
  let offset = 0
  while (true) {
    const data = await mdApi(`/manga/${mangaId}/feed`, {
      limit: 500, offset, 'translatedLanguage[]': 'en',
      'order[chapter]': 'asc', 'order[volume]': 'asc',
      'contentRating[]': ['safe', 'suggestive', 'erotica'],
    })
    for (const ch of data.data || []) {
      const a   = ch.attributes
      const num = parseFloat(a.chapter)
      if (isNaN(num)) continue
      const existing = chapters.find(c => c.num === num)
      if (!existing || (a.pages || 0) > existing.pages) {
        const idx   = chapters.findIndex(c => c.num === num)
        const entry = { id: ch.id, num, title: a.title || `Chapter ${a.chapter}`, pages: a.pages || 0 }
        if (idx === -1) chapters.push(entry); else chapters[idx] = entry
      }
    }
    if ((data.data || []).length < 500) break
    offset += 500
  }
  return chapters.sort((a, b) => a.num - b.num)
}

async function fetchMDexPages(chapterId) {
  const data = await mdApi(`/at-home/server/${chapterId}`)
  const base = data.baseUrl, hash = data.chapter?.hash
  const pages = data.chapter?.data || []
  return pages.map(f => `${base}/data/${hash}/${f}`)
}

async function buildMDexPdf(imageUrls) {
  const { PDFDocument } = await loadPdfLib()
  const pdfDoc = await PDFDocument.create()
  let added = 0
  for (let i = 0; i < imageUrls.length; i++) {
    const imgPath = join(TMP, `mdex_${Date.now()}_${i}.tmp`)
    try {
      const res  = await axios.get(imageUrls[i], { responseType: 'arraybuffer', timeout: 45_000, headers: { 'User-Agent': UA } })
      const mime = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim()
      fs.writeFileSync(imgPath, Buffer.from(res.data))
      let buf = fs.readFileSync(imgPath)
      let image
      try { image = mime === 'image/png' ? await pdfDoc.embedPng(buf) : await pdfDoc.embedJpg(buf) }
      catch { continue }
      buf = null
      const page = pdfDoc.addPage([image.width, image.height])
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
      added++
    } catch {} finally {
      try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath) } catch {}
    }
  }
  if (added === 0) throw new Error('No images could be downloaded')
  return Buffer.from(await pdfDoc.save())
}

// ── Scrap direct chapter page ─────────────────────────
async function scrapeDirectChapter(url) {
  const imgs   = await scrapeChapterImages(url)
  const pdf    = await buildPdfFromUrls(imgs, url)
  return { imgs, pdf }
}

// ─────────────────────────────────────────────
//  COMMAND HANDLERS
// ─────────────────────────────────────────────

export async function run({ sock, msg, args, cmd, chat, reply, isOwner, isMod }) {

  // /manga <title> — search MangaDex
  if (cmd === 'manga') {
    if (!args.length) return reply(fmt('ᴍᴀɴɢᴀ',
      `${field(sc('usage'), '/manga <title>')}\n` +
      `${field(sc('then'),  '/mangaload <n> → /mangadl <n>')}`
    ))
    await reply(fmt('ᴍᴀɴɢᴀ', field(sc('status'), 'searching...')))
    try {
      const results = await searchMangaDex(args.join(' '))
      if (!results.length) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'no results found')))
      mangaSessions.set(chat, { results, manga: null, chapters: [] })
      const list = results.map((m, i) =>
        `${i + 1}. ${m.title}  ·  ${m.type}  ·  ${m.year}`
      ).join('\n')
      await reply(fmt('ᴍᴀɴɢᴀ', `${list}\n\n${field(sc('next'), '/mangaload <n>')}`))

      // send cover + description of result #1 as preview
      try {
        const meta = await fetchMDexMeta(results[0].id)
        if (meta.cover) {
          const coverBuf = Buffer.from((await axios.get(meta.cover, { responseType: 'arraybuffer', timeout: 20_000, headers: { 'User-Agent': UA } })).data)
          await sock.sendMessage(chat, {
            image: coverBuf,
            caption: fmt('ᴍᴀɴɢᴀ',
              `${field(sc('title'), results[0].title)}\n` +
              `${field(sc('desc'),  meta.desc)}\n\n` +
              `${field(sc('tip'),   'use /mangaload <n> to pick another')}`
            )
          }, { quoted: msg })
        }
      } catch {}
      return
    } catch (e) {
      return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), e.message)))
    }
  }

  // /mangaload <n>
  if (cmd === 'mangaload') {
    const session = mangaSessions.get(chat)
    if (!session?.results?.length) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'search first with /manga <title>')))
    const n = parseInt(args[0])
    if (isNaN(n) || n < 1 || n > session.results.length) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), `pick 1–${session.results.length}`)))
    const picked = session.results[n - 1]
    await reply(fmt('ᴍᴀɴɢᴀ', field(sc('loading'), picked.title)))
    try {
      const chapters = await fetchMDexChapters(picked.id)
      if (!chapters.length) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'no english chapters found')))
      session.manga    = picked
      session.chapters = chapters
      const preview = chapters.slice(0, 30).map(c => `⚘ Ch${c.num} — ${c.title}`).join('\n')
      const more    = chapters.length > 30 ? `\n...and ${chapters.length - 30} more` : ''

      // send cover + description first
      try {
        const meta = await fetchMDexMeta(picked.id)
        if (meta.cover) {
          const coverBuf = Buffer.from((await axios.get(meta.cover, { responseType: 'arraybuffer', timeout: 20_000, headers: { 'User-Agent': UA } })).data)
          await sock.sendMessage(chat, {
            image: coverBuf,
            caption: fmt('ᴍᴀɴɢᴀ',
              `${field(sc('title'),  picked.title)}\n` +
              `${field(sc('type'),   picked.type)}\n` +
              `${field(sc('year'),   picked.year?.toString() || '?')}\n` +
              `${field(sc('status'), picked.status)}\n\n` +
              `${field(sc('desc'),   meta.desc)}`
            )
          }, { quoted: msg })
        }
      } catch {}

      return reply(fmt('ᴍᴀɴɢᴀ',
        `${field(sc('chapters'), `${chapters.length} available`)}\n\n` +
        `${preview}${more}\n\n` +
        `${field(sc('dl'), '/mangadl <n> or /mangadl 1-5')}`
      ))
    } catch (e) {
      return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), e.message)))
    }
  }

  // /mangadl <n> or <n>-<m>
  if (cmd === 'mangadl') {
    const session = mangaSessions.get(chat)
    if (!session?.manga || !session?.chapters?.length)
      return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'load a manga first with /manga then /mangaload')))

    const input = (args[0] || '').trim()
    if (!input) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('usage'), '/mangadl <n> or /mangadl 1-5')))

    let targets = []
    if (input.includes('-')) {
      const [a, b] = input.split('-').map(Number)
      if (isNaN(a) || isNaN(b) || a < 1 || b < a) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'invalid range')))
      if (b - a + 1 > 5) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), 'max 5 chapters at once')))
      targets = session.chapters.filter(c => c.num >= a && c.num <= b)
    } else {
      const found = session.chapters.find(c => c.num === parseFloat(input))
      if (!found) return reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), `chapter ${input} not found`)))
      targets = [found]
    }

    await reply(fmt('ᴍᴀɴɢᴀ', field(sc('downloading'), `${targets.length} chapter(s)...`)))

    for (const ch of targets) {
      try {
        const pages = await fetchMDexPages(ch.id)
        if (!pages.length) { await reply(fmt('ᴍᴀɴɢᴀ', field(sc('warn'), `Ch${ch.num} — no pages`))); continue }
        const pdf  = await buildMDexPdf(pages)
        const safe = session.manga.title.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 25)
        await sock.sendMessage(chat, {
          document: pdf,
          fileName: `${safe} - Ch${ch.num}.pdf`,
          mimetype: 'application/pdf',
          caption:  fmt('ᴍᴀɴɢᴀ',
            `${field(sc('title'),   session.manga.title)}\n` +
            `${field(sc('chapter'), `${ch.num} — ${ch.title}`)}\n` +
            `${field(sc('pages'),   pages.length.toString())}`
          )
        }, { quoted: msg })
      } catch (e) {
        await reply(fmt('ᴍᴀɴɢᴀ', field(sc('error'), `Ch${ch.num}: ${e.message}`)))
      }
    }
    return
  }

  // /murl <chapter_url>  OR  /murl <manga_url> | 5 -> 10
  if (cmd === 'murl') {
    if (!isOwner && !isMod) return reply(DENY[PERM.MOD])
    const raw = args.join(' ').trim()
    if (!raw) return reply(fmt('ᴍᴜʀʟ',
      `${field(sc('usage'),  '/murl <chapter_url>')}\n` +
      `${field(sc('range'),  '/murl <manga_url> | 5 -> 10')}`
    ))

    const rangeMatch = raw.match(/^(https?:\/\/\S+)\s*\|\s*(\d+)\s*->\s*(\d+)$/)

    if (rangeMatch) {
      const [, mangaUrl, startStr, endStr] = rangeMatch
      const [start, end] = [parseInt(startStr), parseInt(endStr)]
      if (end < start) return reply(fmt('ᴍᴜʀʟ', field(sc('error'), 'end must be ≥ start')))
      await reply(fmt('ᴍᴜʀʟ', field(sc('status'), 'fetching chapter list...')))

      // Scrape chapter list from the manga page via cheerio
      try {
        const html = await fetchHtml(mangaUrl)
        const $ = cheerio.load(html)

        // pull cover + description from og: meta tags (already have the html)
        try {
          const cover = $('meta[property="og:image"]').attr('content') || null
          const desc  = ($('meta[property="og:description"]').attr('content') || '').slice(0, 400)
          const title = ($('meta[property="og:title"]').attr('content') || '').replace(/\s*\|\s*Asura Scans$/, '').trim()
          if (cover) {
            const sharp = await loadSharp()
            const rawBuf = Buffer.from((await axios.get(cover, { responseType: 'arraybuffer', timeout: 20_000, headers: { 'User-Agent': UA } })).data)
            const jpegBuf = await sharp(rawBuf).jpeg({ quality: 85 }).toBuffer()
            await sock.sendMessage(chat, {
              image: jpegBuf,
              mimetype: 'image/jpeg',
              caption: fmt('ᴍᴜʀʟ',
                `${field(sc('title'), title || 'Unknown')}\n` +
                `${field(sc('desc'),  desc  || 'No description.')}` +
                `\n\n${field(sc('range'), `Ch ${startStr} → ${endStr}`)}`
              )
            }, { quoted: msg })
          }
        } catch {}
        const origin = new URL(mangaUrl).origin
        const comicSlug = new URL(mangaUrl).pathname.split('/').filter(Boolean).pop() || ''
        const chapters = []

        $('astro-island[props]').each((_, el) => {
          if (chapters.length) return
          try {
            const props = JSON.parse($(el).attr('props').replace(/&quot;/g, '"').replace(/&#39;/g, "'"))
            if (!props.chapters) return
            for (const chRaw of props.chapters[1]) {
              const ch     = chRaw[1]
              const number = decodeAstro(ch.number)
              const slug   = decodeAstro(ch.slug)
              if (number != null && slug)
                chapters.push({ number, url: `${origin}/comics/${comicSlug}/chapter/${slug}` })
            }
            chapters.sort((a, b) => a.number - b.number)
          } catch {}
        })

        const targets = chapters.filter(ch => ch.number >= start && ch.number <= end)
        if (!targets.length) return reply(fmt('ᴍᴜʀʟ', field(sc('error'), `no chapters found in range ${start}→${end}`)))

        for (let i = 0; i < targets.length; i++) {
          const ch = targets[i]
          // progress ping every 5 chapters so watchdog doesn't kill the bot mid-job
          if (i > 0 && i % 5 === 0) {
            await reply(fmt('ᴍᴜʀʟ', field(sc('progress'), `${i}/${targets.length} done...`)))
          }
          try {
            const { pdf, imgs } = await scrapeDirectChapter(ch.url)
            await sock.sendMessage(chat, {
              document: pdf, fileName: `Chapter-${ch.number}.pdf`, mimetype: 'application/pdf',
              caption: fmt('ᴍᴜʀʟ', `${field(sc('chapter'), ch.number.toString())}\n${field(sc('pages'), imgs.length.toString())}`)
            }, { quoted: msg })
          } catch (e) {
            await reply(fmt('ᴍᴜʀʟ', field(sc('error'), `Ch${ch.number}: ${e.message}`)))
          }
        }
      } catch (e) {
        return reply(fmt('ᴍᴜʀʟ', field(sc('error'), e.message)))
      }

    } else if (raw.startsWith('http')) {
      await reply(fmt('ᴍᴜʀʟ', field(sc('status'), 'scraping chapter...')))
      try {
        const { pdf, imgs } = await scrapeDirectChapter(raw)
        const chNum = raw.match(/chapter[-_]?(\d+)/i)?.[1] || '?'
        await sock.sendMessage(chat, {
          document: pdf, fileName: `Chapter-${chNum}.pdf`, mimetype: 'application/pdf',
          caption: fmt('ᴍᴜʀʟ', `${field(sc('chapter'), chNum)}\n${field(sc('pages'), imgs.length.toString())}`)
        }, { quoted: msg })
      } catch (e) {
        return reply(fmt('ᴍᴜʀʟ', field(sc('error'), e.message)))
      }
    } else {
      return reply(fmt('ᴍᴜʀʟ', field(sc('error'), 'provide a valid https:// url')))
    }
  }
}
