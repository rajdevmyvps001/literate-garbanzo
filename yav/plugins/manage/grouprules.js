import { fmt, field, sc } from '../../lib/utils.js'
import { getRules, setRules } from '../../lib/mongodb.js'

export async function run({ args, cmd, chat, reply, isAdmin, isGroup }) {
  if (!isGroup) return reply(fmt('ʀᴜʟᴇs', field(sc('error'), 'group only')))

  // show rules — anyone can view
  if (cmd === 'grouprules') {
    const rules = await getRules(chat)
    if (!rules) return reply(fmt('ʀᴜʟᴇs', field(sc('info'), 'no rules set yet — admin can use /setrules')))
    return reply(fmt('ʀᴜʟᴇs', rules))
  }

  // setrules — admin only
  if (!isAdmin) return reply(fmt('ʀᴜʟᴇs', field(sc('error'), 'admins only')))

  const text = args.join(' ').trim()
  if (!text) return reply(fmt('ʀᴜʟᴇs', field(sc('usage'), '/setrules <rules text>')))

  await setRules(chat, text)
  return reply(fmt('ʀᴜʟᴇs', `${field(sc('status'), 'rules updated')}\n${text}`))
}
