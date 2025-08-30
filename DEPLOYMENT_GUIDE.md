# Deployment Guide for Festival Reports Dashboard

## 🚨 BEFORE DEPLOYING - SECURITY CHECKLIST

1. **✅ Change your ZeroHero API key** (CRITICAL!)
2. **✅ Remove hardcoded API keys from code**
3. **✅ Set up proper environment variables**
4. **✅ Test locally with new configuration**

## 🌐 Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy frontend**:
   ```bash
   cd frontend
   vercel
   ```

3. **Update API base URL** in `src/api.js`:
   ```javascript
   const API_BASE_URL = 'https://your-backend-url.railway.app/api';
   ```

#### Backend (Railway)
1. **Create Railway account** at [railway.app](https://railway.app)
2. **Connect your GitHub repository**
3. **Set environment variables**:
   - `ZERO_HERO_API_KEY` = your_new_api_key
   - `NODE_ENV` = production
   - `CORS_ORIGIN` = your_frontend_url

### Option 2: Heroku

#### Frontend + Backend
1. **Install Heroku CLI**
2. **Create Heroku app**:
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**:
   ```bash
   heroku config:set ZERO_HERO_API_KEY=your_new_api_key
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://your-app-name.herokuapp.com
   ```

4. **Deploy**:
   ```bash
   git push heroku main
   ```

### Option 3: Self-Hosted VPS

1. **Rent a VPS** (DigitalOcean, Linode, AWS)
2. **Set up domain name** pointing to your server
3. **Install Node.js and PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   npm install -g pm2
   ```

4. **Set up nginx reverse proxy**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## 🔧 Environment Variables Setup

Create a `.env` file (never commit this to git):

```bash
# ZeroHero API Configuration
ZERO_HERO_API_KEY=your_new_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=production

# Security
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your_very_long_random_secret_here

# Database
DATABASE_PATH=./userdata.db
```

## 📱 Sharing with Others

### For Local Network Sharing
1. **Find your local IP**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update CORS origin** in `config.js`:
   ```javascript
   corsOrigin: 'http://192.168.1.100:3000' // Your local IP
   ```

3. **Share your local IP** with others on the same network

### For Internet Access
1. **Deploy using one of the options above**
2. **Share the public URL** with others
3. **Set up user accounts** for access control

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Start production server
npm run start:prod
```

## 🔒 Security After Deployment

1. **Monitor API usage** in your ZeroHero account
2. **Set up logging** to track access
3. **Regular security updates**
4. **Backup your database regularly**

## 📞 Troubleshooting

### Common Issues:
- **CORS errors**: Check `CORS_ORIGIN` setting
- **API key errors**: Verify environment variables
- **Port conflicts**: Change `PORT` in config
- **Database errors**: Check file permissions

### Getting Help:
1. Check the logs: `npm run logs`
2. Verify environment variables are set
3. Test API connectivity manually
4. Check ZeroHero API status

---

**Remember**: Always test locally before deploying, and never expose API keys in your code! 