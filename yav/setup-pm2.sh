#!/usr/bin/env bash
# ═══════════════════════════════════════════════
#   🧛 VAMPIRE DIARIES — PM2 SETUP SCRIPT
#   Run once: bash setup-pm2.sh
# ═══════════════════════════════════════════════
set -e

echo "📦 Installing PM2 globally..."
npm install -g pm2

echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.cjs

echo "💾 Saving PM2 process list..."
pm2 save

echo "🔧 Setting PM2 to auto-start on system reboot..."
pm2 startup
echo ""
echo "⚠️  IMPORTANT: Copy the 'sudo env ...' command PM2 printed above and run it!"
echo ""
echo "✅ Done! Useful commands:"
echo "   pm2 logs vampire-diaries    → live logs"
echo "   pm2 status                  → check status"
echo "   pm2 restart vampire-diaries → restart bot"
echo "   pm2 stop vampire-diaries    → stop bot"
echo "   pm2 delete vampire-diaries  → remove from PM2"
