// ═══════════════════════════════════════════════
//   🧛 VAMPIRE DIARIES — PM2 ECOSYSTEM CONFIG
//   ✷  THE ARCHITECT  x  ASTRAL ANIME
// ═══════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name:          'vampire-diaries',
      script:        'index2.js',           // worker entry — index.js is the launcher
      interpreter:   'node',
      node_args:     '--max-old-space-size=512',
      watch:         false,
      autorestart:   false,
      max_restarts:  20,
      min_uptime:    '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,       // exponential backoff on crashes
      kill_timeout:  8000,                  // 8s for graceful SIGTERM before SIGKILL
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs:    true,
      out_file:      './logs/vd-out.log',
      error_file:    './logs/vd-err.log',
      env: {
        NODE_ENV:   'production',
        AUTH_DIR:   './auth_info_baileys',
        PHONE_FILE: './paired_number.txt',
        BOT_PREFIX: '/',
        BOT_LABEL:  'VampireDiaries',
        // ⚠️  SET THIS — without it MongoDB never connects and ALL commands fail in groups/apps
        // Get your free URI from https://mongodb.com/atlas → Connect → Drivers
        MONGODB_URI: 'mongodb+srv://emberlight2008_db_user:fqn3csH7SJEQtb3T@cluster0.pvq9ily.mongodb.net/vampire-diaries',
      },
    },
  ],
}
