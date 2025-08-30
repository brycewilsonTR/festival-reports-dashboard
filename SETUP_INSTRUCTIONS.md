# Setup Instructions for Festival Reports Dashboard

## 🚀 Quick Setup (5 minutes)

### 1. Create Environment File
Create a file called `.env` in your project root (same folder as `package.json`):

**On Mac/Linux:**
```bash
cp env.example .env
```

**On Windows:**
```cmd
copy env.example .env
```

**Or manually create `.env` with this content:**
```bash
ZERO_HERO_API_KEY=H0SN5VnR3P
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
SESSION_SECRET=festival_reports_session_secret_2024
DATABASE_PATH=./userdata.db
```

### 2. Start Your Application
```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend  
npm start
```

## 🔒 What This Accomplishes

### Before (Insecure):
- ❌ API key visible in `src/api.js`
- ❌ API key visible in `server.js`
- ❌ API key would be committed to git
- ❌ Unsafe for deployment

### After (Secure):
- ✅ API key only in `.env` file (not tracked by git)
- ✅ API key loaded from environment variables
- ✅ Safe for deployment and sharing
- ✅ No need to change your current API key

## 🌐 For Deployment

When you deploy to any platform (Vercel, Heroku, Railway, etc.):

1. **Set environment variables** in your hosting platform
2. **Never commit the `.env` file**
3. **Your API key stays secure**

### Example: Railway Deployment
```bash
# Set environment variables
railway variables set ZERO_HERO_API_KEY=H0SN5VnR3P
railway variables set NODE_ENV=production
railway variables set CORS_ORIGIN=https://yourdomain.com
```

## 🧪 Test Your Setup

1. **Create the `.env` file** (see step 1 above)
2. **Start your server**: `npm run dev`
3. **Check the logs** - you should see no errors
4. **Test the frontend** - it should work normally

## ❓ Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### "API key not working"
- Check that `.env` file exists in project root
- Verify the file has no extra spaces or quotes
- Restart your server after creating `.env`

### "CORS errors"
- Make sure `CORS_ORIGIN` matches your frontend URL
- For local development: `http://localhost:3000` (or whatever port Vite uses)

---

**That's it!** Your API key is now secure and ready for deployment. 🎉 