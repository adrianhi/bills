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
  apiPublicUrl: process.env.API_PUBLIC_URL || 'http://localhost:3000',
  legacyOwnerEmail: process.env.LEGACY_OWNER_EMAIL?.trim().toLowerCase() || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || '',
  resendReceivingDomain: process.env.RESEND_RECEIVING_DOMAIN || '',
  ingestionEncryptionKey: process.env.INGESTION_ENCRYPTION_KEY || '',
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  googleOAuthRedirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.API_PUBLIC_URL || 'http://localhost:3000'}/api/v1/oauth/google/callback`,
  gmailInitialSyncDays: Math.min(
    Math.max(parseInt(process.env.GMAIL_INITIAL_SYNC_DAYS || '90', 10), 1),
    365
  ),
  gmailSyncMaxMessages: Math.min(
    Math.max(parseInt(process.env.GMAIL_SYNC_MAX_MESSAGES || '100', 10), 1),
    500
  ),
  legalProviderName: process.env.LEGAL_PROVIDER_NAME || '',
  legalProviderId: process.env.LEGAL_PROVIDER_ID || '',
  legalContactEmail: process.env.LEGAL_CONTACT_EMAIL || '',
  legalContactAddress: process.env.LEGAL_CONTACT_ADDRESS || '',
  legalAuditSalt: process.env.LEGAL_AUDIT_SALT || '',
  requireBetaInvite: process.env.REQUIRE_BETA_INVITE === 'true',
};

export function validateRuntimeConfig() {
  const errors: string[] = [];
  if (!config.databaseUrl) errors.push('DATABASE_URL');
  if (!config.supabaseUrl) errors.push('SUPABASE_URL');
  if (!config.supabasePublishableKey) errors.push('SUPABASE_PUBLISHABLE_KEY');

  if (config.nodeEnv === 'production') {
    if (!config.legalProviderName) errors.push('LEGAL_PROVIDER_NAME');
    if (!config.legalContactEmail) errors.push('LEGAL_CONTACT_EMAIL');
    if (!config.legalContactAddress) errors.push('LEGAL_CONTACT_ADDRESS');
    if (config.legalAuditSalt.length < 32) errors.push('LEGAL_AUDIT_SALT (minimum 32 characters)');
    const encryptionKey = Buffer.from(config.ingestionEncryptionKey, 'base64');
    if (encryptionKey.length !== 32) errors.push('INGESTION_ENCRYPTION_KEY (32 bytes, base64)');
    if (!config.appUrl.startsWith('https://')) errors.push('APP_URL (HTTPS required)');
    if (!config.apiPublicUrl.startsWith('https://')) errors.push('API_PUBLIC_URL (HTTPS required)');
  }

  const hasGoogleId = Boolean(config.googleOAuthClientId);
  const hasGoogleSecret = Boolean(config.googleOAuthClientSecret);
  if (hasGoogleId !== hasGoogleSecret) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured together');
  }
  if (errors.length) throw new Error(`Invalid runtime configuration: ${errors.join(', ')}`);
}
