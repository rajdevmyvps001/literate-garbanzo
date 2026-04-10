import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, chat, sender, reply, mentions, quoted }) {
  const target = mentions?.[0] || quoted?.sender || sender

  try {
    const url = await sock.profilePictureUrl(target, 'image')
    if (!url) throw new Error('no profile picture')
    const num = target.split('@')[0]
    await sock.sendMessage(chat, {
      image:   { url },
      caption: fmt('ɢᴇᴛᴘᴘ', field(sc('user'), `@${num}`)),
      mentions: [target]
    }, { quoted: msg })
  } catch {
    return reply(fmt('ɢᴇᴛᴘᴘ', field(sc('error'), 'no profile picture available or user not found')))
  }
}
