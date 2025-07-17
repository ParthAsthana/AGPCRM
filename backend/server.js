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
        'https://agpcrm-lemon.vercel.app',
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
    
    const bcrypt = require('bcryptjs');
    const config = require('./config');
    
    console.log('🗄️ Initializing AGP CRM Database...');
    console.log(`📊 Database Type: ${database.type}`);

    // Create tables based on database type
    await createTables();
    console.log('✅ Database tables created successfully');

    // Create default admin user
    const adminExists = await database.get('SELECT id FROM users WHERE email = ?', [config.admin.email]);
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(config.admin.password, 10);
      
      await database.run(`
        INSERT INTO users (name, email, password, role, department)
        VALUES (?, ?, ?, ?, ?)
      `, ['Admin User', config.admin.email, hashedPassword, 'admin', 'Management']);
      
      console.log('✅ Default admin user created');
      console.log(`📧 Admin Email: ${config.admin.email}`);
      console.log(`🔑 Admin Password: ${config.admin.password}`);
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('🎉 Database initialization completed!');
    
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

async function createTables() {
  // Users table
  const usersSQL = database.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      phone TEXT,
      department TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ` : `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      phone TEXT,
      department TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await database.run(usersSQL);

  // Clients table
  const clientsSQL = database.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      business_type TEXT,
      pan_number TEXT,
      gstin TEXT,
      tan_number TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      financial_year_end TEXT DEFAULT '31-03',
      status TEXT DEFAULT 'active',
      assigned_to INTEGER,
      notes TEXT,
      last_conversation TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company_name TEXT,
      email TEXT,
      phone TEXT,
      business_type TEXT,
      pan_number TEXT,
      gstin TEXT,
      tan_number TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      financial_year_end TEXT DEFAULT '31-03',
      status TEXT DEFAULT 'active',
      assigned_to INTEGER,
      notes TEXT,
      last_conversation TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users (id)
    )
  `;
  await database.run(clientsSQL);

  // Tasks table
  const tasksSQL = database.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      assigned_to INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      category TEXT,
      due_date DATE,
      completed_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (assigned_to) REFERENCES users (id),
      FOREIGN KEY (assigned_by) REFERENCES users (id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      assigned_to INTEGER NOT NULL,
      assigned_by INTEGER NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      category TEXT,
      due_date DATE,
      completed_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (assigned_to) REFERENCES users (id),
      FOREIGN KEY (assigned_by) REFERENCES users (id)
    )
  `;
  await database.run(tasksSQL);

  // Client documents table
  const documentsSQL = database.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS client_documents (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      category TEXT,
      description TEXT,
      uploaded_by INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS client_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      category TEXT,
      description TEXT,
      uploaded_by INTEGER NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id),
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    )
  `;
  await database.run(documentsSQL);

  // Task comments table
  const commentsSQL = database.type === 'postgresql' ? `
    CREATE TABLE IF NOT EXISTS task_comments (
      id SERIAL PRIMARY KEY,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  ` : `
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `;
  await database.run(commentsSQL);
}

// Simple admin user creation endpoint
app.post('/api/create-admin', async (req, res) => {
  try {
    console.log('🚀 Creating admin user...');
    
    const bcrypt = require('bcryptjs');
    const config = require('./config');
    
    // Simple users table creation
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        phone TEXT,
        department TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await database.run(createUsersTable);
    console.log('✅ Users table created');

    // Check if admin exists
    const adminExists = await database.get('SELECT id FROM users WHERE email = $1', [config.admin.email]);
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(config.admin.password, 10);
      
      await database.run(`
        INSERT INTO users (name, email, password, role, department)
        VALUES ($1, $2, $3, $4, $5)
      `, ['Admin User', config.admin.email, hashedPassword, 'admin', 'Management']);
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
    
    res.json({
      status: 'SUCCESS',
      message: 'Admin user created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Admin creation failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Admin creation failed',
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