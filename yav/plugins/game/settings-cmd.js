// ═══════════════════════════════════════════════════════
//   ⚙️ SETTINGS — Player Settings Plugin
// ═══════════════════════════════════════════════════════
import { fmt, field, sc } from '../../lib/utils.js'
import { getPlayerProfile, setPlayerProfile } from '../../lib/mongodb.js'
import { sendImage } from '../../lib/image.js'

const DEFAULTS = {
  dmNotifications: true,
  showRank:        true,
  showWallet:      true,
}

const sendSettingsImage = (sock, chat, msg, caption) => sendImage(sock, chat, msg, 'menu-settings.jpg', caption)

export async function run({ sock, msg, cmd, args, chat, sender, reply }) {
  const profile = await getPlayerProfile(sender)

  if (!profile?.username || profile.step) {
    return reply(fmt('⚙️ sᴇᴛᴛɪɴɢs',
      `${field(sc('not registered'), '❌')}\n` +
      sc('dm /start to create your account first')
    ))
  }

  const settings = { ...DEFAULTS, ...(profile.settings || {}) }

  // /settings notifications on|off
  if (args[0]?.toLowerCase() === 'notifications') {
    const val = args[1]?.toLowerCase()
    if (val !== 'on' && val !== 'off')
      return reply(fmt('⚙️ sᴇᴛᴛɪɴɢs', field(sc('usage'), '/settings notifications on/off')))
    settings.dmNotifications = val === 'on'
    await setPlayerProfile(sender, { settings })
    return reply(fmt('⚙️ ᴜᴘᴅᴀᴛᴇᴅ',
      field(sc('dm notifications'), settings.dmNotifications ? 'on ✅' : 'off ❌')
    ))
  }

  // /settings rank on|off
  if (args[0]?.toLowerCase() === 'rank') {
    const val = args[1]?.toLowerCase()
    if (val !== 'on' && val !== 'off')
      return reply(fmt('⚙️ sᴇᴛᴛɪɴɢs', field(sc('usage'), '/settings rank on/off')))
    settings.showRank = val === 'on'
    await setPlayerProfile(sender, { settings })
    return reply(fmt('⚙️ ᴜᴘᴅᴀᴛᴇᴅ',
      field(sc('show rank badge'), settings.showRank ? 'on ✅' : 'off ❌')
    ))
  }

  // /settings wallet on|off
  if (args[0]?.toLowerCase() === 'wallet') {
    const val = args[1]?.toLowerCase()
    if (val !== 'on' && val !== 'off')
      return reply(fmt('⚙️ sᴇᴛᴛɪɴɢs', field(sc('usage'), '/settings wallet on/off')))
    settings.showWallet = val === 'on'
    await setPlayerProfile(sender, { settings })
    return reply(fmt('⚙️ ᴜᴘᴅᴀᴛᴇᴅ',
      field(sc('show wallet balance'), settings.showWallet ? 'on ✅' : 'off ❌')
    ))
  }

  // /settings — view all settings
  const caption =
    `「⚙️ sᴇᴛᴛɪɴɢs」\n` +
    `──────➳\n` +
    `๏ ๏\n\n` +
    `─ ᴅᴍ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴs  ${settings.dmNotifications ? '✅' : '❌'}\n` +
    `  → /settings notifications on/off\n\n` +
    `─ sʜᴏᴡ ʀᴀɴᴋ ʙᴀᴅɢᴇ  ${settings.showRank ? '✅' : '❌'}\n` +
    `  → /settings rank on/off\n\n` +
    `─ sʜᴏᴡ ᴡᴀʟʟᴇᴛ  ${settings.showWallet ? '✅' : '❌'}\n` +
    `  → /settings wallet on/off\n\n` +
    `─ ᴘʀᴏꜰɪʟᴇ ᴄᴏʟᴏᴜʀ  ${profile.color?.emoji || '⬜'} ${profile.color?.name || 'not set'}\n` +
    `  → /setcolor  (change)\n\n` +
    `──────────✷`

  return sendSettingsImage(sock, chat, msg, caption)
}
