import { createApp } from './app';
import { config, validateRuntimeConfig } from './config';
import { connectDB } from './config/database';

async function bootstrap() {
  validateRuntimeConfig();
  await connectDB();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`🚀 bills. multi-bank API is running!`);
    console.log(`🌐 Dashboard & API: http://localhost:${config.port}`);
    console.log(`📡 Authenticated API: http://localhost:${config.port}/api/v1`);
    console.log(`📊 Export Endpoint: GET http://localhost:${config.port}/api/v1/transactions/export?format=csv`);
    console.log(`🔒 Authentication: Supabase JWT`);
  });

  const shutdown = async () => {
    console.log('\n🛑 Gracefully shutting down...');
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}
