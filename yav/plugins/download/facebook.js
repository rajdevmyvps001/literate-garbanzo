import axios from 'axios'
import { fmt, field, sc } from '../../lib/utils.js'

const FB_REGEX = /facebook\.com|fb\.watch/

export async function run({ sock, msg, args, chat, reply }) {
  const url = args[0]
  if (!url || !FB_REGEX.test(url)) return reply(fmt('ꜰᴀᴄᴇʙᴏᴏᴋ',
    field(sc('usage'), '/facebook <url>')
  ))

  await reply(fmt('ꜰᴀᴄᴇʙᴏᴏᴋ', field(sc('status'), 'fetching...')))

  try {
    const { data } = await axios.get('https://api.nexoracle.com/downloaders/facebook', {
      params: { url, apikey: 'free_for_use' },
      timeout: 25_000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const result = data?.result || data?.data || data
    if (!result) throw new Error('no result')

    const title  = result.title || 'Facebook'
    const hdUrl  = result.hd   || result.HD
    const sdUrl  = result.sd   || result.SD
    const dlUrl  = hdUrl || sdUrl
    const quality = hdUrl ? 'HD' : 'SD'

    if (!dlUrl) {
      // try images
      const imgs = result.images || result.image
      if (imgs) {
        const imgArr = Array.isArray(imgs) ? imgs : [imgs]
        for (let i = 0; i < imgArr.length; i++) {
          await sock.sendMessage(chat, {
            image: { url: imgArr[i] },
            ...(i === 0 && { caption: fmt('ꜰᴀᴄᴇʙᴏᴏᴋ', field(sc('title'), title)) })
          }, { quoted: msg })
        }
        return
      }
      throw new Error('no downloadable media found')
    }

    const caption = fmt('ꜰᴀᴄᴇʙᴏᴏᴋ',
      `${field(sc('title'),   title)}\n` +
      `${field(sc('quality'), quality)}`
    )
    await sock.sendMessage(chat, { video: { url: dlUrl }, caption }, { quoted: msg })
  } catch (e) {
    return reply(fmt('ꜰᴀᴄᴇʙᴏᴏᴋ', field(sc('error'), e.message)))
  }
}
