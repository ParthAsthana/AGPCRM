const database = require('../database/db');

async function createNotificationsTable() {
  try {
    database.connect();
    
    console.log('🔔 Creating notifications table...');
    
    // Create notifications table
    const notificationsSQL = database.type === 'postgresql' ? `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        related_id INTEGER,
        related_type TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    ` : `
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        related_id INTEGER,
        related_type TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;
    
    await database.run(notificationsSQL);
    console.log('✅ Notifications table created successfully');
    
    // Create index for better performance
    await database.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)');
    await database.run('CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read)');
    
    console.log('✅ Notifications indexes created');
    
  } catch (error) {
    console.error('❌ Error creating notifications table:', error);
  } finally {
    database.close();
  }
}

// Run if called directly
if (require.main === module) {
  createNotificationsTable();
}

module.exports = createNotificationsTable; 