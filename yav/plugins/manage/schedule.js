import { fmt, field, sc } from '../../lib/utils.js'

function parseDelay(str) {
  const match = str.match(/^(\d+)(s|m|h)$/)
  if (!match) return null
  const val  = parseInt(match[1])
  const unit = match[2]
  if (unit === 's') return val * 1000
  if (unit === 'm') return val * 60_000
  if (unit === 'h') return val * 3_600_000
  return null
}

export async function run({ sock, msg, args, cmd, chat, reply, isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return reply(fmt('sᴄʜᴇᴅᴜʟᴇ', field(sc('error'), 'admins only')))

  if (cmd === 'unschedule') {
    return reply(fmt('sᴄʜᴇᴅᴜʟᴇ', field(sc('info'), 'scheduled messages cannot be cancelled once set')))
  }

  const delayStr = args[0]
  const text     = args.slice(1).join(' ').trim()

  if (!delayStr || !text) return reply(fmt('sᴄʜᴇᴅᴜʟᴇ',
    `${field(sc('usage'), '/schedule <delay> <message>')}\n` +
    `${field(sc('formats'), '30s · 5m · 1h')}`
  ))

  const ms = parseDelay(delayStr)
  if (!ms) return reply(fmt('sᴄʜᴇᴅᴜʟᴇ', field(sc('error'), 'invalid delay — use 30s, 5m, or 1h')))
  if (ms > 86_400_000) return reply(fmt('sᴄʜᴇᴅᴜʟᴇ', field(sc('error'), 'max delay is 24h')))

  await reply(fmt('sᴄʜᴇᴅᴜʟᴇ',
    `${field(sc('delay'),   delayStr)}\n` +
    `${field(sc('message'), text)}\n` +
    `${field(sc('status'),  'scheduled')}`
  ))

  setTimeout(async () => {
    try {
      await sock.sendMessage(chat, { text: fmt('sᴄʜᴇᴅᴜʟᴇ', `${field(sc('message'), text)}`) })
    } catch (e) {
      console.warn('[schedule] failed to send:', e.message)
    }
  }, ms)
}
