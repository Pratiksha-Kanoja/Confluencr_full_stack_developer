import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import apiRouter from './routes/index.js';
import accountRoutes from './routes/account.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import transferRoutes from './routes/transfer.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { NotFoundError } from './errors/app-error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files for Frontend Dashboard
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));

  // Load and mount Swagger documentation
  try {
    const swaggerDocPath = path.join(__dirname, 'docs', 'openapi.yaml');
    const swaggerDocument = YAML.load(swaggerDocPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (err) {
    console.warn('Warning: Could not load Swagger documentation file:', err);
  }

  // API Routes (mounted under both /api and root paths for maximum compatibility)
  app.use('/api', apiRouter);
  app.use('/accounts', accountRoutes);
  app.use('/transactions', transactionRoutes);
  app.use('/transfers', transferRoutes);

  // Catch-all 404 handler for unmatched routes
  app.use((req: Request, _res: Response, next) => {
    // If browser request for UI, fallback to index.html
    if (req.accepts('html') && req.method === 'GET') {
      return next();
    }
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
