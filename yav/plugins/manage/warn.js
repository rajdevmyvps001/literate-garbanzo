import { fmt, field, sc } from '../../lib/utils.js'
import { getWarns, addWarn, resetWarns, getAllWarns } from '../../lib/mongodb.js'
import { kickUser } from '../../lib/anti-engine.js'
import config from '../../config.js'

export async function run({ sock, msg, args, cmd, chat, sender, reply, isAdmin, isGroup, mentions, quoted }) {
  if (!isGroup) return reply(fmt('ᴡᴀʀɴ', field(sc('error'), 'group only')))
  if (!isAdmin) return reply(fmt('ᴡᴀʀɴ', field(sc('error'), 'admins only')))

  // warnlist
  if (cmd === 'warnlist') {
    const all = await getAllWarns(chat)
    if (!all.length) return reply(fmt('ᴡᴀʀɴ', field(sc('list'), 'no warns in this group')))
    const lines = all.map(w => `⚘ @${w.jid.split('@')[0]} — ${w.count}/${config.warnLimit}`).join('\n')
    return sock.sendMessage(chat, {
      text: fmt('ᴡᴀʀɴʟɪsᴛ', lines),
      mentions: all.map(w => w.jid)
    }, { quoted: msg })
  }

  // get target
  const target = quoted?.sender || mentions[0]

  // unwarn
  if (cmd === 'unwarn') {
    if (!target) return reply(fmt('ᴜɴᴡᴀʀɴ', field(sc('usage'), '/unwarn @user or reply')))
    await resetWarns(chat, target)
    const num = target.split('@')[0]
    return sock.sendMessage(chat, {
      text: fmt('ᴜɴᴡᴀʀɴ', field(sc('user'), `@${num} — warns cleared`)),
      mentions: [target]
    }, { quoted: msg })
  }

  // warn
  if (!target) return reply(fmt('ᴡᴀʀɴ',
    `${field(sc('usage'), '/warn @user [reason]')}\n` +
    `${field(sc('limit'), `auto-kick at ${config.warnLimit} warns`)}`
  ))

  const reason = args.filter(a => !a.startsWith('@')).join(' ') || 'no reason given'
  const count  = await addWarn(chat, target)
  const num    = target.split('@')[0]

  if (count >= config.warnLimit) {
    await sock.sendMessage(chat, {
      text: fmt('ᴡᴀʀɴ',
        `${field(sc('user'),   `@${num}`)}\n` +
        `${field(sc('reason'), reason)}\n` +
        `${field(sc('warns'),  `${count}/${config.warnLimit}`)}\n` +
        `${field(sc('action'), 'kicked — warns exhausted')}`
      ),
      mentions: [target]
    }, { quoted: msg })
    await kickUser(sock, chat, target)
    await resetWarns(chat, target)
    return
  }

  return sock.sendMessage(chat, {
    text: fmt('ᴡᴀʀɴ',
      `${field(sc('user'),   `@${num}`)}\n` +
      `${field(sc('reason'), reason)}\n` +
      `${field(sc('warns'),  `${count}/${config.warnLimit}`)}`
    ),
    mentions: [target]
  }, { quoted: msg })
}
