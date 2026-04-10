// ═══════════════════════════════════════════════════════
//   🖼️  VAMPIRE DIARIES — IMAGE / MEDIA MANAGER
// ═══════════════════════════════════════════════════════
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Root media folder: <project-root>/media/
export const MEDIA_DIR = path.join(__dirname, '../media')

// Resolve a filename to its full media path
export const media = (f) => path.join(MEDIA_DIR, f)

// ── PFP images ─────────────────────────────────────────
// Color name → filename mapping
// Add new colors here as you add their images to /media
export const PFP = {
  red:    'red-pfp.png',
  purple: 'purple-pfp.png',
  blue:   'blue-pfp.png',
  green:  'green-pfp.png',
  yellow: 'yellow-pfp.png',
  white:  'white-pfp.png',
  black:  'black-pfp.png',
  pink:   'pink-pfp.png',
  orange: 'orange-pfp.png',
  cyan:   'cyan-pfp.png',
  brown:  'brown-pfp.png',
  lime:   'lime-pfp.png',
  maroon: 'maroon-pfp.png',
  rose:   'rose-pfp.png',
  banana: 'banana-pfp.png',
  coral:  'coral-pfp.png',
  gray:   'gray-pfp.png',
}

// Get the pfp filename for a given color name, falling back to white
export function getPfpFile(colorName = 'white') {
  return PFP[colorName.toLowerCase()] || 'white-pfp.png'
}

// ── Generic send helpers ────────────────────────────────

/**
 * Send a local image from /media by filename.
 * Falls back to text if the file is missing or send fails.
 */
export async function sendImage(sock, chat, msg, imgName, caption, extra = {}) {
  const filePath = media(imgName)
  if (!existsSync(filePath)) {
    console.warn(`[image.js] Missing media file: ${filePath}`)
    return sock.sendMessage(chat, { text: caption, ...extra }, { quoted: msg })
  }
  try {
    const ext      = path.extname(imgName).toLowerCase()
    const mimetype = ext === '.png' ? 'image/png' : 'image/jpeg'
    await sock.sendMessage(chat, {
      image: { stream: createReadStream(filePath) },
      caption,
      mimetype,
      ...extra,
    }, { quoted: msg })
  } catch {
    await sock.sendMessage(chat, { text: caption, ...extra }, { quoted: msg })
  }
}

/**
 * Send a local video/gif from /media by filename.
 * Falls back to text if the file is missing or send fails.
 */
export async function sendGif(sock, chat, msg, videoName, caption, extra = {}) {
  const filePath = media(videoName)
  if (!existsSync(filePath)) {
    console.warn(`[image.js] Missing media file: ${filePath}`)
    return sock.sendMessage(chat, { text: caption, ...extra }, { quoted: msg })
  }
  try {
    await sock.sendMessage(chat, {
      video:       { stream: createReadStream(filePath) },
      caption,
      gifPlayback: true,
      mimetype:    'video/mp4',
      ...extra,
    }, { quoted: msg })
  } catch {
    await sock.sendMessage(chat, { text: caption, ...extra }, { quoted: msg })
  }
}

/**
 * Send a profile card image for a given color name.
 * Automatically resolves the right pfp file.
 */
export async function sendProfileImage(sock, chat, msg, colorName, caption, extra = {}) {
  return sendImage(sock, chat, msg, getPfpFile(colorName), caption, extra)
}

/**
 * Send an image from a URL (for external images like phone store, downloads etc).
 * Falls back to text on failure.
 */
export async function sendUrlImage(sock, chat, msg, url, caption, extra = {}) {
  try {
    await sock.sendMessage(chat, {
      image:   { url },
      caption,
      ...extra,
    }, { quoted: msg })
  } catch {
    await sock.sendMessage(chat, { text: caption, ...extra }, { quoted: msg })
  }
}
