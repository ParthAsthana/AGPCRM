const initializeDatabase = require('./initDb');

console.log('🚀 Setting up production database...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please add a PostgreSQL database to your Railway project.');
  process.exit(1);
}

initializeDatabase(); 