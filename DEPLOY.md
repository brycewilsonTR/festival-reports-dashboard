# Festival Reports - Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Set Up MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account and cluster
3. Get your connection string
4. Update your `.env` file with `MONGODB_URI`

### 2. Deploy Backend to Railway
1. Go to [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add environment variables:
   - `MONGODB_URI` (your MongoDB connection string)
   - `ZERO_HERO_API_KEY` (your existing API key)
   - `SESSION_SECRET` (generate a random string)
   - `NODE_ENV=production`
4. Deploy!

### 3. Deploy Frontend to Vercel
1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable: `VITE_API_URL` (your Railway backend URL)
6. Deploy!

## 🔧 Environment Variables

### Backend (.env for Railway)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/festival-reports?retryWrites=true&w=majority
ZERO_HERO_API_KEY=your_api_key_here
SESSION_SECRET=random_secret_string_here
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Frontend (Vercel Environment Variables)
```bash
VITE_API_URL=https://your-backend-domain.railway.app
```

## 📱 Real-Time Updates

Your app now includes Socket.io for real-time updates:
- Users see changes immediately
- Global updates sync across all devices
- Personal updates stay private to each user

## 🌐 Access Your App

- **Backend API**: `https://your-app-name.railway.app`
- **Frontend**: `https://your-app-name.vercel.app`
- **Health Check**: `https://your-app-name.railway.app/health`

## 🔍 Testing

1. Test backend health: Visit `/health` endpoint
2. Test real-time: Open multiple browser tabs
3. Test database: Create a user and verify data persists

## 🆘 Troubleshooting

- **Database connection issues**: Check MongoDB Atlas network access
- **CORS errors**: Verify CORS_ORIGIN in backend environment
- **Build failures**: Check Railway logs for error details 