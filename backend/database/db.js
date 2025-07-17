const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const config = require('../config');

class Database {
  constructor() {
    this.db = null;
    this.type = null;
    this.pool = null;
  }

  connect() {
    // Check if DATABASE_URL exists (PostgreSQL for production)
    if (process.env.DATABASE_URL || config.databaseUrl) {
      return this.connectPostgreSQL();
    } else {
      return this.connectSQLite();
    }
  }

  connectPostgreSQL() {
    console.log('🐘 Connecting to PostgreSQL database...');
    this.type = 'postgresql';
    
    const connectionString = process.env.DATABASE_URL || config.databaseUrl;
    
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.pool.on('error', (err) => {
      console.error('PostgreSQL client error:', err);
    });

    // Test connection
    this.pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        console.error('❌ Error connecting to PostgreSQL:', err.message);
      } else {
        console.log('✅ Connected to PostgreSQL database successfully');
      }
    });

    return this.pool;
  }

  connectSQLite() {
    console.log('📁 Connecting to SQLite database...');
    this.type = 'sqlite';
    
    const dbPath = path.resolve(config.dbPath);
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening SQLite database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database:', dbPath);
        this.db.run('PRAGMA foreign_keys = ON');
      }
    });

    return this.db;
  }

  close() {
    if (this.type === 'postgresql' && this.pool) {
      this.pool.end(() => {
        console.log('PostgreSQL connection pool closed.');
      });
    } else if (this.type === 'sqlite' && this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing SQLite database:', err.message);
        } else {
          console.log('SQLite database connection closed.');
        }
      });
    }
  }

  // Universal query methods that work with both databases
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgresql') {
        // Convert SQLite-style queries to PostgreSQL
        const pgSql = this.convertToPostgreSQL(sql);
        const pgParams = this.convertParams(params);
        
        this.pool.query(pgSql, pgParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              id: result.rows[0]?.id, 
              changes: result.rowCount,
              rows: result.rows 
            });
          }
        });
      } else {
        // SQLite
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      }
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgresql') {
        const pgSql = this.convertToPostgreSQL(sql);
        const pgParams = this.convertParams(params);
        
        this.pool.query(pgSql, pgParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.rows[0] || null);
          }
        });
      } else {
        // SQLite
        this.db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      }
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (this.type === 'postgresql') {
        const pgSql = this.convertToPostgreSQL(sql);
        const pgParams = this.convertParams(params);
        
        this.pool.query(pgSql, pgParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.rows);
          }
        });
      } else {
        // SQLite
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      }
    });
  }

  // Convert SQLite syntax to PostgreSQL
  convertToPostgreSQL(sql) {
    if (this.type !== 'postgresql') return sql;

    // Convert parameter placeholders from ? to $1, $2, etc.
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

    return convertedSql
      // Replace AUTOINCREMENT with SERIAL (handled in table creation)
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
      // Replace DATETIME with TIMESTAMP
      .replace(/DATETIME/gi, 'TIMESTAMP')
      // Replace BOOLEAN DEFAULT 1 with BOOLEAN DEFAULT true
      .replace(/BOOLEAN DEFAULT 1/gi, 'BOOLEAN DEFAULT true')
      .replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT false')
      // Replace CURRENT_TIMESTAMP for PostgreSQL
      .replace(/DEFAULT CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP');
  }

  // Convert parameter placeholders for PostgreSQL ($1, $2, etc.)
  convertParams(params) {
    if (this.type !== 'postgresql') return params;
    return params;
  }

  // Get the correct SQL for table creation based on database type
  getCreateTableSQL(tableName, columns) {
    if (this.type === 'postgresql') {
      return columns.postgresql || columns.default;
    } else {
      return columns.sqlite || columns.default;
    }
  }
}

const database = new Database();
module.exports = database; 