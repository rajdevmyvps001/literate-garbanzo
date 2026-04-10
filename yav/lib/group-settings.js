// ─────────────────────────────────────────────
//  In-memory group settings store
// ─────────────────────────────────────────────

const defaults = () => ({
  welcome:      false,
  goodbye:      false,
  customWelcome: '',
  customGoodbye: '',
  antilink:     false,
  antispam:     false,
  antiflood:    false,
  antibot:      false,
  muted:        false,
  open:         true,
})

const store = new Map()

export function getGroup(jid) {
  if (!store.has(jid)) store.set(jid, defaults())
  return store.get(jid)
}

export function setGroup(jid, key, value) {
  const g = getGroup(jid)
  g[key] = value
  store.set(jid, g)
}

export function patchGroup(jid, obj) {
  const g = getGroup(jid)
  Object.assign(g, obj)
  store.set(jid, g)
}
