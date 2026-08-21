import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || 'bhd_secret_token_123456',
  dashboardPin: process.env.DASHBOARD_PIN || '1234',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
