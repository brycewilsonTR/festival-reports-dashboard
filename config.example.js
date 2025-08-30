// Configuration example - copy this to config.js and fill in your values
export const config = {
  // ZeroHero API Configuration
  zeroHero: {
    apiKey: process.env.ZERO_HERO_API_KEY || 'your_api_key_here',
    baseUrl: process.env.ZERO_HERO_BASE_URL || 'https://api.zerohero.com',
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Security
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_here',
  },
  
  // Database
  database: {
    path: process.env.DATABASE_PATH || './userdata.db',
  },
}; 