# SQL Commands for Database Management

## Using SQLite Command Line

### 1. Open SQLite Database
```bash
cd server/database
sqlite3 database.sqlite
```

### 2. Enable Better Formatting
```sql
.mode column
.headers on
```

## DELETE Operations

### Delete a Single Entry by ID
```sql
-- Delete employee with ID 1
DELETE FROM employees WHERE id = 1;

-- Delete attendance record with ID 5
DELETE FROM attendance WHERE id = 5;

-- Delete advance record with ID 3
DELETE FROM advances WHERE id = 3;
```

### Delete Multiple Entries
```sql
-- Delete all employees from a specific sector
DELETE FROM employees WHERE sector_id = 1;

-- Delete all attendance records for a specific date
DELETE FROM attendance WHERE date = '2024-01-15';

-- Delete all advances for a specific employee
DELETE FROM advances WHERE employee_id = 5;
```

### Delete All Records from a Table
```sql
-- Delete all employees (WARNING: This deletes everything!)
DELETE FROM employees;

-- Delete all attendance records
DELETE FROM attendance;

-- Delete all advances
DELETE FROM advances;
```

## UPDATE Operations

### Update a Single Field
```sql
-- Update employee name
UPDATE employees SET name = 'New Name' WHERE id = 1;

-- Update employee phone
UPDATE employees SET phone = '1234567890' WHERE id = 1;

-- Update attendance status
UPDATE attendance SET status = 'present' WHERE id = 1;
```

### Update Multiple Fields
```sql
UPDATE employees 
SET name = 'New Name', phone = '1234567890', address = 'New Address'
WHERE id = 1;
```

## SELECT Operations (View Data)

### View All Records
```sql
SELECT * FROM employees;
SELECT * FROM attendance;
SELECT * FROM advances;
SELECT * FROM sectors;
SELECT * FROM users;
SELECT * FROM daily_employee_counts;
```

### View Specific Columns
```sql
SELECT id, name, phone FROM employees;
SELECT employee_id, date, status FROM attendance;
```

### View with Conditions
```sql
-- View employees from a specific sector
SELECT * FROM employees WHERE sector_id = 1;

-- View attendance for a specific date
SELECT * FROM attendance WHERE date = '2024-01-15';

-- View advances for a specific employee
SELECT * FROM advances WHERE employee_id = 5;
```

### Count Records
```sql
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM attendance WHERE date = '2024-01-15';
```

## Useful SQLite Commands

```sql
-- List all tables
.tables

-- View table structure
.schema employees
.schema attendance

-- View all data with better formatting
.mode column
.headers on
SELECT * FROM employees;

-- Export data to CSV
.mode csv
.headers on
.output employees.csv
SELECT * FROM employees;
.output stdout

-- Exit SQLite
.quit
```

## Common Operations Examples

### Example 1: Delete an Employee
```sql
-- First, delete related records (due to foreign keys)
DELETE FROM advances WHERE employee_id = 1;
DELETE FROM attendance WHERE employee_id = 1;
DELETE FROM daily_employee_counts WHERE employee_id = 1;

-- Then delete the employee
DELETE FROM employees WHERE id = 1;
```

### Example 2: Update Employee Details
```sql
UPDATE employees 
SET name = 'John Doe', 
    phone = '9876543210',
    address = '123 Main St'
WHERE id = 1;
```

### Example 3: Delete All Data for Testing
```sql
DELETE FROM daily_employee_counts;
DELETE FROM advances;
DELETE FROM attendance;
DELETE FROM employees;
DELETE FROM sectors;
DELETE FROM users;
```

## Using the Interactive Management Tool

Run from project root:
```bash
npm run manage-db
```

This provides a menu-driven interface to:
- View all tables
- View specific table
- Delete entries by ID
- Interactive confirmation before deletion

