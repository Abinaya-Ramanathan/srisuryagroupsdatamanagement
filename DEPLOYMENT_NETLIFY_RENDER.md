# Deployment Guide: Netlify (Frontend) + Render (Backend)

## Why Netlify + Render?

### ✅ Advantages:
- **Netlify**: Excellent CDN, very fast global access
- **Netlify**: Optimized for React/Vite apps
- **Netlify**: Generous free tier (100GB bandwidth/month)
- **Netlify**: Instant deployments, preview URLs
- **Render**: Great for Node.js backends
- **Better performance** for frontend (CDN distribution)

### ⚠️ Considerations:
- Two services to manage (but both are easy)
- Need to configure API URL in Netlify

---

## 🚀 Deployment Steps

### Step 1: Push Code to GitHub

```bash
git init
git add .
git config --global user.email "rabinayasep@gmail.com"
git config --global user.name "abinayaramanathan"
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git remote add origin https://github.com/Abinaya-Ramanathan/srisuryagroupsdatamanagement.git
git branch -M Master  
git push -u origin Master
```

---

### Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `srisuryagroupsdatamanagement`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: **Free**
5. Add **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render sets this automatically)
   - `JWT_SECRET` = (generate a random string, e.g., `my-secret-key-123`)
   - `DATABASE_PATH` = `/opt/render/project/src/server/database/database.sqlite` (optional but recommended)
6. Add a **Disk** (for SQLite database) - **CRITICAL FOR DATA PERSISTENCE**:
   - Click **"Add Disk"**
   - **Name**: `employee-db`
   - **Mount Path**: `/opt/render/project/src/server/database` (must be exact!)
   - **Size**: 1 GB
   - **⚠️ IMPORTANT**: Without this disk, your database will be wiped on every deployment!
7. Click **"Create Web Service"**
8. Wait for deployment (5-10 minutes)
9. **Copy your backend URL** (e.g., `https://employee-management-backend.onrender.com`)   https://srisuryagroupsdatamanagement.onrender.com
   - You'll see it in the Render dashboard once deployed

---

### Step 3: Deploy Frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → Sign up (free)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect to **GitHub** and select your repository
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `client/dist`
5. Click **"Show advanced"** and add **Environment Variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://srisuryagroupsdatamanagement.onrender.com` (your backend URL from Step 2)
6. Click **"Deploy site"**
7. Wait for deployment (2-5 minutes)
8. **Your site is live!** Netlify gives you a URL like `https://your-app-name.netlify.app`

**Note**: The `_redirects` file in `client/public/` and `netlify.toml` at the root ensure React Router routes work correctly (fixes 404 errors for routes like `/database`).

---

## 🔄 Making Updates After Deployment

### Same process for both services:

1. **Edit code locally**
2. **Test locally**: `npm run dev`
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your update description"
   git push
   ```
4. **Both Netlify and Render automatically redeploy:**
   - Netlify: Usually 1-2 minutes
   - Render: Usually 5-10 minutes
5. **Website updates automatically!**

---

## 📝 Important Notes

### Netlify Free Tier:
- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ Free SSL
- ✅ CDN (fast global access)
- ✅ No sleep/wake time (always fast)

### Render Free Tier:
- ✅ 750 hours/month
- ✅ Free SSL
- ⚠️ Sleeps after 15 min inactivity (wakes in ~30 seconds)
- ✅ Persistent disk for database

### Database:
- SQLite database is stored on Render's persistent disk
- Data persists across deployments
- **Backup important data regularly!**

---

## 🔧 Configuration Details

### Backend (Render):
- Uses environment variable `PORT` (automatically set)
- Database stored on persistent disk
- CORS is enabled (allows Netlify frontend)

### Frontend (Netlify):
- Uses `VITE_API_URL` environment variable
- Automatically builds and deploys from GitHub
- Served via CDN (very fast)

---

## 🆘 Troubleshooting

### Frontend can't connect to backend?
1. Check `VITE_API_URL` in Netlify environment variables
2. Verify backend URL is correct (from Render dashboard)
3. Check Render logs to ensure backend is running
4. Verify CORS is enabled in backend (should be: `app.use(cors())`)

### Backend not working?
1. Check Render logs
2. Verify environment variables are set
3. Ensure disk is mounted correctly
4. Check database path

### Build fails?
1. Check build logs in Netlify
2. Ensure `client/package.json` has all dependencies
3. Verify build command is correct

---

## 🎉 You're Done!

Your app is now live:
- **Frontend**: `https://your-app-name.netlify.app`
- **Backend**: `https://employee-management-backend.onrender.com`

Both services automatically redeploy when you push to GitHub!

---

## 💡 Pro Tips

1. **Custom Domain**: Both Netlify and Render support custom domains (free SSL)
2. **Preview Deployments**: Netlify creates preview URLs for pull requests
3. **Monitoring**: Check both dashboards for deployment status
4. **Logs**: Use Render logs for backend debugging, Netlify logs for frontend builds

---

## 📊 Comparison: Netlify+Render vs Render-Only

| Feature | Netlify + Render | Render Only |
|---------|------------------|-------------|
| **Setup Complexity** | Medium (2 services) | Easy (1 service) |
| **Frontend Speed** | ⭐⭐⭐⭐⭐ (CDN) | ⭐⭐⭐⭐ (Good) |
| **Backend** | ⭐⭐⭐⭐ (Good) | ⭐⭐⭐⭐ (Good) |
| **Free Tier** | Both generous | Good |
| **Wake Time** | None (always on) | ~30 seconds after sleep |
| **Best For** | Production apps | Simpler setup |

**Recommendation**: Netlify + Render for better performance and user experience!

