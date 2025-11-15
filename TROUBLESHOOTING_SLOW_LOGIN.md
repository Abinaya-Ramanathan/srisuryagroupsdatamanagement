# Troubleshooting Slow Login

## Common Causes

### 1. **Backend Service Sleeping (Render Free Tier)**
- **Issue**: Render free tier services sleep after 15 minutes of inactivity
- **Symptom**: First request takes 30-60 seconds to wake up
- **Solution**: 
  - Wait for the service to wake up (first request will be slow)
  - Subsequent requests will be fast
  - Consider upgrading to paid tier for always-on service

### 2. **Database Connection Issues**
- **Issue**: PostgreSQL database not connected or connection timeout
- **Symptom**: Login hangs or times out
- **Solution**:
  - Check Render logs for database connection errors
  - Verify `DATABASE_URL` environment variable is set correctly
  - Ensure PostgreSQL service is running on Render

### 3. **Network Latency**
- **Issue**: Slow network connection
- **Symptom**: All requests are slow
- **Solution**: Check your internet connection

### 4. **Database Not Initialized**
- **Issue**: Tables don't exist yet
- **Symptom**: Database errors in logs
- **Solution**: Check server logs - database should auto-initialize on first startup

## Quick Checks

### Check Backend Status
1. Go to Render Dashboard
2. Check your backend service status
3. If it shows "Sleeping", click "Manual Deploy" or wait for it to wake up

### Check Database Status
1. Go to Render Dashboard
2. Check your PostgreSQL service status
3. Ensure it's running (not sleeping)

### Check Environment Variables
1. Go to Render Dashboard → Your Backend Service → Environment
2. Verify `DATABASE_URL` is set correctly
3. Format should be: `postgresql://user:password@host:port/database`

### Check Logs
1. Go to Render Dashboard → Your Backend Service → Logs
2. Look for:
   - `PostgreSQL database connected` ✅
   - `PostgreSQL database initialized successfully` ✅
   - Any error messages ❌

## Solutions Implemented

### 1. Added Request Timeout
- Frontend now has 30-second timeout
- Prevents indefinite hanging

### 2. Better Error Messages
- Shows specific error messages:
  - "Request timed out" - Server is starting up
  - "Cannot connect to server" - Network/server issue
  - "Database connection failed" - Database issue

### 3. Database Connection Pooling
- Added connection timeout (10 seconds)
- Better error handling for database issues

### 4. Query Performance Monitoring
- Logs slow queries (>1 second)
- Helps identify performance issues

## Testing

### Test Login Speed
1. Try logging in
2. If it takes >30 seconds, check:
   - Backend service status on Render
   - Database service status on Render
   - Network connection

### Test After Wake Up
1. If backend was sleeping, first login will be slow
2. Second login should be fast (<2 seconds)
3. This confirms the service is working

## Expected Behavior

### Normal Login
- **Time**: 1-3 seconds
- **Status**: ✅ Working correctly

### First Request After Sleep
- **Time**: 30-60 seconds
- **Status**: ⚠️ Normal for free tier (service waking up)

### Timeout Error
- **Time**: 30 seconds (timeout)
- **Status**: ❌ Check backend/database status

## If Still Having Issues

1. **Check Render Dashboard**:
   - Backend service status
   - Database service status
   - Recent logs

2. **Check Browser Console**:
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

3. **Check Server Logs**:
   - Render Dashboard → Logs
   - Look for error messages
   - Check database connection status

4. **Verify Database**:
   - Ensure PostgreSQL is created
   - Ensure `DATABASE_URL` is correct
   - Check if database is accessible

## Quick Fixes

### If Backend is Sleeping
- Wait 30-60 seconds for first request
- Or manually trigger a deploy on Render

### If Database Connection Fails
- Verify `DATABASE_URL` in environment variables
- Check PostgreSQL service is running
- Restart backend service

### If Still Slow After Wake Up
- Check database query performance in logs
- Verify network connection
- Consider database optimization

---

**Note**: The first request after deployment or sleep will always be slower. This is normal for Render's free tier.

