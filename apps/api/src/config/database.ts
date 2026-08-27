import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { logger } from '../shared/observability/logger';

// Load .env from current directory or monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('database_connected');
  } catch (error) {
    logger.error('database_connection_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    process.exit(1);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
  logger.info('database_disconnected');
}
