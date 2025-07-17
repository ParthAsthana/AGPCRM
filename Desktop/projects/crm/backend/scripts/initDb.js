const bcrypt = require('bcryptjs');
const database = require('../database/db');
const config = require('../config');

async function initializeDatabase() {
  try {
    database.connect();
    
    console.log('🗄️  Initializing AGP CRM Database...');

    // Users table (employees + admin)
    await database.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee', -- admin, employee
        phone TEXT,
        department TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clients table
    await database.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company_name TEXT,
        email TEXT,
        phone TEXT,
        business_type TEXT, -- proprietorship, partnership, pvt_ltd, etc.
        pan_number TEXT,
        gstin TEXT,
        tan_number TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        financial_year_end TEXT DEFAULT '31-03',
        status TEXT DEFAULT 'active', -- active, inactive, archived
        assigned_to INTEGER,
        notes TEXT,
        last_conversation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users (id)
      )
    `);

    // Tasks table
    await database.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        client_id INTEGER,
        assigned_to INTEGER NOT NULL,
        assigned_by INTEGER NOT NULL,
        priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
        status TEXT DEFAULT 'pending', -- pending, in_progress, under_review, completed, cancelled
        category TEXT, -- tax_filing, audit, consultation, compliance, etc.
        due_date DATE,
        completed_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (assigned_by) REFERENCES users (id)
      )
    `);

    // Client documents table
    await database.run(`
      CREATE TABLE IF NOT EXISTS client_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        category TEXT, -- tax_docs, financial_statements, agreements, etc.
        description TEXT,
        uploaded_by INTEGER NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
      )
    `);

    // Task comments/updates table
    await database.run(`
      CREATE TABLE IF NOT EXISTS task_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

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
      console.log('⚠️  IMPORTANT: Change the admin password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('🎉 Database initialization completed!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    database.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase; 