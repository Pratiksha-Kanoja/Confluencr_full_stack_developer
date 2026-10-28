import { createApp } from './app.js';
import { config } from './config/index.js';
import { initDb } from './database/index.js';

initDb();

const app = createApp();

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Transaction Ledger API is running!`);
    console.log(`📍 Server URL:      http://localhost:${config.port}`);
    console.log(`📊 Web Dashboard:   http://localhost:${config.port}/`);
    console.log(`📚 Swagger Docs:    http://localhost:${config.port}/api-docs`);
    console.log(`🩺 Health Check:    http://localhost:${config.port}/api/health`);
    console.log(`====================================================`);
  });
}

export default app;
