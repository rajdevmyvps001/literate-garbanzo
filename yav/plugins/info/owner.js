import { fmt, field, sc } from '../../lib/utils.js'

export async function run({ reply }) {
  const lines = [
    field(sc('name'),    'Vampire Diaries'),
    field(sc('origin'),  'born from the mind of The Architect'),
    field(sc('built'),   'April 2026'),
    field(sc('purpose'), 'clean management. minimal soul.'),
    field(sc('brand'),   'Astral Anime'),
    field(sc('note'),    '➔ ᴀᴜᴅᴇɴᴛᴇs ꜰᴏʀᴛᴜɴᴀ ɪᴜᴠᴀᴛ'),
  ].join('\n')

  return reply(fmt('ᴏʀɪɢɪɴ', lines))
}
