// ═══════════════════════════════════════════════════════
//   🔄 FILE CONVERTER — Media Conversion Plugin
//   tomp3, tomp4, toimg, togif, tovideo, toaudio,
//   topdf, toqr, tourl, imgtopdf
//   Uses ffmpeg-static. No external API needed.
// ═══════════════════════════════════════════════════════
import { fmt, field, sc, sleep }       from '../../lib/utils.js'
import { downloadMediaMessage }         from 'baileys'
import { fileTypeFromBuffer }           from 'file-type'
import { spawn }                        from 'child_process'
import { createWriteStream, promises as fsp } from 'fs'
import path                             from 'path'
import { fileURLToPath }                from 'url'
import { tmpdir }                       from 'os'
import crypto                           from 'crypto'

// ── ffmpeg path ────────────────────────────────────────
let ffmpegPath
try {
  const { default: fp } = await import('ffmpeg-static')
  ffmpegPath = fp
} catch {
  ffmpegPath = 'ffmpeg'
}

// ── QR code ────────────────────────────────────────────
let QRCode
try { const m = await import('qrcode'); QRCode = m.default } catch {}

// ── Jimp for image ops ─────────────────────────────────
let Jimp
try { const m = await import('jimp'); Jimp = m.Jimp || m.default } catch {}

// ── PDFKit ─────────────────────────────────────────────
let PDFDocument
try { const m = await import('pdfkit'); PDFDocument = m.default } catch {}

// ── Helpers ────────────────────────────────────────────
const tmp   = () => path.join(tmpdir(), crypto.randomUUID())
const delay = (ms) => new Promise(r => setTimeout(r, ms))

async function ffmpegConvert(inputBuffer, args, outExt) {
  const inPath  = tmp()
  const outPath = tmp() + '.' + outExt
  await fsp.writeFile(inPath, inputBuffer)
  await new Promise((res, rej) => {
    const proc = spawn(ffmpegPath, ['-y', '-i', inPath, ...args, outPath])
    proc.on('close', code => code === 0 ? res() : rej(new Error('ffmpeg failed')))
    proc.stderr.on('data', () => {})
  })
  const buf = await fsp.readFile(outPath)
  await fsp.unlink(inPath).catch(() => {})
  await fsp.unlink(outPath).catch(() => {})
  return buf
}

// ══════════════════════════════════════════════════════
//  MAIN EXPORT
// ══════════════════════════════════════════════════════
export async function run({ sock, msg, cmd, args, chat, sender, reply }) {

  // ── /tomp3 — video/audio → mp3 ────────────────────────
  if (cmd === 'tomp3' || cmd === 'toaudio') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to a video or audio to convert it to mp3')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('converting to mp3... please wait')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const out    = await ffmpegConvert(buffer, ['-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k'], 'mp3')
      await sock.sendMessage(chat, { audio: out, mimetype: 'audio/mpeg' }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /tomp4 — gif/video → mp4 ──────────────────────────
  if (cmd === 'tomp4' || cmd === 'tovideo') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to a video or gif to convert it to mp4')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('converting to mp4... please wait')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const out    = await ffmpegConvert(buffer, ['-c:v', 'libx264', '-preset', 'fast', '-crf', '28'], 'mp4')
      await sock.sendMessage(chat, { video: out, mimetype: 'video/mp4' }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /toimg / /tojpeg — sticker/video → image ──────────
  if (cmd === 'toimg' || cmd === 'tojpeg') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to a sticker or video to convert it to an image')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('converting... please wait')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const out    = await ffmpegConvert(buffer, ['-vframes', '1', '-f', 'image2'], 'jpg')
      await sock.sendMessage(chat, { image: out, mimetype: 'image/jpeg' }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /togif — video → gif ──────────────────────────────
  if (cmd === 'togif') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to a video to convert it to a gif')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('converting to gif... please wait')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const out    = await ffmpegConvert(buffer, ['-vf', 'fps=10,scale=320:-1:flags=lanczos', '-loop', '0'], 'gif')
      await sock.sendMessage(chat, {
        video: out,
        mimetype: 'video/mp4',
        gifPlayback: true,
      }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /tourl — file → hosted URL ────────────────────────
  if (cmd === 'tourl') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to any file to get a hosted URL')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('uploading... please wait')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const ft     = await fileTypeFromBuffer(buffer)
      const ext    = ft?.ext || 'bin'
      const mime   = ft?.mime || 'application/octet-stream'

      const FormData = (await import('form-data')).default
      const axios    = (await import('axios')).default
      const form     = new FormData()
      form.append('file', buffer, { filename: `file.${ext}`, contentType: mime })

      const { data } = await axios.post('https://graph.org/upload', form, {
        headers: form.getHeaders()
      })
      const url = 'https://graph.org' + data[0].src
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ',
        `${field(sc('url'), url)}\\n${sc('tap to copy ↑')}`
      ))
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /toqr — text → QR code ────────────────────────────
  if (cmd === 'toqr') {
    const text = args.join(' ').trim()
    if (!text) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('usage: /toqr [text or url]')))
    if (!QRCode) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('qrcode package not installed')))

    try {
      const buf = await QRCode.toBuffer(text, { type: 'png', width: 512 })
      await sock.sendMessage(chat, { image: buf, mimetype: 'image/png', caption: text }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }

  // ── /imgtopdf / /topdf — image → PDF ─────────────────
  if (cmd === 'imgtopdf' || cmd === 'topdf') {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('reply to an image to convert it to pdf')))
    if (!PDFDocument) return reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('pdfkit package not installed')))

    await reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', sc('converting to pdf...')))
    try {
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {})
      const outPath = tmp() + '.pdf'
      const doc     = new PDFDocument({ autoFirstPage: false })
      const chunks  = []
      doc.on('data', c => chunks.push(c))
      const done = new Promise(res => doc.on('end', res))
      doc.addPage().image(buffer, 0, 0, { fit: [595, 842], align: 'center', valign: 'center' })
      doc.end()
      await done
      const pdfBuf = Buffer.concat(chunks)
      await sock.sendMessage(chat, {
        document: pdfBuf,
        mimetype: 'application/pdf',
        fileName: 'converted.pdf',
      }, { quoted: msg })
    } catch (e) {
      reply(fmt('🔄 ᴄᴏɴᴠᴇʀᴛᴇʀ', field(sc('error'), e.message)))
    }
    return
  }
}
