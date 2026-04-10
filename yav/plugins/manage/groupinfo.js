import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ sock, msg, chat, reply, isGroup }) {
  if (!isGroup) return reply(fmt('ɢʀᴏᴜᴘɪɴꜰᴏ', field(sc('error'), 'group only')))

  let meta
  try { meta = await sock.groupMetadata(chat) } catch {}
  if (!meta) return reply(fmt('ɢʀᴏᴜᴘɪɴꜰᴏ', field(sc('error'), 'could not fetch group')))

  const participants  = meta.participants || []
  const admins        = participants.filter(p => p.admin)
  const superAdmins   = participants.filter(p => p.admin === 'superadmin')
  const regularAdmins = participants.filter(p => p.admin === 'admin')
  const members       = participants.filter(p => !p.admin)

  const created = meta.creation
    ? new Date(meta.creation * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'unknown'

  const msgMode  = meta.announce ? 'admins only' : 'all members'
  const editMode = meta.restrict  ? 'admins only' : 'all members'

  let inviteLink = 'n/a'
  try {
    const code = await sock.groupInviteCode(chat)
    if (code) inviteLink = `https://chat.whatsapp.com/${code}`
  } catch {}

  const desc = meta.desc
    ? (meta.desc.length > 180 ? meta.desc.slice(0, 180) + '…' : meta.desc)
    : 'no description'

  const owner = (meta.owner || '').split('@')[0] || 'unknown'

  const lines =
    `${field(sc('name'),    meta.subject || 'n/a')}\n` +
    `${field(sc('owner'),   `@${owner}`)}\n` +
    `${field(sc('created'), created)}\n` +
    `${field(sc('members'), participants.length.toString())}\n` +
    `${field(sc('admins'),  `${superAdmins.length} super · ${regularAdmins.length} admin · ${members.length} members`)}\n` +
    `${field(sc('send'),    msgMode)}\n` +
    `${field(sc('edit'),    editMode)}\n` +
    `${field(sc('desc'),    desc)}\n` +
    `${field(sc('link'),    inviteLink)}`

  return sock.sendMessage(chat, {
    text: fmt('ɢʀᴏᴜᴘɪɴꜰᴏ', lines),
    mentions: meta.owner ? [meta.owner] : []
  }, { quoted: msg })
}
