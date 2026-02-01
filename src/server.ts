import { database } from '@/infrastructure/database/connection';
import { env } from '@/config/env.config';
import { createApp } from 'app';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await database.connect();

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(env.PORT, () => {
      console.log('='.repeat(50));
      console.log('🚀 Server Started Successfully');
      console.log('='.repeat(50));
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Port: ${env.PORT}`);
      console.log(`📊 API: http://localhost:${env.PORT}/api/${env.API_VERSION}`);
      console.log(`❤️  Health: http://localhost:${env.PORT}/health`);
      console.log('='.repeat(50));
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
