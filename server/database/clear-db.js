const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Clearing all data from database...');

db.serialize(() => {
  // Disable foreign keys temporarily
  db.run('PRAGMA foreign_keys = OFF');

  // Delete all data from tables (in order to respect foreign keys)
  db.run('DELETE FROM daily_employee_counts', (err) => {
    if (err) console.error('Error clearing daily_employee_counts:', err);
    else console.log('✓ Cleared daily_employee_counts');
  });

  db.run('DELETE FROM advances', (err) => {
    if (err) console.error('Error clearing advances:', err);
    else console.log('✓ Cleared advances');
  });

  db.run('DELETE FROM attendance', (err) => {
    if (err) console.error('Error clearing attendance:', err);
    else console.log('✓ Cleared attendance');
  });

  db.run('DELETE FROM employees', (err) => {
    if (err) console.error('Error clearing employees:', err);
    else console.log('✓ Cleared employees');
  });

  db.run('DELETE FROM sectors', (err) => {
    if (err) console.error('Error clearing sectors:', err);
    else console.log('✓ Cleared sectors');
  });

  db.run('DELETE FROM users', (err) => {
    if (err) console.error('Error clearing users:', err);
    else console.log('✓ Cleared users');
  });

  // Reset auto-increment counters
  db.run('DELETE FROM sqlite_sequence', (err) => {
    if (err && !err.message.includes('no such table')) {
      console.error('Error clearing sqlite_sequence:', err);
    } else {
      console.log('✓ Reset auto-increment counters');
    }
  });

  // Re-enable foreign keys
  db.run('PRAGMA foreign_keys = ON', () => {
    console.log('\n✅ All data cleared successfully!');
    console.log('Note: Default users and sectors will be recreated on next server start.');
    db.close();
  });
});

