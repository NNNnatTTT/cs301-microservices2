import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './db/prisma.js';

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL via Prisma');

    app.listen(config.port, () => {
      console.log(`Admin service listening on port ${config.port}`);
      console.log(`Swagger: http://localhost:${config.port}/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
