# Quick Deployment Guide

## ✅ Yes, you can still change your code after deployment!

After deploying, you can:
1. Make changes locally
2. Test them
3. Push to GitHub
4. Services automatically redeploy (takes 5-10 minutes)
5. Your website updates automatically!

---

## 🎯 Two Deployment Options

### Option 1: Netlify (Frontend) + Render (Backend) ⭐ Recommended
- **Best performance** - Netlify's CDN makes frontend super fast
- **No sleep time** - Frontend always available
- **Better user experience**
- See: `DEPLOYMENT_NETLIFY_RENDER.md` for detailed guide

### Option 2: Render Only (Simpler)
- **Easier setup** - One platform for everything
- **Still works great** - Good performance
- **Single dashboard** to manage
- See steps below

---

## 🚀 Quick Start - Option 1: Netlify + Render (Recommended)

**For detailed steps, see `DEPLOYMENT_NETLIFY_RENDER.md`**

Quick summary:
1. Deploy backend on Render (see Step 2 below)
2. Deploy frontend on Netlify:
   - Go to [netlify.com](https://netlify.com)
   - Connect GitHub repo
   - Base directory: `client`
   - Build command: `npm install && npm run build`
   - Publish directory: `client/dist`
   - Add env var: `VITE_API_URL` = your Render backend URL
3. Done! Frontend is super fast with CDN.

---

## 🚀 Quick Start - Option 2: Render Only (Simpler)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy Backend
1. Go to [render.com](https://render.com) → Sign up (free)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Settings:
   - **Name**: `employee-management-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `cd server && node index.js`
   - **Plan**: Free
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `JWT_SECRET` = (any random string)
6. Add Disk (for database):
   - Name: `employee-db`
   - Mount: `/opt/render/project/src/server/database`
   - Size: 1 GB
7. Click "Create Web Service"
8. **Copy the URL** (e.g., `https://employee-management-backend.onrender.com`)

### Step 3: Deploy Frontend
1. In Render, click "New +" → "Web Service"
2. Same repository
3. Settings:
   - **Name**: `employee-management-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Start Command**: `cd client && npx serve -s dist -l 10000`
   - **Plan**: Free
4. Add Environment Variable:
   - `VITE_API_URL` = `https://employee-management-backend.onrender.com` (your backend URL)
5. Click "Create Web Service"
6. **Copy the frontend URL** - This is your website!

---

## 📝 Making Updates After Deployment

1. **Edit code locally** (in your editor)
2. **Test locally**: `npm run dev`
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "Your update description"
   git push
   ```
4. **Render automatically redeploys** (check dashboard)
5. **Website updates in 5-10 minutes!**

---

## 🔧 Important Notes

### Free Tier Limitations
- Services sleep after 15 min of inactivity
- First request after sleep takes ~30 seconds to wake up
- 750 hours/month free (usually enough)

### Database
- SQLite database persists on Render's disk
- **Backup important data regularly!**

### Custom Domain (Optional)
- You can add your own domain in Render settings
- Free SSL certificate included

---

## 🆘 Troubleshooting

**Backend not working?**
- Check Render logs
- Verify environment variables
- Ensure disk is mounted

**Frontend can't connect?**
- Verify `VITE_API_URL` matches backend URL
- Check CORS in backend (should be enabled)

**Need help?**
- Check Render dashboard logs
- See full guide in `DEPLOYMENT_GUIDE.md`

---

## 🎉 You're Done!

Your app is now live at your Render frontend URL!

