require('dotenv').config();
const app    = require('./app');
const prisma = require('./config/prisma');
const { initScheduler, startKeepAlivePing } = require('./services/scheduler.service');
const os   = require('os');
const fs   = require('fs');
const path = require('path');

const PORT    = process.env.PORT || 5000;
const isLocal = process.env.NODE_ENV !== 'production';
const dbUrl   = process.env.DATABASE_URL || '';
const isOffline = dbUrl.startsWith('file:');

/* ── Offline License Check ───────────────────────────────────────────
   Reads license.json one level above backend (installed by Setup.ps1)
   If expired → server refuses to start with clear message
─────────────────────────────────────────────────────────────────── */
if (isOffline) {
  const licPaths = [
    path.join(__dirname, '..', '..', '..', 'license.json'),  // C:\Program Files\IlmForge\license.json
    path.join(__dirname, '..', '..', 'license.json'),
  ];
  let lic = null;
  for (const p of licPaths) {
    if (fs.existsSync(p)) { try { lic = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {} break; }
  }

  if (!lic) {
    console.error('\n╔══════════════════════════════════════════════════╗');
    console.error('║  ❌  LICENSE NOT FOUND                           ║');
    console.error('║  license.json missing. Re-install IlmForge.     ║');
    console.error('║  Support: WhatsApp 0346-5146609                  ║');
    console.error('╚══════════════════════════════════════════════════╝\n');
    process.exit(1);
  }

  if (lic.expiry) {
    const expiry  = new Date(lic.expiry);
    const today   = new Date();
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      console.error('\n╔══════════════════════════════════════════════════╗');
      console.error('║  ❌  LICENSE EXPIRED                             ║');
      console.error(`║  Expiry: ${lic.expiry}                          ║`);
      console.error('║  Renewal: WhatsApp 0346-5146609                  ║');
      console.error('║  IlmForge support se nayi key mangwayein.        ║');
      console.error('╚══════════════════════════════════════════════════╝\n');
      process.exit(1);
    }

    if (daysLeft <= 7) {
      console.warn(`\n⚠️  LICENSE EXPIRING SOON: ${daysLeft} days left (${lic.expiry})`);
      console.warn('   Renewal: WhatsApp 0346-5146609\n');
    } else {
      console.log(`✅ License valid — ${daysLeft} days remaining (expires: ${lic.expiry})`);
    }
  }

/* ── Get local network IPs for LAN access ── */
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

}

// SQLite WAL mode — only when using local file-based SQLite
if (isOffline) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA cache_size=10000').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA temp_store=MEMORY').catch(() => {});
}

app.listen(PORT, '0.0.0.0', () => {  // 0.0.0.0 = accept connections from all network interfaces (LAN)
  const localIPs = getLocalIPs();

  console.log('\n' + '═'.repeat(60));
  console.log('  🎓 IlmForge School Management System');
  console.log('  اِلم کو آسان بنائے 🇵🇰');
  console.log('═'.repeat(60));
  console.log(`\n  Mode: ${isLocal ? '📴 LOCAL/OFFLINE' : '☁️  CLOUD'}`);
  console.log(`  Database: ${process.env.DB_PROVIDER === 'postgresql' ? '☁️  Neon PostgreSQL' : '📁 Local SQLite (Offline)'}`);
  console.log('\n  ─── Access URLs ───────────────────────────────');
  console.log(`  🖥️  This Computer:  http://localhost:${PORT}`);
  if (localIPs.length > 0) {
    localIPs.forEach(ip => {
      console.log(`  📡 School Network:  http://${ip}:${PORT}`);
    });
  }
  console.log(`  🔍 Health Check:    http://localhost:${PORT}/health`);
  console.log('\n  ─── Status ───────────────────────────────────');
  console.log('  ✅ Server running');
  console.log('  ✅ Database connected');
  console.log(`  ${isLocal ? '✅' : '⚠️'} Offline mode: ${isLocal ? 'ENABLED' : 'DISABLED (Cloud mode)'}`);
  console.log('═'.repeat(60) + '\n');

  // Start notification scheduler
  initScheduler();
  // Keep Render free tier alive (prevents 15-min spin-down)
  startKeepAlivePing();
});

/* ── Graceful shutdown ── */
const shutdown = (signal) => {
  console.log(`\n[${signal}] IlmForge server band ho raha hai...`);
  prisma.$disconnect()
    .then(() => {
      console.log('Database disconnect ho gaya. Khuda Hafiz!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Shutdown error:', err);
      process.exit(1);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
