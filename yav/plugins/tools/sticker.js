import { fmt, field, sc } from '../../lib/utils.js'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import crypto from 'crypto'

const PACK   = 'Vampire Diaries'
const AUTHOR = 'Astral Anime'

function buildExif() {
  const json = JSON.stringify({
    'sticker-pack-id':        'vampire-diaries-astral',
    'sticker-pack-name':      PACK,
    'sticker-pack-publisher': AUTHOR,
    'emojis':                 ['🌙'],
  })
  const buf  = Buffer.from(json, 'utf-8')
  const exif = Buffer.alloc(22 + buf.length)
  exif.writeUInt32LE(buf.length, 18)
  buf.copy(exif, 22)
  // TIFF header
  exif[0] = 0x49; exif[1] = 0x49; exif[2] = 0x2a; exif[4] = 0x08
  exif[8] = 0x01; exif[10] = 0x41; exif[11] = 0x57; exif[12] = 0x07
  exif[16] = 0x16
  return exif
}

async function toWebp(buffer, isAnimated = false) {
  const tmp   = join(tmpdir(), crypto.randomBytes(8).toString('hex'))
  const input = tmp + '_in'
  const out   = tmp + '.webp'

  writeFileSync(input, buffer)

  await new Promise((resolve, reject) => {
    const cmd = ffmpeg(input)
      .outputOptions([
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec', 'libwebp',
        ...(isAnimated ? ['-loop', '0', '-an', '-vsync', '0'] : ['-vframes', '1']),
        '-lossless', '0', '-compression_level', '6', '-q:v', '80',
        '-preset', 'default',
      ])
      .output(out)
      .on('end', resolve)
      .on('error', reject)
    cmd.run()
  })

  const webp = readFileSync(out)
  try { unlinkSync(input); unlinkSync(out) } catch {}
  return webp
}

export async function run({ sock, msg, args, chat, reply, quoted }) {
  const q    = quoted || msg
  const mime = q?.mimetype || ''

  if (!mime && !quoted) return reply(fmt('sᴛɪᴄᴋᴇʀ',
    `${field(sc('usage'), '/sticker — reply to image/video/gif')}`
  ))

  if (!/image|video|sticker|webp|gif/i.test(mime)) return reply(fmt('sᴛɪᴄᴋᴇʀ',
    field(sc('error'), 'reply to an image, video, or gif')
  ))

  await reply(fmt('sᴛɪᴄᴋᴇʀ', field(sc('status'), 'converting...')))

  try {
    const buffer    = await q.download()
    const isAnim    = /video|gif/i.test(mime)
    const webpBuf   = await toWebp(buffer, isAnim)

    // Embed exif metadata
    const exif     = buildExif()
    const finalBuf = Buffer.concat([webpBuf.slice(0, 14), exif, webpBuf.slice(14)])

    await sock.sendMessage(chat, { sticker: finalBuf }, { quoted: msg })
  } catch (e) {
    return reply(fmt('sᴛɪᴄᴋᴇʀ', field(sc('error'), e.message)))
  }
}
