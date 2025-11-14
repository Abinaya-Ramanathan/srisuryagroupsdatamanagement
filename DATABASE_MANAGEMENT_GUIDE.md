# Database Management Guide

## Overview

The Database Management feature allows administrators to view and manage database tables and entries directly from the web interface. This is especially useful when your app is deployed on Render/Netlify and you can't access the database directly.

## Access

1. **Login as Admin** (user1 role - default: `admin` / `admin123`)
2. **Navigate to any sector dashboard**
3. **Click "Database Management" button** in the header (purple button)
4. Or directly visit: `https://your-app.netlify.app/database`

## Features

### 1. View Database Statistics
- See record counts for all tables at a glance
- Updated in real-time

### 2. View Table Data
- Click on any table name in the left sidebar
- View all records with all columns
- Data is displayed in a readable table format
- Long text values are truncated (hover to see full value)

### 3. Delete Individual Entries
- Click "Delete" button next to any record
- Confirm the deletion
- **Note**: Default admin user cannot be deleted (protected)

### 4. Clear Entire Tables
- For `attendance`, `advances`, and `daily_employee_counts` tables
- Click "Clear All" button at the top
- **Warning**: This permanently deletes ALL data from that table
- Cannot be undone!

## Available Tables

1. **users** - User accounts (admin/employee logins)
2. **sectors** - Sector information
3. **employees** - Employee records
4. **attendance** - Attendance records
5. **advances** - Advance payment records
6. **daily_employee_counts** - Daily count records for non-workers

## Security

- ✅ **Admin Only**: Only users with `user1` (admin) role can access
- ✅ **Protected Admin**: Default admin user cannot be deleted
- ✅ **SQL Injection Protection**: Table names are validated
- ✅ **Authentication Required**: Must be logged in as admin

## Usage Examples

### View All Employees
1. Click "employees" in the left sidebar
2. View all employee records with details

### Delete a Specific Attendance Record
1. Click "attendance" table
2. Find the record you want to delete
3. Click "Delete" button
4. Confirm deletion

### Clear All Attendance Data
1. Click "attendance" table
2. Click "Clear All" button at the top
3. Confirm (⚠️ This deletes ALL attendance records!)

## Important Notes

### ⚠️ Warnings
- **Deletions are permanent** - cannot be undone
- **Clear All** deletes everything in that table
- Always backup important data before bulk deletions

### ✅ Safe Operations
- Viewing data is safe (read-only)
- Individual deletions are safe (with confirmation)
- Default admin user is protected from deletion

### 🔒 Protected Tables
- Cannot clear: `users`, `sectors`, `employees` (too important)
- Can clear: `attendance`, `advances`, `daily_employee_counts` (transactional data)

## Troubleshooting

### "Access Denied" Message
- Make sure you're logged in as admin (user1 role)
- Default admin: `admin` / `admin123`

### "Failed to load tables"
- Check your internet connection
- Verify backend is running on Render
- Check browser console for errors

### "Failed to delete"
- Entry might not exist (already deleted)
- Check if it's the protected admin user
- Check backend logs on Render dashboard

## Alternative: Using Render Shell

If you need more advanced database operations, you can use Render's shell:

1. Go to Render dashboard
2. Select your backend service
3. Click "Shell" tab
4. Run commands:
   ```bash
   cd server/database
   sqlite3 database.sqlite
   ```
5. Use SQL commands directly

**Note**: The web interface is easier and safer for most operations!

---

## Quick Reference

| Action | Steps |
|--------|-------|
| View table | Click table name in sidebar |
| Delete entry | Click "Delete" → Confirm |
| Clear table | Click "Clear All" → Confirm |
| View stats | Stats shown at top automatically |
| Go back | Click "Back to Sectors" |

---

**Need Help?** Check the Render dashboard logs if something doesn't work!

