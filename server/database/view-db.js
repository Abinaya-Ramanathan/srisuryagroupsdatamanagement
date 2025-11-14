const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('📊 Database Contents\n');
console.log('='.repeat(80));

// Function to display table contents
const displayTable = (tableName, callback) => {
  db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
    if (err) {
      console.error(`Error reading ${tableName}:`, err.message);
      if (callback) callback();
      return;
    }
    
    console.log(`\n📋 Table: ${tableName.toUpperCase()}`);
    console.log('-'.repeat(80));
    
    if (rows.length === 0) {
      console.log('  (No records found)');
    } else {
      console.log(`  Total records: ${rows.length}\n`);
      rows.forEach((row, index) => {
        console.log(`  Record ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          const displayValue = value === null ? '(null)' : value;
          console.log(`    ${key}: ${displayValue}`);
        });
        console.log('');
      });
    }
    console.log('='.repeat(80));
    
    if (callback) callback();
  });
};

// Display all tables
db.serialize(() => {
  // Get list of tables
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      console.error('Error getting table list:', err);
      db.close();
      return;
    }

    const tableNames = tables.map(t => t.name);
    
    if (tableNames.length === 0) {
      console.log('No tables found in database.');
      db.close();
      return;
    }

    console.log(`Found ${tableNames.length} table(s): ${tableNames.join(', ')}\n`);

    // Display each table
    let currentIndex = 0;
    const displayNext = () => {
      if (currentIndex < tableNames.length) {
        displayTable(tableNames[currentIndex], () => {
          currentIndex++;
          displayNext();
        });
      } else {
        console.log('\n✅ Database view complete!\n');
        db.close();
      }
    };

    displayNext();
  });
});

