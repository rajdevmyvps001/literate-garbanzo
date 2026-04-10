import { fmt, field, sc, sleep } from '../../lib/utils.js'

export async function run({ sock, msg, args, chat, reply, isOwner, isMod }) {
  if (!isOwner && !isMod) return reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ', field(sc('error'), 'mods only')))

  const text = args.join(' ').trim()
  if (!text) return reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ',
    `${field(sc('usage'), '/broadcast <message>')}`
  ))

  let groups
  try {
    groups = await sock.groupFetchAllParticipating()
  } catch (e) {
    return reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ', field(sc('error'), `could not fetch groups: ${e.message}`)))
  }

  const jids = Object.keys(groups)
  if (!jids.length) return reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ', field(sc('error'), 'bot is not in any groups')))

  await reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ', field(sc('sending'), `broadcasting to ${jids.length} groups...`)))

  let sent = 0, failed = 0
  for (const jid of jids) {
    try {
      await sock.sendMessage(jid, {
        text: fmt('ʙʀᴏᴀᴅᴄᴀsᴛ', text)
      })
      sent++
      await sleep(800)
    } catch {
      failed++
    }
  }

  return reply(fmt('ʙʀᴏᴀᴅᴄᴀsᴛ',
    `${field(sc('sent'),   sent.toString())}\n` +
    `${field(sc('failed'), failed.toString())}`
  ))
}
