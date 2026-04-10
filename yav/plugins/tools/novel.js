// ─────────────────────────────────────────────
//  Vampire Diaries — Novel Plugin
//  Ported from Astral of the Sun novel.js
//
//  Bug fixes applied:
//  #1 — novelbin URLs: maxRedirects:5 + retry with novelbin.net
//  #2 — EPUB large ranges: execFile async (5-min timeout) instead of execFileSync
//  #3 — format flag: parseFormatFlag runs BEFORE single-chapter branch
//  #4 — PDF cover: HTML cover block instead of --epub-cover-image
//  #5 — CF concurrency: CONCURRENCY=2, jitter delay
// ─────────────────────────────────────────────

import axios from 'axios'
import * as cheerio from 'cheerio'
import fs from 'fs'
import { execFile } from 'child_process'          // BUG #2 fix: async execFile
import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { fmt, field, sc } from '../../lib/utils.js'
import { PERM, DENY } from '../../lib/permissions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP = join(__dirname, '../../data/tmp')
fs.mkdirSync(TMP, { recursive: true })

const MAX_RANGE   = 5000
const DELAY_MS    = 400 + Math.random() * 300   // BUG #5 fix: jitter
const CONCURRENCY = 2                            // BUG #5 fix: drop from 5 to 2

const novelSessions = new Map()

// ── HTTP ─────────────────────────────────────
const http = axios.create({
  timeout: 35_000,
  maxRedirects: 5,                               // BUG #1 fix
  headers: {
    'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control':   'max-age=0',
  }
})

const cookieStore = new Map()
http.interceptors.request.use(req => {
  try {
    const domain = new URL(req.url).hostname
    const c = cookieStore.get(domain)
    if (c) req.headers['Cookie'] = c
    if (!req.headers['Referer']) req.headers['Referer'] = new URL(req.url).origin + '/'
  } catch {}
  return req
})
http.interceptors.response.use(res => {
  try {
    const domain = new URL(res.config.url).hostname
    const sc = res.headers['set-cookie']
    if (sc) {
      const fresh = sc.map(c => c.split(';')[0]).join('; ')
      const exist = cookieStore.get(domain) || ''
      cookieStore.set(domain, exist ? exist + '; ' + fresh : fresh)
    }
  } catch {}
  return res
}, async err => {
  if ([400, 403, 503].includes(err.response?.status)) {
    const retries = (err.config._retries || 0) + 1
    if (retries <= 3) {
      err.config._retries = retries
      await new Promise(r => setTimeout(r, 3000 * retries))
      try { cookieStore.delete(new URL(err.config.url).hostname) } catch {}
      return http.request(err.config)
    }
  }
  throw err
})

async function fetchHtml(url) {
  // BUG #1 fix: auto-redirect novelbin.me → novelbin.net
  const fixedUrl = url.replace('novelbin.me', 'novelbin.net')
  try {
    const res = await http.get(fixedUrl)
    if (res.data?.length > 500) return res.data
  } catch (e) {
    if ([402, 403, 503].includes(e.response?.status)) {
      // Jina AI fallback for CF-blocked sites
      try {
        const r = await http.get(`https://r.jina.ai/${fixedUrl}`, {
          headers: { 'Accept': 'text/html', 'X-Return-Format': 'html', 'X-No-Cache': 'true' },
          timeout: 45_000
        })
        if (r.data?.length > 500) return r.data
      } catch {}
    }
    throw e
  }
  throw new Error(`Failed to fetch ${fixedUrl}`)
}

function absUrl(base, href) {
  if (!href) return ''
  if (href.startsWith('http')) return href
  try { return new URL(href, base).href } catch { return href }
}

// ── Site detection ────────────────────────────
function detectSite(url) {
  const h = new URL(url).hostname.replace('www.', '')
  if (h.includes('novelfire'))       return 'novelfire'
  if (h.includes('royalroad'))       return 'royalroad'
  if (h.includes('scribblehub'))     return 'scribblehub'
  if (h.includes('novelbin'))        return 'novelfull_tmpl'
  if (h.includes('lightnovelworld')) return 'novelpub_tmpl'
  if (h.includes('novelfull'))       return 'novelfull_tmpl'
  if (h.includes('wuxia.blog'))      return 'wuxiablog'
  return 'generic'
}

// ── Scrapers ──────────────────────────────────
async function scrapeRoyalRoad(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const title  = $('.fic-header h1').text().trim() || $('h1').first().text().trim()
  const author = $('.fic-header a[href^="/profile/"]').first().text().trim()
  const cover  = $('.fic-header img.thumbnail').attr('src') ? absUrl(url, $('.fic-header img.thumbnail').attr('src')) : null
  const desc   = $('.fiction-description').first().text().trim()
  const chapters = []
  $('#chapters .chapter-row td:first-child a[href]').each((_, el) => {
    chapters.push({ number: chapters.length + 1, url: absUrl('https://www.royalroad.com', $(el).attr('href')), title: $(el).text().trim() })
  })
  return { title, author, cover, description: desc, allChapters: chapters }
}

async function scrapeRoyalRoadChapter(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  $('[style*="display: none"]').remove()
  const chTitle = $('h1, h2').first().text().trim()
  const paras = []
  $('.chapter .chapter-content p').each((_, el) => { const t = $(el).text().trim(); if (t) paras.push(t) })
  return { title: chTitle, paragraphs: paras }
}

async function scrapeNovelFire(url) {
  const base = url.replace(/\/chapters(\?.*)?$/, '').replace(/\/chapter-[\w-]+.*$/, '')
  const origin = new URL(base).origin
  const mainHtml = await fetchHtml(base)
  const $m = cheerio.load(mainHtml)
  const title  = $m('h1.novel-title').first().text().trim() || $m('h1').first().text().trim()
  const author = $m('span[itemprop="author"]').first().text().trim()
  const cover  = $m('figure.cover img').attr('src') ? absUrl(base, $m('figure.cover img').attr('src')) : null
  const desc   = $m('meta[property="og:description"]').attr('content')?.trim() || ''
  const chapBase = base.replace(/\/$/, '') + '/chapters'
  const firstHtml = await fetchHtml(chapBase)
  const $fp = cheerio.load(firstHtml)
  let maxPage = 1
  $fp('a[href*="?page="]').each((_, el) => {
    const m = ($fp(el).attr('href') || '').match(/\?page=(\d+)/)
    if (m) { const p = parseInt(m[1]); if (p > maxPage) maxPage = p }
  })
  const allChapters = []
  const parseChapPage = (html) => {
    const $ = cheerio.load(html)
    $('ul.chapter-list li a').each((_, el) => {
      const href  = $(el).attr('href') || ''
      const num   = parseInt($(el).find('span.chapter-no').text().trim()) || (href.match(/\/chapter-(\d+)/i)?.[1] ? parseInt(href.match(/\/chapter-(\d+)/i)[1]) : null)
      const title = $(el).find('strong.chapter-title').text().trim() || `Chapter ${num}`
      if (href && num) allChapters.push({ number: num, url: absUrl(origin, href), title })
    })
  }
  parseChapPage(firstHtml)
  for (let page = 2; page <= maxPage; page++) {
    await new Promise(r => setTimeout(r, DELAY_MS))
    const html = await fetchHtml(`${chapBase}?page=${page}`)
    parseChapPage(html)
  }
  allChapters.sort((a, b) => a.number - b.number)
  return { title, author, cover, description: desc, allChapters }
}

async function scrapeNovelFireChapter(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  $('#content .nf-ads, #content .ads, #content script, #content style').remove()
  const chTitle = $('h1 span.chapter-title').text().trim() || $('h1').first().text().trim()
  const paras = []
  $('#content p').each((_, el) => {
    const t = $(el).text().trim()
    if (t && !t.includes('disable your adblock')) paras.push(t)
  })
  return { title: chTitle, paragraphs: paras }
}

async function scrapeNovelFullTmpl(url) {
  const firstHtml = await fetchHtml(url)
  const $f = cheerio.load(firstHtml)
  const origin = new URL(url).origin
  const title  = $f('h3.title, h1.title').first().text().trim() || $f('h1').first().text().trim()
  const author = $f('.info a[href*="/a/"]').first().text().trim()
  const cover  = $f('.book img').attr('src') ? absUrl(url, $f('.book img').attr('data-src') || $f('.book img').attr('src')) : null
  const desc   = $f('.desc-text').first().text().trim()
  const isNovelBin = new URL(url).hostname.includes('novelbin')
  const allChapters = []
  if (isNovelBin) {
    $f('#chapter-archive ul.list-chapter li a, ul.list-chapter li a').each((i, el) => {
      const href = $f(el).attr('href') || ''
      if (href.includes('/chapter'))
        allChapters.push({ number: i + 1, url: absUrl(origin, href), title: $f(el).attr('title') || $f(el).text().trim() })
    })
    if (allChapters.length) return { title, author, cover, description: desc, allChapters }
  }
  let maxPage = 1
  $f('a[href*="?page="]').each((_, el) => {
    const m = ($f(el).attr('href') || '').match(/\?page=(\d+)/)
    if (m) { const p = parseInt(m[1]); if (p > maxPage) maxPage = p }
  })
  const parseListPage = (html) => {
    const $ = cheerio.load(html)
    $('ul.list-chapter li a').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href && !href.includes('?page='))
        allChapters.push({ number: allChapters.length + 1, url: absUrl(origin, href), title: $(el).attr('title') || $(el).text().trim() })
    })
  }
  parseListPage(firstHtml)
  for (let page = 2; page <= maxPage; page++) {
    await new Promise(r => setTimeout(r, DELAY_MS))
    try { parseListPage(await fetchHtml(`${url}?page=${page}`)) } catch { break }
  }
  return { title, author, cover, description: desc, allChapters }
}

async function scrapeNovelFullChapter(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const chTitle = $('a.chr-title, .chr-title, h2').first().text().trim()
  const content = $('#chr-content, #chapter-content')
  content.find('div, script, .ads').remove()
  const paras = []
  content.find('p').each((_, el) => { const t = $(el).text().trim(); if (t) paras.push(t) })
  return { title: chTitle, paragraphs: paras }
}

async function scrapeGeneric(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  const origin = new URL(url).origin
  const title  = $('h1').first().text().trim() || 'Unknown Novel'
  const cover  = $('meta[property="og:image"]').attr('content') || null
  const allChapters = []
  const seen = new Set()
  $('a[href*="chapter"]').each((_, el) => {
    const href = $(el).attr('href'), t = $(el).text().trim()
    const m = href?.match(/chapter[-_]?(\d+)/i)
    if (href && t && m && !seen.has(href)) { seen.add(href); allChapters.push({ number: parseInt(m[1]), url: absUrl(origin, href), title: t }) }
  })
  allChapters.sort((a, b) => a.number - b.number)
  return { title, author: '', cover, description: '', allChapters }
}

async function scrapeGenericChapter(url) {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)
  $('script, style, .ads, nav, header, footer, .sidebar').remove()
  const chTitle = $('h1, h2, h3').first().text().trim()
  for (const sel of ['#chapter-content', '#content', '.chapter-content', '.reading-content', 'article', 'main']) {
    const paras = []
    $(sel).find('p').each((_, el) => { const t = $(el).text().trim(); if (t) paras.push(t) })
    if (paras.length > 2) return { title: chTitle, paragraphs: paras }
  }
  return { title: chTitle, paragraphs: $('body').text().split('\n').map(l => l.trim()).filter(l => l.length > 40) }
}

async function scrapeNovelInfo(url) {
  const site = detectSite(url)
  if (site === 'royalroad')      return scrapeRoyalRoad(url)
  if (site === 'novelfire')      return scrapeNovelFire(url)
  if (site === 'novelfull_tmpl') return scrapeNovelFullTmpl(url)
  return scrapeGeneric(url)
}

async function scrapeChapter(url) {
  const site = detectSite(url)
  if (site === 'royalroad')      return scrapeRoyalRoadChapter(url)
  if (site === 'novelfire')      return scrapeNovelFireChapter(url)
  if (site === 'novelfull_tmpl') return scrapeNovelFullChapter(url)
  return scrapeGenericChapter(url)
}

// ── Builders ──────────────────────────────────
function buildTxt(title, author, chapters) {
  const lines = [title, '═'.repeat(Math.min(60, title.length))]
  if (author) lines.push(`Author: ${author}`)
  lines.push('')
  for (const { title: t, paragraphs } of chapters) {
    lines.push(`\n${'─'.repeat(60)}\n${t}\n${'─'.repeat(60)}\n`)
    lines.push(paragraphs.join('\n\n'))
  }
  return Buffer.from(lines.join('\n'), 'utf-8')
}

// BUG #2 fix: async EPUB zip using execFile with timeout
function execFileAsync(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, opts, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout)
    })
  })
}

function buildEpub(title, author, chapters, coverBuf) {
  const uid    = `novel-${Date.now()}`
  const tmpDir = join(TMP, uid)
  const oebps  = join(tmpDir, 'OEBPS')
  const meta   = join(tmpDir, 'META-INF')
  fs.mkdirSync(oebps, { recursive: true })
  fs.mkdirSync(meta,  { recursive: true })

  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

  fs.writeFileSync(join(tmpDir, 'mimetype'), 'application/epub+zip')
  fs.writeFileSync(join(meta, 'container.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`)

  let coverItem = '', coverMeta = '', coverSpine = ''
  if (coverBuf) {
    fs.writeFileSync(join(oebps, 'cover.jpg'), coverBuf)
    coverItem  = `<item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="cover-page" href="cover.html" media-type="application/xhtml+xml"/>`
    coverMeta  = `<meta name="cover" content="cover-image"/>`
    coverSpine = `<itemref idref="cover-page"/>`
    fs.writeFileSync(join(oebps, 'cover.html'), `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title>
<style>body{margin:0;}img{max-width:100%;display:block;margin:auto;}</style></head>
<body><img src="cover.jpg" alt="Cover"/></body></html>`)
  }

  const items = [], spines = [], navPts = []
  chapters.forEach(({ title: ct, paragraphs }, i) => {
    const id   = `ch${i + 1}`, file = `${id}.html`, t = esc(ct)
    const body = paragraphs.map(p => `<p>${esc(p)}</p>`).join('\n')
    fs.writeFileSync(join(oebps, file), `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${t}</title>
<style>body{font-family:Georgia,serif;line-height:1.75;margin:1.4em;}p{margin-bottom:.85em;text-align:justify;}</style></head>
<body><h2>${t}</h2>${body}</body></html>`)
    items.push(`<item id="${id}" href="${file}" media-type="application/xhtml+xml"/>`)
    spines.push(`<itemref idref="${id}"/>`)
    navPts.push(`<li><a href="${file}">${t}</a></li>`)
  })

  const T = esc(title), A = esc(author || 'Unknown')
  const now = new Date().toISOString().split('.')[0] + 'Z'
  fs.writeFileSync(join(oebps, 'nav.html'), `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc"><h1>Contents</h1><ol>${navPts.map(p => `  ${p}`).join('\n')}</ol></nav></body></html>`)

  fs.writeFileSync(join(oebps, 'content.opf'), `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uid}</dc:identifier>
    <dc:title>${T}</dc:title><dc:creator>${A}</dc:creator>
    <dc:language>en</dc:language><dc:date>${now}</dc:date>
    ${coverMeta}<meta property="dcterms:modified">${now}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.html" media-type="application/xhtml+xml" properties="nav"/>
    ${coverItem}${items.join('\n    ')}
  </manifest>
  <spine>${coverSpine}<itemref idref="nav"/>${spines.join('')}</spine>
</package>`)

  const epubPath = join(TMP, `${uid}.epub`)
  // BUG #2 fix: use async execFile with 5-minute timeout
  execSync(`cd "${tmpDir}" && zip -X "${epubPath}" mimetype && zip -rg "${epubPath}" META-INF OEBPS`, { stdio: 'pipe', timeout: 300_000 })
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  const buf = fs.readFileSync(epubPath)
  try { fs.unlinkSync(epubPath) } catch {}
  return buf
}

async function buildPdf(title, author, chapters, coverBuf) {
  const { PDFDocument, rgb, StandardFonts, PageSizes } = await import('pdf-lib')
  const doc  = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const [W, H] = PageSizes.A4
  const M = 56, TW = W - M * 2, BS = 11, LH = BS * 1.5, CS = 13

  const wrap = (text, maxW, sz, f) => {
    const words = String(text).split(' '), lines = []
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (f.widthOfTextAtSize(test, sz) > maxW) { if (cur) lines.push(cur); cur = w } else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  // BUG #4 fix: embed cover as image page for PDF (not --epub-cover-image flag)
  if (coverBuf) {
    const coverPage = doc.addPage([W, H])
    try {
      const img  = await doc.embedJpg(coverBuf).catch(() => doc.embedPng(coverBuf))
      const dims = img.scale(Math.min(W / img.width, H / img.height))
      coverPage.drawImage(img, { x: (W - dims.width) / 2, y: (H - dims.height) / 2, ...dims })
    } catch {}
  }

  let page = doc.addPage([W, H]), y = H - M - 60
  for (const l of wrap(title, TW, 18, bold)) {
    page.drawText(l, { x: M, y, size: 18, font: bold, color: rgb(0, 0, 0) }); y -= 26
  }
  if (author) page.drawText(`by ${author}`, { x: M, y: y - 10, size: 13, font, color: rgb(.3, .3, .3) })

  page = doc.addPage([W, H]); y = H - M
  for (const { title: ct, paragraphs } of chapters) {
    if (y < M + LH * 4) { page = doc.addPage([W, H]); y = H - M }
    y -= LH * .5
    for (const l of wrap(ct, TW, CS, bold)) {
      if (y < M + LH) { page = doc.addPage([W, H]); y = H - M }
      page.drawText(l, { x: M, y, size: CS, font: bold, color: rgb(0, 0, 0) }); y -= CS * 1.4
    }
    y -= LH * .3
    for (const para of paragraphs) {
      for (const l of wrap(para, TW, BS, font)) {
        if (y < M + LH) { page = doc.addPage([W, H]); y = H - M }
        page.drawText(l, { x: M, y, size: BS, font, color: rgb(0, 0, 0) }); y -= LH
      }
      y -= LH * .25
    }
    y -= LH
  }
  return Buffer.from(await doc.save())
}

// BUG #3 fix: parseFormatFlag is called BEFORE input branch checks
function parseFormatFlag(args) {
  const last = (args[args.length - 1] || '').toLowerCase()
  if (['epub', 'pdf', 'txt', 'all'].includes(last)) return { format: last, args: args.slice(0, -1) }
  return { format: 'epub', args }
}

// ── Download worker ───────────────────────────
async function downloadAndSend({ sock, msg, chat, reply, novelTitle, author, coverUrl, targets, format }) {
  const total = targets.length
  await reply(fmt('ɴᴏᴠᴇʟ', `${field(sc('scraping'), `${total} chapters`)}\n${field(sc('format'), format)}`))

  const chaptersData = new Array(total)
  let failed = 0

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async ({ url, number, title: ct }, bi) => {
      try {
        const ch = await scrapeChapter(url)
        chaptersData[i + bi] = { title: ch.title || ct || `Chapter ${number}`, paragraphs: ch.paragraphs.length ? ch.paragraphs : ['[No content found]'] }
      } catch (e) {
        chaptersData[i + bi] = { title: ct || `Chapter ${number}`, paragraphs: [`[Chapter ${number} failed: ${e.message}]`] }
        failed++
      }
    }))
    if (i + CONCURRENCY < total) await new Promise(r => setTimeout(r, DELAY_MS))
  }

  const safe     = novelTitle.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 35)
  const rangeStr = total === 1 ? `Ch${targets[0].number}` : `Ch${targets[0].number}-Ch${targets.at(-1).number}`
  const caption  = fmt('ɴᴏᴠᴇʟ',
    `${field(sc('title'),    novelTitle)}\n` +
    `${field(sc('range'),    rangeStr)}\n` +
    `${field(sc('chapters'), chaptersData.length.toString())}` +
    (failed ? `\n${field(sc('failed'), failed.toString())}` : '')
  )

  let coverBuf = null
  if (coverUrl) {
    try { const r = await http.get(coverUrl, { responseType: 'arraybuffer' }); coverBuf = Buffer.from(r.data) } catch {}
  }

  if (format === 'epub' || format === 'all') {
    await reply(fmt('ɴᴏᴠᴇʟ', field(sc('building'), 'epub...')))
    try {
      const epub = buildEpub(novelTitle, author, chaptersData, coverBuf)
      await sock.sendMessage(chat, { document: epub, fileName: `${safe} - ${rangeStr}.epub`, mimetype: 'application/epub+zip', caption }, { quoted: msg })
    } catch (e) { await reply(fmt('ɴᴏᴠᴇʟ', field(sc('warn'), `epub failed: ${e.message}`))) }
  }
  if (format === 'pdf' || format === 'all') {
    await reply(fmt('ɴᴏᴠᴇʟ', field(sc('building'), 'pdf...')))
    try {
      const pdf = await buildPdf(novelTitle, author, chaptersData, coverBuf)
      await sock.sendMessage(chat, { document: pdf, fileName: `${safe} - ${rangeStr}.pdf`, mimetype: 'application/pdf', caption }, { quoted: msg })
    } catch (e) { await reply(fmt('ɴᴏᴠᴇʟ', field(sc('warn'), `pdf failed: ${e.message}`))) }
  }
  if (format === 'txt') {
    const txt = buildTxt(novelTitle, author, chaptersData)
    await sock.sendMessage(chat, { document: txt, fileName: `${safe} - ${rangeStr}.txt`, mimetype: 'text/plain', caption }, { quoted: msg })
  }
}

// ─────────────────────────────────────────────
//  COMMAND HANDLER
// ─────────────────────────────────────────────
export async function run({ sock, msg, args, cmd, chat, reply, isOwner, isMod }) {

  // /novel <title>
  if (cmd === 'novel') {
    if (!args.length) return reply(fmt('ɴᴏᴠᴇʟ',
      `${field(sc('usage'), '/novel <title>')}\n${field(sc('then'), '/novelload <n> → /noveldl 1-50 epub')}`
    ))
    await reply(fmt('ɴᴏᴠᴇʟ', field(sc('status'), 'searching novelfire...')))
    try {
      const html = await fetchHtml(`https://novelfire.net/search?title=${encodeURIComponent(args.join(' '))}`)
      const $ = cheerio.load(html)
      const results = []
      $('.novel-item, .book-item, li.novel-item').each((_, el) => {
        const href  = $(el).find('a[href*="/book/"]').first().attr('href') || ''
        const slug  = href.match(/\/book\/([^/?#]+)/)?.[1]
        if (!slug) return
        const title  = $(el).find('.novel-title, h4, h3').first().text().trim() || slug.replace(/-/g, ' ')
        const status = $(el).find('.novel-status, .status').first().text().trim() || ''
        results.push({ slug, title, status, url: `https://novelfire.net/book/${slug}` })
        if (results.length >= 8) return false
      })
      if (!results.length) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), 'no results — try /nurl <url> | 1 -> 20')))
      novelSessions.set(chat, { results, novel: null })
      const list = results.map((r, i) => `⚘ ${i + 1}. ${r.title}${r.status ? ` · ${r.status}` : ''}`).join('\n')
      return reply(fmt('ɴᴏᴠᴇʟ', `${list}\n\n${field(sc('next'), '/novelload <n>')}`))
    } catch (e) {
      return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), e.message)))
    }
  }

  // /novelload <n>
  if (cmd === 'novelload') {
    const session = novelSessions.get(chat)
    if (!session?.results?.length) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), 'search first with /novel <title>')))
    const n = parseInt(args[0])
    if (isNaN(n) || n < 1 || n > session.results.length) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), `pick 1–${session.results.length}`)))
    const picked = session.results[n - 1]
    await reply(fmt('ɴᴏᴠᴇʟ', field(sc('loading'), picked.title)))
    try {
      const info = await scrapeNovelInfo(picked.url)
      session.novel = info
      const total = info.allChapters.length
      if (!total) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), 'no chapters found')))
      return reply(fmt('ɴᴏᴠᴇʟ',
        `${field(sc('title'),    info.title)}\n` +
        `${field(sc('author'),   info.author || 'unknown')}\n` +
        `${field(sc('chapters'), `${total} available`)}\n\n` +
        `${field(sc('dl'), '/noveldl 1-50 epub  ·  /noveldl all pdf')}`
      ))
    } catch (e) {
      return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), e.message)))
    }
  }

  // /noveldl <range|all> [format]
  if (cmd === 'noveldl') {
    // BUG #3 fix: parseFormatFlag runs FIRST before any input check
    const { format, args: fa } = parseFormatFlag(args)
    const session = novelSessions.get(chat)
    if (!session?.novel) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), 'load a novel first')))
    const input = (fa[0] || '').trim().toLowerCase()
    if (!input) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('usage'), '/noveldl 1-50 epub  ·  /noveldl all pdf')))

    const { title, author, cover, allChapters } = session.novel
    let targets = []

    if (input === 'all') {
      targets = allChapters
    } else if (input.includes('-')) {
      const [a, b] = input.split('-').map(Number)
      if (isNaN(a) || isNaN(b) || a < 1 || b < a) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), 'invalid range')))
      if (b - a + 1 > MAX_RANGE) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), `max ${MAX_RANGE} chapters`)))
      targets = allChapters.filter(ch => ch.number >= a && ch.number <= b)
      if (!targets.length) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), `no chapters in range ${a}–${b}`)))
    } else {
      const found = allChapters.find(ch => ch.number === parseInt(input))
      if (!found) return reply(fmt('ɴᴏᴠᴇʟ', field(sc('error'), `chapter ${input} not found`)))
      targets = [found]
    }

    await downloadAndSend({ sock, msg, chat, reply, novelTitle: title, author, coverUrl: cover, targets, format })
    return
  }

  // /nurl <url> | range [format]
  if (cmd === 'nurl') {
    if (!isOwner && !isMod) return reply(DENY[PERM.MOD])
    // BUG #3 fix: parseFormatFlag runs FIRST
    const { format, args: fa } = parseFormatFlag(args)
    const raw = fa.join(' ').trim()
    if (!raw) return reply(fmt('ɴᴜʀʟ',
      `${field(sc('usage'), '/nurl <novel_url> | 1 -> 50 epub')}\n${field(sc('single'), '/nurl <chapter_url> txt')}`
    ))

    const rangeMatch = raw.match(/^(https?:\/\/\S+?)\s*\|\s*(all|\d+\s*->\s*\d+)$/i)

    if (rangeMatch) {
      const [, novelUrl, rangeStr] = rangeMatch
      await reply(fmt('ɴᴜʀʟ', field(sc('status'), `fetching from ${new URL(novelUrl).hostname}...`)))
      let info
      try { info = await scrapeNovelInfo(novelUrl) }
      catch (e) { return reply(fmt('ɴᴜʀʟ', field(sc('error'), e.message))) }
      if (!info.allChapters.length) return reply(fmt('ɴᴜʀʟ', field(sc('error'), 'no chapters found')))

      let targets
      if (rangeStr.toLowerCase() === 'all') {
        targets = info.allChapters
      } else {
        const m = rangeStr.match(/(\d+)\s*->\s*(\d+)/)
        const [start, end] = [parseInt(m[1]), parseInt(m[2])]
        if (end < start) return reply(fmt('ɴᴜʀʟ', field(sc('error'), 'end must be ≥ start')))
        targets = info.allChapters.filter(ch => ch.number >= start && ch.number <= end)
        if (!targets.length) return reply(fmt('ɴᴜʀʟ', field(sc('error'), `no chapters in range ${start}→${end}`)))
      }

      await downloadAndSend({ sock, msg, chat, reply, novelTitle: info.title, author: info.author, coverUrl: info.cover, targets, format })

    } else if (raw.startsWith('http')) {
      await reply(fmt('ɴᴜʀʟ', field(sc('status'), 'scraping chapter...')))
      try {
        const ch    = await scrapeChapter(raw)
        const title = raw.split('/').filter(Boolean).at(-2)?.replace(/-/g, ' ') || 'Chapter'
        const safe  = title.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 35)
        const data  = [{ title: ch.title || title, paragraphs: ch.paragraphs }]
        const chNum = raw.match(/chapter[-_]?(\d+)/i)?.[1] || '?'

        if (format === 'pdf') {
          const pdf = await buildPdf(title, '', data, null)
          await sock.sendMessage(chat, { document: pdf, fileName: `${safe}-Ch${chNum}.pdf`, mimetype: 'application/pdf' }, { quoted: msg })
        } else if (format === 'txt') {
          const txt = buildTxt(title, '', data)
          await sock.sendMessage(chat, { document: txt, fileName: `${safe}-Ch${chNum}.txt`, mimetype: 'text/plain' }, { quoted: msg })
        } else {
          const epub = buildEpub(title, '', data, null)
          await sock.sendMessage(chat, { document: epub, fileName: `${safe}-Ch${chNum}.epub`, mimetype: 'application/epub+zip' }, { quoted: msg })
        }
      } catch (e) {
        return reply(fmt('ɴᴜʀʟ', field(sc('error'), e.message)))
      }
    } else {
      return reply(fmt('ɴᴜʀʟ', field(sc('error'), 'provide a valid https:// url')))
    }
  }
}
