import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import config from './utils/config';
import logger from './utils/logger';
import { testDatabaseConnection, disconnectDatabase } from './services/database';
import { initializeFirebase } from './services/pushNotification';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiting';

// Import routes
import stepAuthRoutes from './routes/stepAuth';
import authRoutes from './routes/auth';
import deviceRoutes from './routes/device';
import userRoutes from './routes/user';
import webhookRoutes from './routes/webhook';
import healthRoutes from './routes/health';

// Create Express app
const app: Express = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (config.cors.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Rate limiting
app.use(generalLimiter);

// Request logging
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MoneyTR Phone Authentication API',
    version: '1.0.0',
    documentation: '/api/docs',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/step-auth', stepAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/user', userRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/health', healthRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// SERVER INITIALIZATION
// ============================================

async function startServer() {
  try {
    // Test database connection
    logger.info('🔌 Connecting to database...');
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize Firebase (optional - will not fail if credentials are missing)
    try {
      logger.info('🔥 Initializing Firebase...');
      initializeFirebase();
    } catch (error) {
      logger.warn('⚠️  Firebase initialization skipped (credentials not configured)');
    }

    // Start server
    const PORT = config.port;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${config.node_env}`);
      logger.info(`🌐 API URL: http://localhost:${PORT}`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('✅ HTTP server closed');

        try {
          await disconnectDatabase();
          logger.info('✅ Database disconnected');
        } catch (error) {
          logger.error('❌ Error disconnecting database:', error);
        }

        logger.info('👋 Process terminated');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('💥 Unhandled Promise Rejection:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
