# Database Management

## Viewing Database Contents

### Method 1: Using the View Script (Recommended)
Run from project root:
```bash
npm run view-db
```

This will display all tables and their contents in a readable format.

### Method 1b: Using the Interactive Management Tool
Run from project root:
```bash
npm run manage-db
```

This provides a menu-driven interface to view and delete entries interactively.

### Method 2: Using SQLite Command Line

1. Install SQLite (if not already installed):
   - Download from: https://www.sqlite.org/download.html
   - Or use: `choco install sqlite` (Windows with Chocolatey)

2. Navigate to the database directory:
```bash
cd server/database
```

3. Open the database:
```bash
sqlite3 database.sqlite
```

4. Useful SQLite commands:
```sql
-- List all tables
.tables

-- View structure of a table
.schema employees

-- View all data from a table
SELECT * FROM employees;

-- View specific columns
SELECT id, name, phone FROM employees;

-- Count records
SELECT COUNT(*) FROM employees;

-- Exit SQLite
.quit
```

### Method 3: Using DB Browser for SQLite (GUI Tool)

1. Download DB Browser for SQLite:
   - https://sqlitebrowser.org/

2. Open the database file:
   - File → Open Database
   - Navigate to: `server/database/database.sqlite`

3. Browse tables and data in a user-friendly interface.

### Method 4: Using VS Code Extension

1. Install "SQLite Viewer" or "SQLite" extension in VS Code
2. Right-click on `database.sqlite` file
3. Select "Open Database" or "View Database"

## Database Tables

- **users**: User accounts (admin, employee)
- **sectors**: Sector information
- **employees**: Employee details
- **attendance**: Daily attendance records
- **advances**: Advance payments (taken/paid)
- **daily_employee_counts**: Daily employee counts for non-workers

## Editing and Deleting Data

### Using the Interactive Management Tool
```bash
npm run manage-db
```

This tool allows you to:
- View all tables and their data
- View specific tables
- Delete entries by ID (with confirmation)

### Using SQLite Command Line

1. Open the database:
```bash
cd server/database
sqlite3 database.sqlite
```

2. Delete an entry:
```sql
-- Delete employee with ID 1
DELETE FROM employees WHERE id = 1;

-- Delete attendance record
DELETE FROM attendance WHERE id = 5;

-- Delete advance record
DELETE FROM advances WHERE id = 3;
```

3. Update an entry:
```sql
-- Update employee name
UPDATE employees SET name = 'New Name' WHERE id = 1;
```

**Note:** When deleting employees, you may need to delete related records first:
```sql
-- Delete related records first
DELETE FROM advances WHERE employee_id = 1;
DELETE FROM attendance WHERE employee_id = 1;
DELETE FROM daily_employee_counts WHERE employee_id = 1;

-- Then delete the employee
DELETE FROM employees WHERE id = 1;
```

For more SQL commands, see `SQL_COMMANDS.md` in this directory.

## Clearing Database

To clear all data:
```bash
npm run clear-db
```

Note: Default users and sectors will be recreated on next server start.

