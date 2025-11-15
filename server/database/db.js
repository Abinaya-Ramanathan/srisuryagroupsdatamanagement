const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL connection configuration
// Uses DATABASE_URL from environment (provided by Render) or local connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 20 // Maximum number of clients in the pool
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Log connection status
console.log('PostgreSQL database connected');
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL from environment');
} else {
  console.log('Using local PostgreSQL connection (DATABASE_URL not set)');
}

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Initialize database tables
const init = async () => {
  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('user1', 'user2')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sectors table
    await query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL
      )
    `);

    // Employees table
    await query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        sector_id INTEGER NOT NULL REFERENCES sectors(id),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        bank_account VARCHAR(255),
        bank_ifsc VARCHAR(50),
        bank_name VARCHAR(255),
        monthly_wage DECIMAL(10, 2),
        weekly_wage DECIMAL(10, 2),
        salary DECIMAL(10, 2),
        salary_frequency VARCHAR(50) DEFAULT 'daily',
        salary_payment_status VARCHAR(50) DEFAULT 'not_provided',
        salary_payment_amount DECIMAL(10, 2),
        salary_payment_date DATE,
        employee_type VARCHAR(50) DEFAULT 'worker',
        employee_count INTEGER DEFAULT 1,
        designation VARCHAR(50) DEFAULT 'employee',
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        date DATE NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('present', 'absent', 'half')),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);

    // Advances table
    await query(`
      CREATE TABLE IF NOT EXISTS advances (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        amount DECIMAL(10, 2) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'taken' CHECK(type IN ('taken', 'paid')),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily employee counts table (for non-workers)
    await query(`
      CREATE TABLE IF NOT EXISTS daily_employee_counts (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id),
        date DATE NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);

    // Insert default sectors
    const sectors = [
      { code: 'SSBM', name: 'Sri Suriya Blue Metals' },
      { code: 'SSC', name: "Sri Suriyaa's Cafe" },
      { code: 'SSBP', name: 'Sri Surya Bharath Pertroleum' },
      { code: 'SSR', name: 'Sri Surya RiceMill' },
      { code: 'SSACF', name: 'Sri Surya Agro and Cattle Farm' }
    ];

    for (const sector of sectors) {
      await query(
        `INSERT INTO sectors (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
        [sector.code, sector.name]
      );
    }

    // Create default admin user (user1) - password: admin123
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    await query(
      `INSERT INTO users (user_id, password, role) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
      ['admin', defaultPassword, 'user1']
    );

    // Create default employee user (user2) - password: employee123
    const empPassword = bcrypt.hashSync('employee123', 10);
    await query(
      `INSERT INTO users (user_id, password, role) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
      ['employee', empPassword, 'user2']
    );

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Get database pool for direct access (for complex queries)
const getDb = () => pool;

// Get query helper
const getQuery = () => query;

module.exports = { init, getDb, query, getQuery };
