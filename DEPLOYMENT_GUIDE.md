# Deployment Guide - Employee Management System

## Free Hosting Options

### Option 1: Render (Recommended - Easiest)
**Why Render?**
- ✅ Free tier available
- ✅ Supports both frontend and backend
- ✅ Persistent disk storage for SQLite database
- ✅ Easy deployment from GitHub
- ✅ Automatic SSL certificates
- ✅ Can update code and redeploy easily

**Limitations:**
- Free tier spins down after 15 minutes of inactivity (takes ~30 seconds to wake up)
- 750 hours/month free (enough for most use cases)

### Option 2: Railway
- Similar to Render
- Free tier with $5 credit/month
- Good alternative if Render doesn't work

### Option 3: Vercel (Frontend) + Render (Backend)
- Vercel for frontend (excellent performance)
- Render for backend
- More complex setup

---

## Deployment Steps for Render

### Step 1: Prepare Your Code

1. **Create a `.env` file** (don't commit this, but note what you need):
   ```
   PORT=5000
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```

2. **Update API URL in frontend** (we'll do this automatically)

### Step 2: Push to GitHub

1. Create a GitHub account if you don't have one
2. Create a new repository
3. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 3: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `employee-management-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `cd server && node index.js`
   - **Plan**: Free
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns this automatically, but set it)
   - `JWT_SECRET` = (generate a random string)
6. Add a **Disk** (for SQLite database):
   - Name: `employee-db`
   - Mount Path: `/opt/render/project/src/server/database`
   - Size: 1 GB
7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Copy your backend URL (e.g., `https://employee-management-backend.onrender.com`)

### Step 4: Deploy Frontend on Render

1. In Render dashboard, click "New +" → "Web Service"
2. Connect the same GitHub repository
3. Configure:
   - **Name**: `employee-management-frontend`
   - **Environment**: `Node`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Start Command**: `cd client && npx serve -s dist -l 10000`
   - **Plan**: Free
4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `VITE_API_URL` = `https://employee-management-backend.onrender.com` (your backend URL from Step 3)
5. Click "Create Web Service"
6. Wait for deployment

### Step 5: Update Frontend API Configuration

We need to update the frontend to use the production API URL. Let me create the necessary files.

---

## Updating Code After Deployment

**YES, you can still change your code!** Here's how:

1. **Make changes locally** (in your code editor)
2. **Test locally** (run `npm run dev`)
3. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Your change description"
   git push
   ```
4. **Render automatically detects the push** and redeploys (takes 5-10 minutes)
5. **Your website updates automatically!**

**Note**: The first deployment takes longer. Subsequent updates are faster.

---

## Important Notes

### Database Persistence
- SQLite database is stored on Render's persistent disk
- Data persists across deployments
- **Backup your database regularly!**

### Free Tier Limitations
- **Render**: Services spin down after 15 min inactivity (wakes up in ~30 seconds)
- **Railway**: $5 credit/month (usually enough for small apps)

### Custom Domain (Optional)
- Render allows custom domains on free tier
- You can use your own domain name (e.g., `yourapp.com`)

---

## Troubleshooting

### Backend not connecting?
- Check environment variables
- Verify the backend URL is correct
- Check Render logs for errors

### Database not persisting?
- Ensure disk is mounted correctly
- Check disk mount path matches in Render settings

### Frontend can't reach backend?
- Verify `VITE_API_URL` environment variable
- Check CORS settings in backend
- Ensure backend URL is accessible

---

## Alternative: Railway Deployment

If Render doesn't work, Railway is a good alternative:

1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub
4. Add PostgreSQL database (free tier available)
5. Update database connection in code

---

## Need Help?

- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app
- Check deployment logs in Render dashboard for errors

