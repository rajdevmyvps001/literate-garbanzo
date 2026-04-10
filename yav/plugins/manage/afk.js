import { fmt, field, sc } from '../../lib/utils.js'
import { afkUsers } from '../../handler.js'

function duration(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export async function run({ args, chat, sender, reply }) {
  const reason = args.join(' ').trim() || 'no reason given'
  const since  = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  afkUsers.set(sender, { reason, since })

  return reply(fmt('ᴀꜰᴋ',
    `${field(sc('status'), 'away')}\n` +
    `${field(sc('reason'), reason)}\n` +
    `${field(sc('since'),  since)}`
  ))
}
