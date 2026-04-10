import axios from 'axios'
import * as cheerio from 'cheerio'
import { fmt, field, sc } from '../../lib/utils.js'

const MF_REGEX = /mediafire\.com/

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !MF_REGEX.test(url)) return reply(fmt('ᴍᴇᴅɪᴀꜰɪʀᴇ',
    field(sc('usage'), '/mediafire <url>')
  ))

  await reply(fmt('ᴍᴇᴅɪᴀꜰɪʀᴇ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get(url, {
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const $ = cheerio.load(data)

    const dlUrl   = $('a#downloadButton').attr('href') || $('a.input.btn.btn-green.download-btn').attr('href')
    const name    = $('div.dl-btn-label').attr('title') || $('div.filename').text().trim() || 'file'
    const size    = $('ul.details li span').eq(0).text().trim() || '?'

    if (!dlUrl) throw new Error('download link not found')

    const caption = fmt('ᴍᴇᴅɪᴀꜰɪʀᴇ',
      `${field(sc('file'), name)}\n` +
      `${field(sc('size'), size)}`
    )

    await sock.sendMessage(chat, {
      document: { url: dlUrl },
      fileName: name,
      mimetype: 'application/octet-stream',
      caption
    }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ᴍᴇᴅɪᴀꜰɪʀᴇ', field(sc('error'), e.message)))
  }
}
