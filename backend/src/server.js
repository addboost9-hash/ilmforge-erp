require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const { initScheduler } = require('./services/scheduler.service');
const os = require('os');

const PORT = process.env.PORT || 5000;
const isLocal = process.env.NODE_ENV !== 'production';

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

// SQLite WAL mode for local/offline — faster writes
if ((process.env.DB_PROVIDER || 'sqlite') === 'sqlite') {
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA cache_size=10000').catch(() => {});   // 40MB cache
  prisma.$queryRawUnsafe('PRAGMA temp_store=MEMORY').catch(() => {});  // faster temp ops
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
