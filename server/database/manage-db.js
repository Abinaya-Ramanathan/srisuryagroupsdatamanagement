const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to display table contents
const displayTable = (tableName, callback) => {
  db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
    if (err) {
      console.error(`Error reading ${tableName}:`, err.message);
      if (callback) callback();
      return;
    }
    
    console.log(`\n📋 ${tableName.toUpperCase()} (${rows.length} records)`);
    console.log('-'.repeat(80));
    
    if (rows.length === 0) {
      console.log('  (No records found)');
    } else {
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ID: ${row.id}`);
        Object.entries(row).forEach(([key, value]) => {
          if (key !== 'id') {
            const displayValue = value === null ? '(null)' : value;
            console.log(`     ${key}: ${displayValue}`);
          }
        });
        console.log('');
      });
    }
    console.log('='.repeat(80));
    
    if (callback) callback();
  });
};

// Delete entry by ID
const deleteEntry = (tableName, id, callback) => {
  db.run(`DELETE FROM ${tableName} WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error(`Error deleting from ${tableName}:`, err.message);
      if (callback) callback();
      return;
    }
    
    if (this.changes === 0) {
      console.log(`\n⚠️  No record found with ID ${id} in ${tableName}`);
    } else {
      console.log(`\n✅ Successfully deleted record with ID ${id} from ${tableName}`);
    }
    
    if (callback) callback();
  });
};

// Get table list
const getTables = (callback) => {
  db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
    if (err) {
      console.error('Error getting table list:', err);
      callback([]);
      return;
    }
    callback(tables.map(t => t.name));
  });
};

// Main menu
const showMenu = () => {
  console.log('\n📊 Database Management Menu');
  console.log('='.repeat(80));
  console.log('1. View all tables');
  console.log('2. View specific table');
  console.log('3. Delete entry by ID');
  console.log('4. Exit');
  console.log('='.repeat(80));
  
  rl.question('\nSelect an option (1-4): ', (answer) => {
    switch(answer.trim()) {
      case '1':
        viewAllTables();
        break;
      case '2':
        viewSpecificTable();
        break;
      case '3':
        deleteEntryMenu();
        break;
      case '4':
        console.log('\n👋 Goodbye!');
        db.close();
        rl.close();
        break;
      default:
        console.log('\n❌ Invalid option. Please try again.');
        showMenu();
    }
  });
};

const viewAllTables = () => {
  getTables((tables) => {
    if (tables.length === 0) {
      console.log('\nNo tables found.');
      showMenu();
      return;
    }
    
    console.log('\n📋 All Tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    let currentIndex = 0;
    const displayNext = () => {
      if (currentIndex < tables.length) {
        displayTable(tables[currentIndex], () => {
          currentIndex++;
          displayNext();
        });
      } else {
        showMenu();
      }
    };
    
    displayNext();
  });
};

const viewSpecificTable = () => {
  getTables((tables) => {
    if (tables.length === 0) {
      console.log('\nNo tables found.');
      showMenu();
      return;
    }
    
    console.log('\nAvailable tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    rl.question('\nEnter table name or number: ', (answer) => {
      const tableName = answer.trim();
      const tableIndex = parseInt(tableName) - 1;
      
      let selectedTable;
      if (!isNaN(tableIndex) && tableIndex >= 0 && tableIndex < tables.length) {
        selectedTable = tables[tableIndex];
      } else if (tables.includes(tableName)) {
        selectedTable = tableName;
      } else {
        console.log('\n❌ Invalid table name.');
        showMenu();
        return;
      }
      
      displayTable(selectedTable, () => {
        showMenu();
      });
    });
  });
};

const deleteEntryMenu = () => {
  getTables((tables) => {
    if (tables.length === 0) {
      console.log('\nNo tables found.');
      showMenu();
      return;
    }
    
    console.log('\nAvailable tables:');
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    rl.question('\nEnter table name or number: ', (tableAnswer) => {
      const tableName = tableAnswer.trim();
      const tableIndex = parseInt(tableName) - 1;
      
      let selectedTable;
      if (!isNaN(tableIndex) && tableIndex >= 0 && tableIndex < tables.length) {
        selectedTable = tables[tableIndex];
      } else if (tables.includes(tableName)) {
        selectedTable = tableName;
      } else {
        console.log('\n❌ Invalid table name.');
        showMenu();
        return;
      }
      
      // Show current records
      displayTable(selectedTable, () => {
        rl.question(`\nEnter ID to delete from ${selectedTable} (or 'cancel' to go back): `, (idAnswer) => {
          if (idAnswer.trim().toLowerCase() === 'cancel') {
            showMenu();
            return;
          }
          
          const id = parseInt(idAnswer.trim());
          if (isNaN(id)) {
            console.log('\n❌ Invalid ID. Please enter a number.');
            showMenu();
            return;
          }
          
          rl.question(`\n⚠️  Are you sure you want to delete ID ${id} from ${selectedTable}? (yes/no): `, (confirm) => {
            if (confirm.trim().toLowerCase() === 'yes') {
              deleteEntry(selectedTable, id, () => {
                showMenu();
              });
            } else {
              console.log('\n❌ Deletion cancelled.');
              showMenu();
            }
          });
        });
      });
    });
  });
};

// Start the application
console.log('🗄️  Database Management Tool');
console.log('Database: ' + dbPath);
showMenu();

