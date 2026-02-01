import mongoose from 'mongoose';
import env from '@/config/env';
/**
 * Database connection configuration and management
 * Implements connection pooling, retry logic, and graceful shutdown
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionAttempts = 0;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_DELAY_MS = 5000;

  private constructor() {
    this.setupEventHandlers();
  }

  /**
   * Singleton pattern to ensure single database connection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Establish database connection with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.warn('Database already connected');
      return;
    }

    const mongoUri = this.buildMongoUri();

    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10, // Connection pool size
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip IPv6
      });

      this.isConnected = true;
      this.connectionAttempts = 0;
      console.log('✅ Database connected successfully');
    } catch (error) {
      this.connectionAttempts++;
      console.error(
        `❌ Database connection failed (attempt ${this.connectionAttempts}/${this.MAX_RETRY_ATTEMPTS}):`,
        error
      );

      if (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying in ${this.RETRY_DELAY_MS / 1000} seconds...`);
        await this.delay(this.RETRY_DELAY_MS);
        return this.connect();
      } else {
        throw new Error(`Failed to connect to database after ${this.MAX_RETRY_ATTEMPTS} attempts`);
      }
    }
  }

  /**
   * Gracefully disconnect from database
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check database connection health
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Ping database
      if (!mongoose.connection.db) {
        return false;
      }
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): {
    isConnected: boolean;
    readyState: number;
    host?: string;
    name?: string;
  } {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }

  /**
   * Setup event handlers for connection lifecycle
   */
  private setupEventHandlers(): void {
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to database');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected from database');
      this.isConnected = false;
    });

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      await this.gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
      await this.gracefulShutdown('SIGTERM');
    });
  }

  /**
   * Handle graceful shutdown
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n${signal} received. Closing database connection...`);
    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Build MongoDB connection URI
   */
  private buildMongoUri(): string {
    const { MONGODB_URI, MONGODB_OPTIONS } = env;
    if (MONGODB_OPTIONS) {
      const separator = MONGODB_URI.includes('?') ? '&' : '?';
      return `${MONGODB_URI}${separator}${MONGODB_OPTIONS}`;
    }
    return MONGODB_URI;
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const database = DatabaseConnection.getInstance();
