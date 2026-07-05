require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5000;

// Enable SQLite WAL mode for better concurrent read/write performance.
// Use query API because SQLite PRAGMAs can return rows.
prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(console.error);
prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL').catch(console.error);

app.listen(PORT, () => {
  console.log(`\nEduManage Pro API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
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
