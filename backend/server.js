require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const database = require('./database/db');

// Trigger redeploy to pick up PostgreSQL DATABASE_URL
// Deploy timestamp: 2025-07-17 18:30
// Restart after database initialization: 18:37
// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const taskRoutes = require('./routes/tasks');
const documentRoutes = require('./routes/documents');

const app = express();

// Trust proxy when running behind Railway, Vercel, etc.
app.set('trust proxy', 1);

// Security: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://agpcrm.vercel.app',
        'https://agp-crm.vercel.app', 
        'https://agpcrm-frontend.vercel.app',
        process.env.FRONTEND_URL
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to database
database.connect();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AGP CRM API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Database status endpoint for debugging
app.get('/api/db-status', async (req, res) => {
  try {
    console.log('🔍 Checking database status...');
    console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('Database type:', database.type);
    
    // Test basic database connection
    const testQuery = database.type === 'postgresql' 
      ? 'SELECT NOW() as current_time'
      : 'SELECT datetime("now") as current_time';
    
    const result = await database.get(testQuery);
    console.log('✅ Database query successful:', result);
    
    // Check if users table exists and has admin user
    let userCount = 0;
    let adminExists = false;
    
    try {
      const users = await database.all('SELECT COUNT(*) as count FROM users');
      userCount = users[0]?.count || 0;
      
      const admin = await database.get('SELECT id FROM users WHERE email = ?', [config.admin.email]);
      adminExists = !!admin;
    } catch (tableError) {
      console.log('⚠️ Users table might not exist:', tableError.message);
    }
    
    res.json({
      status: 'OK',
      database: {
        type: database.type,
        connected: true,
        userCount,
        adminExists,
        hasDbUrl: !!process.env.DATABASE_URL
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      database: {
        type: database.type,
        connected: false,
        error: error.message,
        hasDbUrl: !!process.env.DATABASE_URL
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Database setup endpoint for production initialization
app.post('/api/setup-database', async (req, res) => {
  try {
    console.log('🚀 Setting up database...');
    
    // Import and run the initialization
    const initializeDatabase = require('./scripts/initDb');
    
    // Run initialization
    await new Promise((resolve, reject) => {
      // Since initDb closes the connection, we need to handle this carefully
      const originalClose = database.close;
      database.close = () => {
        console.log('⚠️ Skipping database close during setup');
        resolve();
      };
      
      // Run initialization
      initializeDatabase().then(resolve).catch(reject);
      
      // Restore original close method
      setTimeout(() => {
        database.close = originalClose;
      }, 100);
    });
    
    res.json({
      status: 'SUCCESS',
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Database setup failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check environment variables
app.get('/api/debug-env', (req, res) => {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET (hidden for security)' : 'NOT SET',
    DATABASE_URL_length: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
    DATABASE_URL_starts_with: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + '...' : 'N/A',
    PORT: process.env.PORT,
    config_databaseUrl: config.databaseUrl ? 'SET' : 'NOT SET',
    all_env_keys: Object.keys(process.env).filter(key => key.includes('DATABASE')),
  };
  
  res.json({
    environment_variables: envVars,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);

// Serve uploaded files
app.use('/api/uploads', express.static('uploads'));

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'AGP CRM API Server',
    version: '1.0.0',
    status: 'Running',
    environment: config.nodeEnv
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || config.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AGP CRM Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🗄️  Database: ${config.dbPath}`);
}); 