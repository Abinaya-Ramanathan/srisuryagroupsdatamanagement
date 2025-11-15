# Database Persistence Fix - Data Not Surviving Deployments

## Problem
After deployment, employee data disappears. This happens because the database file is not being stored on Render's persistent disk correctly.

## Root Cause
The database path is relative (`server/database/database.sqlite`), and if the persistent disk isn't properly mounted or the path doesn't match, a new database gets created in a temporary location that gets wiped on redeployment.

## Solution

### Step 1: Verify Render Disk Mount

1. Go to your **Render Dashboard**
2. Select your **backend service** (`srisuryagroupsdatamanagement`)
3. Go to **"Disks"** tab
4. Verify the disk is mounted at: `/opt/render/project/src/server/database`
5. If not, add/update the disk:
   - **Name**: `employee-db`
   - **Mount Path**: `/opt/render/project/src/server/database`
   - **Size**: 1 GB

### Step 2: Update Environment Variable (Optional but Recommended)

1. In Render dashboard, go to **Environment** tab
2. Add environment variable:
   - **Key**: `DATABASE_PATH`
   - **Value**: `/opt/render/project/src/server/database/database.sqlite`
3. This ensures the database uses the persistent disk path

### Step 3: Redeploy

1. The code has been updated to log the database path
2. Push your changes:
   ```bash
   git add .
   git commit -m "Fix database persistence path"
   git push
   ```
3. Wait for Render to redeploy

### Step 4: Verify Database Location

1. After deployment, check Render logs
2. Look for: `Database path: /opt/render/project/src/server/database/database.sqlite`
3. If you see a different path, the disk isn't mounted correctly

## Important Notes

### ✅ Data Should Persist
- **Deployments should NOT delete data** if the disk is properly mounted
- The database file is stored on Render's persistent disk
- Data survives redeployments, restarts, and code updates

### ⚠️ What Causes Data Loss
1. **Disk not mounted** - Database created in temporary location
2. **Wrong mount path** - Database created in wrong location
3. **Disk deleted** - All data lost (rare, but possible)
4. **Manual database clearing** - Using clear-db script or admin panel

### 🔍 How to Check Current Database

1. **Via Admin Panel** (if accessible):
   - Go to `/database` page
   - Check table record counts

2. **Via Render Shell**:
   - Go to Render dashboard → Your service → Shell tab
   - Run:
     ```bash
     cd /opt/render/project/src/server/database
     ls -la
     sqlite3 database.sqlite "SELECT COUNT(*) FROM employees;"
     ```

3. **Check Logs**:
   - Render logs will show: `Database path: ...`
   - This tells you where the database is located

## Prevention

### Always Verify Before Important Operations
1. Check Render disk is mounted correctly
2. Verify database path in logs
3. Backup important data before major changes

### Regular Backups
Consider exporting data regularly:
- Use the Database Management page to view data
- Export important records
- Keep backups of your database file

## Recovery

### If Data is Lost
Unfortunately, if the database was created in a temporary location and that location was wiped, the data cannot be recovered. However:

1. **Check if disk has old data**:
   - Use Render Shell to check the persistent disk
   - There might be an old database file

2. **Check Render backups** (if available on your plan)

3. **Re-enter data**:
   - Use the admin panel to add employees again
   - This time, ensure the disk is properly mounted

## Verification Checklist

After fixing, verify:
- [ ] Disk is mounted at `/opt/render/project/src/server/database`
- [ ] Logs show correct database path
- [ ] Data persists after redeployment
- [ ] Can add employees and they remain after deployment

## Next Steps

1. **Fix the disk mount** (if not correct)
2. **Add environment variable** (optional but recommended)
3. **Redeploy** and verify
4. **Test** by adding an employee and redeploying again
5. **Confirm** data persists

---

**Remember**: The database should persist across deployments if the persistent disk is properly configured!

