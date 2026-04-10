// ═══════════════════════════════════════════════════════
//   📱 PHONE MIDDLEWARE — Battery · Delay · Crash Engine
// ═══════════════════════════════════════════════════════
import { getPlayerProfile, setPlayerProfile } from './mongodb.js'
import { sleep } from './utils.js'

// ── Constants ─────────────────────────────────────────
const CHARGE_DURATION_MS    = 5 * 60 * 1000  // 5 mins to full charge
const IDLE_DRAIN_CAP_MINS   = 10             // phone locks after 10 min idle → no drain
const GAMING_DRAIN_MULT     = 1.5            // gaming drains 50% faster
const CRASH_RESTART_MINS    = 2              // phone "restarts" after crash (2 min lockout)

// Commands that work even with dead battery
export const DEAD_BATTERY_OK = new Set([
  'start','help','menu','manage','tools',
  'ping','owner','phone','charge','gadgetstore','phoneinfo',
  'buy','profile','leaderboard','setname','setcolor',
  'balance','pay','history','request','astralpay',
  'settings','note','notes','afk',
])

// Commands that need battery (apps)
export const APP_COMMANDS = new Set([
  'create','join','gamestart','kill','vote','meeting',
  'task','lobby','endgame','faketask','roomsettings',
  'slots','blackjack','bj','roulette','poker','casino',
  'catch','battle','pokedex','starter','heal','trade',
  'play','youtube','yt','dl','spotify',
  'weather','forecast',
  'apps','store','app','amongus','au','genshin',
])

// ── Phone catalog (single source of truth) ────────────
export const PHONE_CATALOG = [

  // ─ ANDROID (DEFAULT) ──────────────────────────────
  {
    id: 'android', name: 'Generic Android', brand: 'Android', category: 'android',
    emoji: '🤖', price: 0, isDefault: true,
    responseDelaySecs: 4,
    batteryMins: 90,          // full charge lasts 90 mins of active use
    drainPerMin: 1.11,        // %/min (100 / 90)
    crashAfterMins: 180,      // 3hr gaming session = crash
    desc: 'Everyone starts here. Gets the job done... slowly.',
    specs: '2GB RAM · 32GB Storage · 3000mAh',
    imageUrl: null,
  },

  // ─ iPHONE ──────────────────────────────────────────
  {
    id: 'iphone_se', name: 'iPhone SE', brand: 'Apple', category: 'iphone',
    emoji: '🍎', price: 2_500,
    responseDelaySecs: 2,
    batteryMins: 140, drainPerMin: 0.71, crashAfterMins: 300,
    desc: 'Compact & fast. Small but punchy.',
    specs: 'A15 Bionic · 4GB RAM · 2227mAh',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-se-finish-select-202203-6-1inch-midnight_AV1?wid=940&hei=1112&fmt=png-alpha&.v=1645552346280',
  },
  {
    id: 'iphone_14', name: 'iPhone 14', brand: 'Apple', category: 'iphone',
    emoji: '🍎', price: 8_000,
    responseDelaySecs: 1.5,
    batteryMins: 190, drainPerMin: 0.53, crashAfterMins: 360,
    desc: 'Solid everyday iPhone. Great all-rounder.',
    specs: 'A15 Bionic · 6GB RAM · 3279mAh',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-finish-select-202209-6-1inch-blue?wid=5120&hei=2880&fmt=p-jpg&.v=1660803972829',
  },
  {
    id: 'iphone_15_pro', name: 'iPhone 15 Pro', brand: 'Apple', category: 'iphone',
    emoji: '🍎', price: 18_000,
    responseDelaySecs: 1.2,
    batteryMins: 240, drainPerMin: 0.42, crashAfterMins: 420,
    desc: 'Pro grade. Titanium build. Blazing fast.',
    specs: 'A17 Pro · 8GB RAM · 3274mAh',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-1inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg',
  },
  {
    id: 'iphone_16_pro_max', name: 'iPhone 16 Pro Max', brand: 'Apple', category: 'iphone',
    emoji: '🍎', price: 32_000,
    responseDelaySecs: 1,
    batteryMins: 320, drainPerMin: 0.31, crashAfterMins: 480,
    desc: 'Top tier. Massive battery. Lightning fast.',
    specs: 'A18 Pro · 8GB RAM · 4422mAh',
    imageUrl: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-16-pro-finish-select-202409-6-9inch-deserttitanium?wid=5120&hei=2880&fmt=p-jpg',
  },
  {
    id: 'iphone_17_pro_max', name: 'iPhone 17 Pro Max', brand: 'Apple', category: 'iphone',
    emoji: '🍎', price: 50_000,
    responseDelaySecs: 0.8,
    batteryMins: 420, drainPerMin: 0.24, crashAfterMins: 600,
    desc: '🔥 Future tech. Fastest iPhone in the store.',
    specs: 'A19 Pro · 12GB RAM · 5000mAh',
    imageUrl: 'https://9to5mac.com/wp-content/uploads/sites/6/2025/02/iPhone-17-Pro-Max-concept.jpg?quality=82&strip=all&w=1600',
  },

  // ─ SAMSUNG ─────────────────────────────────────────
  {
    id: 'samsung_a15', name: 'Galaxy A15', brand: 'Samsung', category: 'samsung',
    emoji: '🔵', price: 1_500,
    responseDelaySecs: 1,
    batteryMins: 160, drainPerMin: 0.63, crashAfterMins: 300,
    desc: 'Budget Samsung. Big battery, decent speed.',
    specs: 'Helio G99 · 4GB RAM · 5000mAh',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/global/sm-a156bzkgxfe/gallery/global-galaxy-a15-5g-sm-a156-sm-a156bzkgxfe-thumb-539425792.jpg',
  },
  {
    id: 'samsung_a55', name: 'Galaxy A55', brand: 'Samsung', category: 'samsung',
    emoji: '🔵', price: 5_000,
    responseDelaySecs: 1,
    batteryMins: 210, drainPerMin: 0.48, crashAfterMins: 360,
    desc: 'Mid-range powerhouse. Smooth everything.',
    specs: 'Exynos 1480 · 8GB RAM · 5000mAh',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/global/sm-a556elgaxfe/gallery/global-galaxy-a55-5g-sm-a556-sm-a556elgaxfe-thumb-539425792.jpg',
  },
  {
    id: 'samsung_s23', name: 'Galaxy S23', brand: 'Samsung', category: 'samsung',
    emoji: '🔵', price: 14_000,
    responseDelaySecs: 1,
    batteryMins: 280, drainPerMin: 0.36, crashAfterMins: 420,
    desc: 'Flagship class. Snapdragon beast.',
    specs: 'Snapdragon 8 Gen 2 · 8GB RAM · 3900mAh',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/global/sm-s911blbdxfe/gallery/global-galaxy-s23-sm-s911-sm-s911blbdxfe-thumb-534863898.jpg',
  },
  {
    id: 'samsung_s24_ultra', name: 'Galaxy S24 Ultra', brand: 'Samsung', category: 'samsung',
    emoji: '🔵', price: 30_000,
    responseDelaySecs: 1,
    batteryMins: 360, drainPerMin: 0.28, crashAfterMins: 480,
    desc: 'Built-in S-Pen. Titan performance.',
    specs: 'Snapdragon 8 Gen 3 · 12GB RAM · 5000mAh',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/global/sm-s928bzadeub/gallery/global-galaxy-s24-ultra-sm-s928-sm-s928bzadeub-thumb-539425792.jpg',
  },
  {
    id: 'samsung_s25_ultra', name: 'Galaxy S25 Ultra', brand: 'Samsung', category: 'samsung',
    emoji: '🔵', price: 45_000,
    responseDelaySecs: 1,
    batteryMins: 440, drainPerMin: 0.23, crashAfterMins: 600,
    desc: 'Latest Samsung Ultra. Top 3 phones in store.',
    specs: 'Snapdragon 8 Elite · 12GB RAM · 5000mAh',
    imageUrl: 'https://images.samsung.com/is/image/samsung/p6pim/global/sm-s938bzkgxfe/gallery/global-galaxy-s25-ultra-sm-s938-sm-s938bzkgxfe-thumb-539425792.jpg',
  },

  // ─ XIAOMI ──────────────────────────────────────────
  {
    id: 'xiaomi_redmi_12', name: 'Redmi 12', brand: 'Xiaomi', category: 'xiaomi',
    emoji: '🟠', price: 1_000,
    responseDelaySecs: 1,
    batteryMins: 140, drainPerMin: 0.71, crashAfterMins: 270,
    desc: 'Budget king. Best value in the store.',
    specs: 'Helio G88 · 4GB RAM · 5000mAh',
    imageUrl: 'https://i02.appmifile.com/mi-com-product/fly-birds/redmi-12/M/e2d43b7f91ce41a8efb33a3fe4bfad42.png',
  },
  {
    id: 'xiaomi_13', name: 'Xiaomi 13', brand: 'Xiaomi', category: 'xiaomi',
    emoji: '🟠', price: 7_000,
    responseDelaySecs: 1,
    batteryMins: 230, drainPerMin: 0.43, crashAfterMins: 360,
    desc: 'Leica cameras. Flagship chip.',
    specs: 'Snapdragon 8 Gen 2 · 8GB RAM · 4500mAh',
    imageUrl: 'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi13/header.png',
  },
  {
    id: 'xiaomi_14_ultra', name: 'Xiaomi 14 Ultra', brand: 'Xiaomi', category: 'xiaomi',
    emoji: '🟠', price: 22_000,
    responseDelaySecs: 1,
    batteryMins: 320, drainPerMin: 0.31, crashAfterMins: 480,
    desc: 'Photography powerhouse. Ultra grade.',
    specs: 'Snapdragon 8 Gen 3 · 16GB RAM · 5000mAh',
    imageUrl: 'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi14ultra/kv-final.png',
  },
  {
    id: 'black_shark_5_pro', name: 'Black Shark 5 Pro', brand: 'Xiaomi', category: 'xiaomi',
    emoji: '🦈', price: 17_000,
    responseDelaySecs: 0.9,
    batteryMins: 310, drainPerMin: 0.32, crashAfterMins: 500,
    desc: 'Gaming phone. Fastest Xiaomi in store.',
    specs: 'Snapdragon 8 Gen 1 · 16GB RAM · 4650mAh',
    imageUrl: 'https://static.blackshark.com/uploads/2022/04/04133834/Black-Shark-5-Pro_11.png',
  },
  {
    id: 'xiaomi_15_ultra', name: 'Xiaomi 15 Ultra', brand: 'Xiaomi', category: 'xiaomi',
    emoji: '🟠', price: 38_000,
    responseDelaySecs: 1,
    batteryMins: 420, drainPerMin: 0.24, crashAfterMins: 600,
    desc: 'Latest Ultra. Monster 6000mAh beast.',
    specs: 'Snapdragon 8 Elite · 16GB RAM · 6000mAh',
    imageUrl: 'https://i01.appmifile.com/webfile/globalimg/products/pc/xiaomi15ultra/kv.png',
  },

  // ─ OnePlus ─────────────────────────────────────────
  {
    id: 'oneplus_nord_ce3', name: 'Nord CE 3', brand: 'OnePlus', category: 'oneplus',
    emoji: '🔴', price: 3_500,
    responseDelaySecs: 1,
    batteryMins: 180, drainPerMin: 0.56, crashAfterMins: 320,
    desc: 'Fast charging king. Never Stop.',
    specs: 'Snapdragon 695 · 8GB RAM · 5000mAh',
    imageUrl: 'https://oasis.opstatics.com/content/dam/oasis/page/2023/global/products/nord-ce3-lite/nord-ce3-lite-gray-shadow.png',
  },
  {
    id: 'oneplus_12r', name: 'OnePlus 12R', brand: 'OnePlus', category: 'oneplus',
    emoji: '🔴', price: 9_000,
    responseDelaySecs: 1,
    batteryMins: 260, drainPerMin: 0.38, crashAfterMins: 400,
    desc: 'Performance at mid price. Fast charge.',
    specs: 'Snapdragon 8 Gen 1 · 8GB RAM · 5500mAh',
    imageUrl: 'https://oasis.opstatics.com/content/dam/oasis/page/2024/global/products/12r/blue-color.png',
  },
  {
    id: 'oneplus_12', name: 'OnePlus 12', brand: 'OnePlus', category: 'oneplus',
    emoji: '🔴', price: 16_000,
    responseDelaySecs: 1,
    batteryMins: 300, drainPerMin: 0.33, crashAfterMins: 480,
    desc: 'Hasselblad cameras. Flagship killer.',
    specs: 'Snapdragon 8 Gen 3 · 12GB RAM · 5400mAh',
    imageUrl: 'https://oasis.opstatics.com/content/dam/oasis/page/2024/global/products/12/silky-black.png',
  },
  {
    id: 'oneplus_13r', name: 'OnePlus 13R', brand: 'OnePlus', category: 'oneplus',
    emoji: '🔴', price: 12_000,
    responseDelaySecs: 1,
    batteryMins: 280, drainPerMin: 0.36, crashAfterMins: 450,
    desc: 'Great balance. 100W fast charge.',
    specs: 'Snapdragon 8 Gen 2 · 12GB RAM · 6000mAh',
    imageUrl: 'https://oasis.opstatics.com/content/dam/oasis/page/2025/global/products/13r/13r-black.png',
  },
  {
    id: 'oneplus_13', name: 'OnePlus 13', brand: 'OnePlus', category: 'oneplus',
    emoji: '🔴', price: 25_000,
    responseDelaySecs: 1,
    batteryMins: 370, drainPerMin: 0.27, crashAfterMins: 540,
    desc: 'Latest flagship. Top OnePlus ever made.',
    specs: 'Snapdragon 8 Elite · 12GB RAM · 6000mAh',
    imageUrl: 'https://oasis.opstatics.com/content/dam/oasis/page/2025/global/products/13/arctic-dawn.png',
  },

  // ─ ASUS ROG (Gaming Phones) ────────────────────────
  {
    id: 'rog_6', name: 'ROG Phone 6', brand: 'ASUS ROG', category: 'gaming',
    emoji: '🎮', price: 22_000,
    responseDelaySecs: 0.7,
    batteryMins: 380, drainPerMin: 0.26, crashAfterMins: 600,
    desc: 'Pure gaming beast. AeroActive Cooler.',
    specs: 'Snapdragon 8+ Gen 1 · 12GB RAM · 6000mAh',
    imageUrl: 'https://dlcdnets.asus.com/pub/ASUS/mb/Image/ROG-Phone-6-Phantom-Black.png',
  },
  {
    id: 'rog_7', name: 'ROG Phone 7 Ultimate', brand: 'ASUS ROG', category: 'gaming',
    emoji: '🎮', price: 35_000,
    responseDelaySecs: 0.6,
    batteryMins: 430, drainPerMin: 0.23, crashAfterMins: 700,
    desc: 'Secondary display on back. Elite status.',
    specs: 'Snapdragon 8 Gen 2 · 16GB RAM · 6000mAh',
    imageUrl: 'https://dlcdnets.asus.com/pub/ASUS/mb/Image/ROG-Phone-7-Ultimate-Storm-White.png',
  },
  {
    id: 'rog_8_pro', name: 'ROG Phone 8 Pro', brand: 'ASUS ROG', category: 'gaming',
    emoji: '🎮', price: 48_000,
    responseDelaySecs: 0.5,
    batteryMins: 480, drainPerMin: 0.21, crashAfterMins: 800,
    desc: 'Insane cooling. Ultra-fast. Near-uncrashable.',
    specs: 'Snapdragon 8 Gen 3 · 16GB RAM · 5500mAh',
    imageUrl: 'https://dlcdnets.asus.com/pub/ASUS/mb/Image/rog-phone-8-pro-phantom-black.png',
  },
  {
    id: 'rog_9', name: 'ROG Phone 9', brand: 'ASUS ROG', category: 'gaming',
    emoji: '🎮', price: 62_000,
    responseDelaySecs: 0.4,
    batteryMins: 540, drainPerMin: 0.19, crashAfterMins: 900,
    desc: 'Legendary gaming phone. Top tier.',
    specs: 'Snapdragon 8 Elite · 24GB RAM · 5800mAh',
    imageUrl: 'https://dlcdnets.asus.com/pub/ASUS/mb/Image/rog-phone-9-phantom-black.png',
  },
  {
    id: 'rog_9_pro_elite', name: 'ROG Phone 9 Pro Elite', brand: 'ASUS ROG', category: 'gaming',
    emoji: '👑', price: 80_000,
    responseDelaySecs: 0.3,
    batteryMins: 650, drainPerMin: 0.15, crashAfterMins: 1200,
    desc: '👑 The best phone in the entire store. Period.',
    specs: 'Snapdragon 8 Elite OC · 24GB RAM · 6000mAh',
    imageUrl: 'https://dlcdnets.asus.com/pub/ASUS/mb/Image/rog-phone-9-pro-elite.png',
  },
]

// ── Helpers ───────────────────────────────────────────
export function getPhone(id) {
  return PHONE_CATALOG.find(p => p.id === id) || PHONE_CATALOG[0]
}

export function getCategoryPhones(category) {
  return PHONE_CATALOG.filter(p => p.category === category)
}

export function batteryBar(pct) {
  const p      = Math.max(0, Math.min(100, Math.round(pct)))
  const filled = Math.round(p / 10)
  const empty  = 10 - filled
  const bar    = '█'.repeat(filled) + '░'.repeat(empty)
  const emoji  = p > 60 ? '🔋' : p > 30 ? '🟡' : p > 10 ? '🔴' : '🪫'
  return `${emoji} [${bar}] ${p}%`
}

// ── Default phone state factory ───────────────────────
export function defaultPhoneState() {
  return {
    id:              'android',
    battery:         100,
    lastActive:      Date.now(),
    isCharging:      false,
    chargeStartedAt: null,
    gamingStartedAt: null,
    crashed:         false,
    crashedAt:       null,
  }
}

// ══════════════════════════════════════════════════════
//   MAIN MIDDLEWARE — call this before every command
// ══════════════════════════════════════════════════════
export async function phoneMiddleware(sender, cmd) {
  let profile
  try { profile = await getPlayerProfile(sender) } catch { return fallbackStatus() }
  if (!profile) return fallbackStatus()

  // ── Init phone if missing ────────────────────────
  if (!profile.phone) {
    profile.phone = defaultPhoneState()
    await setPlayerProfile(sender, profile)
  }

  const phoneData = { ...profile.phone }
  const phone     = getPhone(phoneData.id)
  const now       = Date.now()

  // ── Check if charging completed ──────────────────
  if (phoneData.isCharging && phoneData.chargeStartedAt) {
    const elapsed = (now - phoneData.chargeStartedAt) / 1000
    if (elapsed >= CHARGE_DURATION_MS / 1000) {
      phoneData.battery         = 100
      phoneData.isCharging      = false
      phoneData.chargeStartedAt = null
    }
  }

  // ── Drain battery based on time since last active ─
  if (!phoneData.isCharging && phoneData.lastActive) {
    const minsSince   = (now - phoneData.lastActive) / 60_000
    const cappedMins  = Math.min(minsSince, IDLE_DRAIN_CAP_MINS)
    const isGaming    = !!phoneData.gamingStartedAt
    const drainRate   = phone.drainPerMin * (isGaming ? GAMING_DRAIN_MULT : 1)
    const drain       = cappedMins * drainRate
    phoneData.battery = Math.max(0, phoneData.battery - drain)
  }

  // ── Check crash condition ─────────────────────────
  let justCrashed = false
  if (phoneData.gamingStartedAt && !phoneData.crashed) {
    const gamingMins = (now - phoneData.gamingStartedAt) / 60_000
    if (gamingMins >= phone.crashAfterMins) {
      phoneData.crashed         = true
      phoneData.crashedAt       = now
      phoneData.gamingStartedAt = null
      justCrashed               = true
    }
  }

  // ── Auto-recover from crash after restart period ──
  if (phoneData.crashed && phoneData.crashedAt) {
    const crashedMins = (now - phoneData.crashedAt) / 60_000
    if (crashedMins >= CRASH_RESTART_MINS) {
      phoneData.crashed   = false
      phoneData.crashedAt = null
    }
  }

  // ── Update lastActive ────────────────────────────
  phoneData.lastActive = now

  // ── Persist ──────────────────────────────────────
  try {
    await setPlayerProfile(sender, { ...profile, phone: phoneData })
  } catch {}

  // ── Apply response delay ─────────────────────────
  const delaySecs = phone.responseDelaySecs
  if (delaySecs > 0) await sleep(delaySecs * 1000)

  const isDead       = phoneData.battery <= 0
  const isCrashed    = phoneData.crashed
  const isAppCmd     = APP_COMMANDS.has(cmd)
  const canUseApps   = !isDead && !isCrashed

  return {
    phone,
    phoneName:   phone.name,
    battery:     phoneData.battery,
    isCharging:  phoneData.isCharging,
    isDead,
    isCrashed,
    justCrashed,
    isAppCmd,
    canUseApps,
    delaySecs,
    phoneData,
  }
}

// Fallback for users with no profile yet (new users)
function fallbackStatus() {
  return {
    phone:       PHONE_CATALOG[0],
    phoneName:   'Android',
    battery:     100,
    isCharging:  false,
    isDead:      false,
    isCrashed:   false,
    justCrashed: false,
    isAppCmd:    false,
    canUseApps:  true,
    delaySecs:   4,
    phoneData:   defaultPhoneState(),
  }
}
