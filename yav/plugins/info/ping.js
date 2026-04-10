import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ reply }) {
  const start = Date.now()
  await reply(fmt('ᴘɪɴɢ', field(sc('status'), 'checking...')))
  const ms = Date.now() - start
  return reply(fmt('ᴘɪɴɢ', field(sc('latency'), `${ms}ms`)))
}
