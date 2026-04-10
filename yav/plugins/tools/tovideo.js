import { fmt, field, sc } from '../../lib/utils.js'
import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import crypto from 'crypto'

async function webpToMp4(buffer) {
  const id  = crypto.randomBytes(8).toString('hex')
  const inp = join(tmpdir(), `${id}.webp`)
  const gif = join(tmpdir(), `${id}.gif`)
  const out = join(tmpdir(), `${id}.mp4`)

  writeFileSync(inp, buffer)

  // webp → gif
  await new Promise((res, rej) =>
    ffmpeg(inp).output(gif).on('end', res).on('error', rej).run()
  )

  // gif → mp4
  await new Promise((res, rej) =>
    ffmpeg(gif)
      .outputOptions([
        '-pix_fmt', 'yuv420p',
        '-c:v', 'libx264',
        '-movflags', '+faststart',
        '-vf', "crop='floor(in_w/2)*2:floor(in_h/2)*2'",
      ])
      .output(out)
      .on('end', res)
      .on('error', rej)
      .run()
  )

  const buf = readFileSync(out)
  try { unlinkSync(inp); unlinkSync(gif); unlinkSync(out) } catch {}
  return buf
}

export async function run({ sock, msg, chat, reply, quoted }) {
  const q    = quoted || msg
  const mime = q?.mimetype || ''

  if (!/webp|sticker/i.test(mime)) return reply(fmt('ᴛᴏᴠɪᴅᴇᴏ',
    field(sc('usage'), '/tovideo — reply to a sticker')
  ))

  await reply(fmt('ᴛᴏᴠɪᴅᴇᴏ', field(sc('status'), 'converting...')))

  try {
    const buffer = await q.download()
    const mp4    = await webpToMp4(buffer)
    await sock.sendMessage(chat, { video: mp4, gifPlayback: true }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴛᴏᴠɪᴅᴇᴏ', field(sc('error'), e.message)))
  }
}
