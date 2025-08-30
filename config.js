import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Configuration file - now safe for deployment!
export const config = {
  // ZeroHero API Configuration
  zeroHero: {
    apiKey: process.env.ZERO_HERO_API_KEY, // Must be set in environment
    baseUrl: process.env.ZERO_HERO_BASE_URL || 'https://api.zerohero.com',
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Security
  security: {
    corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3010'],
    sessionSecret: process.env.SESSION_SECRET || 'festival_reports_session_secret_2024',
  },
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || './userdata.db',
    mongoUri: process.env.MONGODB_URI,
  },
}; 