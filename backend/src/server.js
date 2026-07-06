require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');
const { initScheduler } = require('./services/scheduler.service');

const PORT = process.env.PORT || 5000;

// SQLite WAL mode — only for local dev (not PostgreSQL/Neon on production)
if ((process.env.DB_PROVIDER || 'sqlite') === 'sqlite') {
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {});
  prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL').catch(() => {});
}

app.listen(PORT, () => {
  console.log(`\nIlmForge API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Start notification scheduler after server is ready
  initScheduler();
});

// Graceful shutdown: disconnect Prisma before exiting so SQLite WAL checkpoint
// completes cleanly and no in-flight queries are abandoned mid-write.
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Closing database connection...`);
  prisma.$disconnect()
    .then(() => {
      console.log('Database disconnected. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during shutdown:', err);
      process.exit(1);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
