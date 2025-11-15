# PostgreSQL Migration Guide

## Overview
The application has been migrated from SQLite to PostgreSQL to take advantage of Render's free 500MB PostgreSQL database.

## What Changed

### 1. Database Driver
- **Before**: `sqlite3` package
- **After**: `pg` (node-postgres) package

### 2. Database Connection
- **Before**: File-based SQLite database
- **After**: PostgreSQL connection via `DATABASE_URL` environment variable

### 3. Query Syntax
- **Before**: SQLite syntax with `?` placeholders
- **After**: PostgreSQL syntax with `$1, $2, $3` placeholders

### 4. Query Methods
- **Before**: Callback-based (`db.get()`, `db.all()`, `db.run()`)
- **After**: Promise-based with async/await (`await query()`)

## Setup on Render

### Step 1: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `employee-management-db` (or any name you prefer)
   - **Database**: `employee_management` (or leave default)
   - **User**: (auto-generated)
   - **Region**: Choose closest to your backend
   - **PostgreSQL Version**: Latest (14 or 15)
   - **Plan**: **Free** (500 MB)
4. Click **"Create Database"**
5. **Copy the Internal Database URL** (you'll need this)

### Step 2: Update Backend Service

1. Go to your backend service on Render
2. Go to **"Environment"** tab
3. Add/Update environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the Internal Database URL from Step 1
     - Format: `postgresql://user:password@host:port/database`
4. **Remove** the persistent disk (no longer needed!)
   - Go to **"Disks"** tab
   - Delete the `employee-db` disk if it exists

### Step 3: Redeploy Backend

1. The code changes are already in place
2. Push to GitHub:
   ```bash
   git add .
   git commit -m "Migrate to PostgreSQL"
   git push
   ```
3. Render will automatically redeploy
4. The database will be automatically initialized on first startup

## Local Development Setup

### Option 1: Use Local PostgreSQL

1. Install PostgreSQL on your machine
2. Create a database:
   ```bash
   createdb employee_management
   ```
3. Create `.env` file in project root:
   ```
   DATABASE_URL=postgresql://localhost:5432/employee_management
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your-secret-key
   ```
4. Run the server - database will auto-initialize

### Option 2: Use Render PostgreSQL (for testing)

1. Use the same `DATABASE_URL` from Render
2. Add to `.env` file
3. Run locally - will connect to Render's database

## Key Differences

### SQL Syntax Changes

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `TEXT` | `VARCHAR(255)` or `TEXT` |
| `REAL` | `DECIMAL(10, 2)` |
| `DATETIME` | `TIMESTAMP` |
| `?` placeholders | `$1, $2, $3` placeholders |
| `INSERT OR REPLACE` | `INSERT ... ON CONFLICT ... DO UPDATE` |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT ... DO NOTHING` |
| `this.lastID` | `RETURNING id` |
| `this.changes` | `result.rowCount` |

### Code Changes

**Before (SQLite):**
```javascript
db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
  if (err) return res.status(500).json({ error: 'Database error' });
  res.json(user);
});
```

**After (PostgreSQL):**
```javascript
const result = await query('SELECT * FROM users WHERE id = $1', [id]);
res.json(result.rows[0]);
```

## Benefits of PostgreSQL

1. **Free 500MB** on Render (vs paid SQLite storage)
2. **Better performance** for concurrent connections
3. **More features** (JSON support, full-text search, etc.)
4. **Better for production** - industry standard
5. **Automatic backups** on Render (on paid plans)

## Verification

After deployment, verify:

1. **Check logs** for: `PostgreSQL database connected`
2. **Check logs** for: `PostgreSQL database initialized successfully`
3. **Test login** - should work with default credentials
4. **Add an employee** - should save correctly
5. **Check database** via admin panel at `/database`

## Troubleshooting

### "Connection refused" error
- Check `DATABASE_URL` is set correctly
- Verify PostgreSQL service is running on Render
- Check firewall/network settings

### "Table does not exist" error
- Database might not have initialized
- Check server logs for initialization errors
- Restart the backend service

### "Password authentication failed"
- Verify `DATABASE_URL` has correct credentials
- Check if database user has proper permissions

### Data not persisting
- PostgreSQL data persists automatically (no disk needed)
- Check if you're connecting to the right database
- Verify environment variables are set

## Migration Notes

- **No data migration needed** - fresh start with PostgreSQL
- **All existing SQLite data will be lost** (this is expected)
- **Default users and sectors** will be recreated automatically
- **You'll need to re-add employees** after migration

## Next Steps

1. ✅ Create PostgreSQL database on Render
2. ✅ Update `DATABASE_URL` environment variable
3. ✅ Remove persistent disk
4. ✅ Redeploy backend
5. ✅ Verify everything works
6. ✅ Re-add your employee data

---

**Note**: The migration is complete in the code. You just need to set up the PostgreSQL database on Render and update the environment variable!

