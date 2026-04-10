import { fmt, field, sc } from '../../lib/utils.js'
import { getNote, setNote, deleteNote, listNotes } from '../../lib/mongodb.js'

function slug(s) {
  return s.toLowerCase().trim().replace(/\s+/g, '_').slice(0, 40)
}

export async function run({ args, cmd, chat, reply, isAdmin, isGroup }) {

  // listnotes / notes
  if (cmd === 'listnotes' || cmd === 'notes') {
    const keys = await listNotes(chat)
    if (!keys.length) return reply(fmt('ɴᴏᴛᴇs', field(sc('info'), 'no notes saved — use /note <name> | <content>')))
    const lines = keys.map(k => `⚘ ${k}`).join('\n')
    return reply(fmt('ɴᴏᴛᴇs', `${field(sc('saved'), `${keys.length} notes`)}\n${lines}`))
  }

  // get a note — /note <name>
  if (cmd === 'note' && args.length === 1) {
    const name    = slug(args[0])
    const content = await getNote(chat, name)
    if (!content) return reply(fmt('ɴᴏᴛᴇs', field(sc('error'), `note "${name}" not found`)))
    return reply(fmt(`ɴᴏᴛᴇ · ${name}`, content))
  }

  // save a note — /note <name> | <content>  (admin only)
  if (cmd === 'note' && args.join(' ').includes('|')) {
    if (!isAdmin) return reply(fmt('ɴᴏᴛᴇs', field(sc('error'), 'admins only')))
    const raw  = args.join(' ')
    const sep  = raw.indexOf('|')
    const name = slug(raw.slice(0, sep).trim())
    const body = raw.slice(sep + 1).trim()
    if (!name || !body) return reply(fmt('ɴᴏᴛᴇs', field(sc('usage'), '/note <name> | <content>')))
    await setNote(chat, name, body)
    return reply(fmt('ɴᴏᴛᴇs',
      `${field(sc('saved'), name)}\n` +
      `${field(sc('content'), body)}`
    ))
  }

  // delnote — admin only
  if (cmd === 'delnote') {
    if (!isAdmin) return reply(fmt('ɴᴏᴛᴇs', field(sc('error'), 'admins only')))
    const name = slug(args.join(' '))
    if (!name) return reply(fmt('ɴᴏᴛᴇs', field(sc('usage'), '/delnote <name>')))
    const exists = await getNote(chat, name)
    if (!exists) return reply(fmt('ɴᴏᴛᴇs', field(sc('error'), `note "${name}" not found`)))
    await deleteNote(chat, name)
    return reply(fmt('ɴᴏᴛᴇs', field(sc('deleted'), name)))
  }

  return reply(fmt('ɴᴏᴛᴇs',
    `${field(sc('usage'), '/note <name> | <content>')}\n` +
    `${field(sc('get'),   '/note <name>')}\n` +
    `${field(sc('list'),  '/notes')}\n` +
    `${field(sc('del'),   '/delnote <name>')}`
  ))
}
