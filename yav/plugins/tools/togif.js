import { fmt, field, sc } from '../../lib/utils.js'
import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import crypto from 'crypto'

async function toGif(buffer) {
  const id  = crypto.randomBytes(8).toString('hex')
  const inp = join(tmpdir(), `${id}_in`)
  const out = join(tmpdir(), `${id}.gif`)

  writeFileSync(inp, buffer)

  await new Promise((res, rej) =>
    ffmpeg(inp)
      .outputOptions([
        '-vf', 'fps=10,scale=320:-1:flags=lanczos',
        '-loop', '0',
      ])
      .output(out)
      .on('end', res)
      .on('error', rej)
      .run()
  )

  const buf = readFileSync(out)
  try { unlinkSync(inp); unlinkSync(out) } catch {}
  return buf
}

export async function run({ sock, msg, chat, reply, quoted }) {
  const q    = quoted || msg
  const mime = q?.mimetype || ''

  if (!/video|webp|sticker|gif/i.test(mime)) return reply(fmt('ᴛᴏɢɪꜰ',
    field(sc('usage'), '/togif — reply to a video or sticker')
  ))

  await reply(fmt('ᴛᴏɢɪꜰ', field(sc('status'), 'converting...')))

  try {
    const buffer = await q.download()
    const gif    = await toGif(buffer)
    await sock.sendMessage(chat, {
      video: gif,
      mimetype: 'image/gif',
      gifPlayback: true
    }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴛᴏɢɪꜰ', field(sc('error'), e.message)))
  }
}
