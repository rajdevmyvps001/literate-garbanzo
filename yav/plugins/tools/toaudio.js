import { fmt, field, sc } from '../../lib/utils.js'
import ffmpeg from 'fluent-ffmpeg'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import crypto from 'crypto'

async function toMp3(buffer) {
  const id  = crypto.randomBytes(8).toString('hex')
  const inp = join(tmpdir(), `${id}_in`)
  const out = join(tmpdir(), `${id}.mp3`)

  writeFileSync(inp, buffer)

  await new Promise((res, rej) =>
    ffmpeg(inp)
      .outputOptions(['-vn', '-c:a', 'libmp3lame', '-q:a', '2'])
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

  if (!/video|audio|document/i.test(mime)) return reply(fmt('ᴛᴏᴀᴜᴅɪᴏ',
    field(sc('usage'), '/toaudio — reply to a video or audio file')
  ))

  await reply(fmt('ᴛᴏᴀᴜᴅɪᴏ', field(sc('status'), 'converting...')))

  try {
    const buffer = await q.download()
    const mp3    = await toMp3(buffer)
    await sock.sendMessage(chat, { audio: mp3, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴛᴏᴀᴜᴅɪᴏ', field(sc('error'), e.message)))
  }
}
