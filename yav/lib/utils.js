// ─────────────────────────────────────────────
//  Vampire Diaries — Reply Template & Helpers
// ─────────────────────────────────────────────

export function fmt(title, lines = '') {
  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  })
  return `「${title}」\n──────➳\n๏ ๏\n${lines}\n⏱ ${time}\n──────────✷`
}

// field helper — ⚘ label: value
export function field(label, value) {
  return `⚘ ${label}: ${value}`
}

// small caps map for labels
const SC = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
  k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'Q',r:'ʀ',s:'s',t:'ᴛ',
  u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
}
export const sc = (str) => str.toLowerCase().split('').map(c => SC[c] || c).join('')

// math italic title text
export function mit(str) {
  const map = {
    A:'𝐴',B:'𝐵',C:'𝐶',D:'𝐷',E:'𝐸',F:'𝐹',G:'𝐺',H:'𝐻',I:'𝐼',J:'𝐽',
    K:'𝐾',L:'𝐿',M:'𝑀',N:'𝑁',O:'𝑂',P:'𝑃',Q:'𝑄',R:'𝑅',S:'𝑆',T:'𝑇',
    U:'𝑈',V:'𝑉',W:'𝑊',X:'𝑋',Y:'𝑌',Z:'𝑍',
    a:'𝑎',b:'𝑏',c:'𝑐',d:'𝑑',e:'𝑒',f:'𝑓',g:'𝑔',h:'ℎ',i:'𝑖',j:'𝑗',
    k:'𝑘',l:'𝑙',m:'𝑚',n:'𝑛',o:'𝑜',p:'𝑝',q:'𝑞',r:'𝑟',s:'𝑠',t:'𝑡',
    u:'𝑢',v:'𝑣',w:'𝑤',x:'𝑥',y:'𝑦',z:'𝑧'
  }
  return str.split('').map(c => map[c] || c).join('')
}

// extract JID from message
export function getJid(num) {
  return num.includes('@') ? num : `${num}@s.whatsapp.net`
}

// format phone number
export function fmtNum(jid) {
  return jid.split('@')[0]
}

// sleep helper
export const sleep = (ms) => new Promise(r => setTimeout(r, ms))
