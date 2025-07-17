require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5001,
  jwtSecret: process.env.JWT_SECRET || 'agp_crm_secret_key_change_in_production',
  nodeEnv: process.env.NODE_ENV || 'development',
  // PostgreSQL connection (production) or SQLite (development)
  databaseUrl: process.env.DATABASE_URL,
  dbPath: process.env.DB_PATH || './database/agp_crm.db',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@agpcrm.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  }
}; 