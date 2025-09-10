# Trade Machine Deployment Guide

## Recommended Deployment Strategy

### Frontend (Vercel) + Backend (Railway)

This hybrid approach gives you the best of both worlds:
- **Frontend**: Fast, global CDN with Vercel
- **Backend**: Persistent services with Railway

## Deployment Steps

### 1. Backend Deployment (Railway)

#### Prerequisites
- Railway account (free tier available)
- MongoDB and Redis databases (Railway add-ons)

#### Steps:
1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   ```

2. **Add Database Services**
   - Add MongoDB add-on
   - Add Redis add-on
   - Note the connection URLs

3. **Set Environment Variables**
   ```bash
   railway variables set MONGODB_URL="your-mongodb-url"
   railway variables set REDIS_URL="your-redis-url"
   railway variables set JWT_SECRET_KEY="your-secret-key"
   railway variables set GOOGLE_CLIENT_ID="your-google-client-id"
   railway variables set GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Enable Serverless Mode** (Required for free tier)
   - Go to Railway dashboard
   - Navigate to your service
   - Go to Settings > Deploy > Serverless
   - Enable "Serverless" toggle

### 2. Frontend Deployment (Vercel)

#### Steps:
1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` folder as root directory

2. **Update Configuration**
   - Update `vercel.json` with your Railway backend URL:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://your-backend.railway.app/api/$1"
       }
     ]
   }
   ```

3. **Set Environment Variables**
   ```bash
   VITE_API_URL=https://your-backend.railway.app
   ```

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch

### 3. Update CORS Configuration

After getting your Vercel domain, update the CORS origins in `backend/main.py`:

```python
allow_origins=[
    "http://localhost:3000", 
    "http://localhost:5173", 
    "http://localhost:5174",
    "https://your-actual-domain.vercel.app",  # Replace with actual domain
    "https://*.vercel.app"
],
```

## Alternative Deployment Options

### Option 1: Full Railway Deployment
- Deploy both frontend and backend on Railway
- Use Railway's static site hosting for frontend
- Pros: Single platform, easier management
- Cons: Less optimized for static sites

### Option 2: Render (Alternative to Railway)
- Similar to Railway but with different pricing
- Good free tier with persistent services
- WebSocket support

### Option 3: Fly.io
- Excellent for real-time applications
- Global deployment
- Good free tier

## Important Considerations

### Free Tier Limitations

#### Railway Free Tier:
- ✅ Serverless mode (scales to zero)
- ⚠️ Cold starts (10-30 seconds)
- ✅ Persistent databases
- ✅ WebSocket support

#### Vercel Free Tier:
- ✅ Excellent for static sites
- ✅ Global CDN
- ❌ 10-second function timeout
- ❌ No persistent connections

### Trading Application Specifics

Your application has special requirements:
- **Real-time data**: WebSockets for live trading data
- **Long-running processes**: Trading bots that run continuously
- **Heavy computations**: Technical analysis with pandas/numpy
- **Database persistence**: User data, trading history

**Recommendation**: Railway is better suited for your backend due to:
- WebSocket support
- No execution time limits
- Persistent database connections
- Better for long-running processes

## Cost Optimization

### Free Tier Usage:
- Railway: $5 credit monthly (usually enough for small apps)
- Vercel: 100GB bandwidth, 1000 build minutes

### Scaling Considerations:
- Monitor usage in Railway dashboard
- Set up usage alerts
- Consider upgrading when you hit limits

## Monitoring and Maintenance

1. **Health Checks**: Your app has `/health` endpoint
2. **Logs**: Available in Railway and Vercel dashboards
3. **Database**: Monitor MongoDB and Redis usage
4. **Performance**: Watch for cold start times

## Troubleshooting

### Common Issues:

1. **Cold Starts**: Normal on free tier, consider upgrading for production
2. **CORS Errors**: Update origins in main.py
3. **Database Connection**: Check environment variables
4. **WebSocket Issues**: Ensure Railway service supports WebSockets

### Support:
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
