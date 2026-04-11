// ═══════════════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — CONFIGURATION
//   ✷  THE ARCHITECT  x  ASTRAL ANIME
// ═══════════════════════════════════════════════════════

const config = {
    // ── Bot Identity ───────────────────────────
    botName: 'Vampire Diaries',
    prefix: '/',
    session: 'vampire-diaries',

    // ── Owner ──────────────────────────────────
    ownerNumber: '2347062301848',
    ownerLid: '87209327755401',
    ownerName: 'The Architect',
    ownerJid: '2347062301848@s.whatsapp.net',

    // ── Database Setup (MongoDB) ───────────────
    // VPS par bina ecosystem file ke chalane ke liye yahan URI hona zaroori hai
    mongodbUri: 'mongodb+srv://emberlight2008_db_user:fqn3csH7SJEQtb3T@cluster0.pvq9ily.mongodb.net/vampire-diaries',

    // ── APIs ───────────────────────────────────
    ytApi: 'https://api-faa.my.id/faa',

    // ── Warn System ────────────────────────────
    warnLimit: 3,

    // ── Schedule & Localization ────────────────
    timezone: 'Africa/Lagos',
}

export default config;
