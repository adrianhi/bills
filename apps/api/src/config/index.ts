import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  legacyOwnerEmail: process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase() || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  resendReceivingDomain: process.env.RESEND_RECEIVING_DOMAIN || '',
  ingestionEncryptionKey: process.env.INGESTION_ENCRYPTION_KEY || '',
  requireBetaInvite: process.env.REQUIRE_BETA_INVITE === 'true',
};
