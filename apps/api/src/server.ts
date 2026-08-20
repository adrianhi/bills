import { createApp } from './app';
import { config } from './config';
import { connectDB } from './config/database';

async function bootstrap() {
  await connectDB();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`🚀 Banco BHD Transaction Tracker API is running!`);
    console.log(`🌐 Dashboard & API: http://localhost:${config.port}`);
    console.log(`📡 Ingestion Endpoint: POST http://localhost:${config.port}/api/v1/transactions`);
    console.log(`📊 Export Endpoint: GET http://localhost:${config.port}/api/v1/transactions/export?format=csv`);
    console.log(`🔒 API Key Auth: Header x-api-key: ${config.apiKey.substring(0, 4)}***`);
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
