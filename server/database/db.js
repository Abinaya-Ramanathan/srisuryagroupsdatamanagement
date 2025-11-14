const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const init = () => {
  // Users table
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user1', 'user2')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Sectors table
    db.run(`CREATE TABLE IF NOT EXISTS sectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    )`);

    // Employees table
    db.run(`CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sector_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      bank_name TEXT,
      monthly_wage REAL,
      weekly_wage REAL,
      salary REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sector_id) REFERENCES sectors(id)
    )`);

    const safeAlter = (sql) => {
      db.run(sql, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column name')) {
          console.error(`Failed to run migration: ${sql}`, alterErr);
        }
      });
    };

    // Ensure new employee salary metadata columns exist
    safeAlter(`ALTER TABLE employees ADD COLUMN salary_frequency TEXT DEFAULT 'daily'`);
    safeAlter(`ALTER TABLE employees ADD COLUMN salary_payment_status TEXT DEFAULT 'not_provided'`);
    safeAlter(`ALTER TABLE employees ADD COLUMN salary_payment_amount REAL`);
    safeAlter(`ALTER TABLE employees ADD COLUMN salary_payment_date TEXT`);
    safeAlter(`ALTER TABLE employees ADD COLUMN employee_type TEXT DEFAULT 'worker'`);
    safeAlter(`ALTER TABLE employees ADD COLUMN employee_count INTEGER DEFAULT 1`);
    safeAlter(`ALTER TABLE employees ADD COLUMN designation TEXT DEFAULT 'employee'`);
    safeAlter(`ALTER TABLE employees ADD COLUMN reason TEXT`);

    // Attendance table
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'half')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(employee_id, date)
    )`);

    // Ensure attendance table allows half-day entries for legacy databases
    db.get(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'attendance'`, (err, row) => {
      if (err) {
        console.error('Failed to inspect attendance table', err);
        return;
      }

      if (row && row.sql && !row.sql.includes("'half'")) {
        db.serialize(() => {
          console.log('Upgrading attendance table to support half-day statuses');
          db.run('PRAGMA foreign_keys=off');
          db.run('ALTER TABLE attendance RENAME TO attendance__old');
          db.run(`CREATE TABLE attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'half')),
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (created_by) REFERENCES users(id),
            UNIQUE(employee_id, date)
          )`);
          db.run(`INSERT INTO attendance (id, employee_id, date, status, created_by, created_at)
                  SELECT id, employee_id, date, status, created_by, created_at FROM attendance__old`);
          db.run('DROP TABLE attendance__old');
          db.run('PRAGMA foreign_keys=on');
        });
      }
    });

    // Advances table
    db.run(`CREATE TABLE IF NOT EXISTS advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'taken' CHECK(type IN ('taken','paid')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // Daily employee counts table (for non-workers)
    db.run(`CREATE TABLE IF NOT EXISTS daily_employee_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(employee_id, date)
    )`);

    // Ensure legacy databases have the advance type column
    db.run(`ALTER TABLE advances ADD COLUMN type TEXT DEFAULT 'taken'`, (alterErr) => {
      if (alterErr && !alterErr.message.includes('duplicate column')) {
        console.error('Failed to add type column to advances table', alterErr);
      }
    });

    // Insert default sectors
    const sectors = [
      { code: 'SSBM', name: 'Sri Suriya Blue Metals' },
      { code: 'SSC', name: "Sri Suriyaa's Cafe" },
      { code: 'SSBP', name: 'Sri Surya Bharath Pertroleum' },
      { code: 'SSR', name: 'Sri Surya RiceMill' },
      { code: 'SSACF', name: 'Sri Surya Agro and Cattle Farm' }
    ];

    sectors.forEach(sector => {
      db.run(`INSERT OR IGNORE INTO sectors (code, name) VALUES (?, ?)`, 
        [sector.code, sector.name]);
    });

    // Create default admin user (user1) - password: admin123
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (user_id, password, role) VALUES (?, ?, ?)`,
      ['admin', defaultPassword, 'user1']);

    // Create default employee user (user2) - password: employee123
    const empPassword = bcrypt.hashSync('employee123', 10);
    db.run(`INSERT OR IGNORE INTO users (user_id, password, role) VALUES (?, ?, ?)`,
      ['employee', empPassword, 'user2']);

    console.log('Database initialized successfully');
  });
};

const getDb = () => db;

module.exports = { init, getDb };

