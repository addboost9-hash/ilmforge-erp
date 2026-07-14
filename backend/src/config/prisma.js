const { PrismaClient } = require('@prisma/client');

// Add pgbouncer + pool settings to Neon URL for stable connections
function buildDatabaseUrl() {
  const url = process.env.DATABASE_URL || '';
  if (!url || url.startsWith('file:')) return url;
  try {
    const parsed = new URL(url);
    // Neon free tier needs pgbouncer=true and connection_limit=1
    if (!parsed.searchParams.has('pgbouncer')) parsed.searchParams.set('pgbouncer', 'true');
    if (!parsed.searchParams.has('connection_limit')) parsed.searchParams.set('connection_limit', '5');
    if (!parsed.searchParams.has('pool_timeout')) parsed.searchParams.set('pool_timeout', '20');
    if (!parsed.searchParams.has('connect_timeout')) parsed.searchParams.set('connect_timeout', '15');
    return parsed.toString();
  } catch {
    return url;
  }
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: buildDatabaseUrl(),
    },
  },
});

// Reconnect on connection drop (Neon free tier sleeps after inactivity)
const connectWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
};

connectWithRetry().catch(() => {});

module.exports = prisma;
