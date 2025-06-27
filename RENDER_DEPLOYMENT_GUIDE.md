# Render Deployment Guide for Quotation App

This comprehensive guide covers deploying both the frontend and backend of the Quotation App to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Supabase Account**: Set up a Supabase project for production database
3. **Git Repositories**: Both frontend and backend should be in separate Git repositories
4. **GitHub/GitLab Account**: Render integrates with Git providers

## Backend Deployment (quotation-app-be)

### 1. Prepare Backend Repository

Ensure your backend repository has:
- `package.json` with proper start script
- All dependencies listed
- Environment variable configuration
- Proper CORS setup for your frontend domain

### 2. Create Backend Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your backend Git repository
4. Configure the service:
   - **Name**: `quotation-app-be`
   - **Region**: Choose closest to your users (e.g., Oregon, Singapore)
   - **Branch**: `main` or `master`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` or `node server.js`
   - **Plan**: Start with Free tier

### 3. Backend Environment Variables

Set these environment variables in Render dashboard:

```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
CORS_ORIGIN=https://your-frontend-name.onrender.com
PORT=10000
```

### 4. Backend render.yaml (Optional)

Create `render.yaml` in your backend repository:

```yaml
services:
  - type: web
    name: quotation-app-be
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /api/v1/health
    autoDeploy: true
```

## Frontend Deployment (quotation-app-fe)

### 1. Update Frontend Configuration

Your frontend is already configured to use the correct backend URL in production:
- Production API URL: `https://quotation-app-be.onrender.com/api/v1`
- This is set in `src/services/api.js`

### 2. Create Frontend Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your frontend Git repository
4. Configure the service:
   - **Name**: `quotation-app-fe`
   - **Region**: Same as backend (e.g., Oregon)
   - **Branch**: `main` or `master`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Start with Free tier

### 3. Frontend Environment Variables

Set these environment variables in Render dashboard:

```
NODE_ENV=production
REACT_APP_API_URL=https://quotation-app-be.onrender.com/api/v1
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_WS_URL=wss://quotation-app-be.onrender.com
REACT_APP_ENV=production
```

### 4. Frontend render.yaml (Already exists)

Your project already has `render-node.yaml` which can be renamed to `render.yaml`:

```yaml
services:
  - type: web
    name: quotation-app-fe
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
    healthCheckPath: /health
    autoDeploy: true
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Wait for the project to be ready
4. Go to Settings → API to get your keys

### 2. Database Setup

Run your migration scripts in the Supabase SQL Editor:

1. Go to SQL Editor in Supabase Dashboard
2. Run the migration files in order:
   - `supabase/migrations/001_create_users_table.sql`
   - `supabase/migrations/002_create_inventory_table.sql`
   - `supabase/migrations/003_create_quotations_table.sql`
   - `supabase/migrations/004_create_other_tables.sql`
   - `supabase/migrations/005_enable_rls_policies.sql`
   - `supabase/migrations/006_update_user_roles.sql`

### 3. Supabase Environment Variables

Get these from your Supabase project settings:

- **SUPABASE_URL**: Found in Settings → API → Project URL
- **SUPABASE_ANON_KEY**: Found in Settings → API → Project API keys → anon public
- **SUPABASE_SERVICE_ROLE_KEY**: Found in Settings → API → Project API keys → service_role (secret)

## Deployment Steps

### Step 1: Deploy Backend First

1. Push your backend code to Git repository
2. Create backend service on Render
3. Add environment variables
4. Deploy and wait for completion
5. Test backend health check: `https://your-backend-name.onrender.com/api/v1/health`

### Step 2: Deploy Frontend

1. Update frontend API URL if needed (should already be correct)
2. Push your frontend code to Git repository
3. Create frontend service on Render
4. Add environment variables
5. Deploy and wait for completion
6. Test frontend: `https://your-frontend-name.onrender.com`

## Post-Deployment Configuration

### 1. Update CORS in Backend

Ensure your backend CORS configuration includes your frontend domain:

```javascript
// In your backend server.js or app.js
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://your-frontend-name.onrender.com'
  ],
  credentials: true
};
```

### 2. Update Frontend API URL

If your backend URL is different, update the production URL in `src/services/api.js`:

```javascript
if (process.env.NODE_ENV === 'production') {
  return 'https://your-actual-backend-name.onrender.com/api/v1';
}
```

### 3. Test the Application

1. Visit your deployed frontend URL
2. Try logging in with test credentials
3. Test creating quotations, managing inventory, etc.
4. Check browser console for any errors
5. Monitor Render logs for any backend issues

## Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-super-secure-secret` |
| `JWT_EXPIRE` | JWT expiration time | `30d` |
| `JWT_COOKIE_EXPIRE` | Cookie expiration (days) | `30` |
| `CORS_ORIGIN` | Frontend domain for CORS | `https://your-fe.onrender.com` |
| `PORT` | Server port | `10000` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `REACT_APP_API_URL` | Backend API URL | `https://your-be.onrender.com/api/v1` |
| `REACT_APP_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `REACT_APP_WS_URL` | WebSocket URL | `wss://your-be.onrender.com` |
| `REACT_APP_ENV` | App environment | `production` |

## Render-Specific Considerations

### 1. Free Tier Limitations

- **Sleep Mode**: Free services sleep after 15 minutes of inactivity
- **Build Time**: 15-minute build timeout
- **Bandwidth**: 100GB/month
- **Build Minutes**: 500 minutes/month

### 2. Custom Domains (Paid Plans)

1. Go to your service settings
2. Add custom domain
3. Configure DNS records as instructed
4. SSL certificates are automatically provided

### 3. Monitoring and Logs

- **Logs**: Available in service dashboard
- **Metrics**: CPU, memory, and request metrics
- **Alerts**: Set up notifications for service issues

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **CORS Errors**
   - Update backend CORS configuration
   - Ensure frontend domain is whitelisted
   - Check environment variables

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check Supabase project status
   - Ensure RLS policies are correctly set

4. **Service Won't Start**
   - Check start command in service settings
   - Verify `package.json` scripts
   - Review service logs for errors

### Debugging Steps

1. **Check Service Logs**
   - Go to service dashboard
   - Click on "Logs" tab
   - Look for error messages

2. **Test API Endpoints**
   - Use browser or Postman
   - Test health check endpoint first
   - Verify authentication endpoints

3. **Monitor Performance**
   - Check service metrics
   - Monitor response times
   - Watch for memory/CPU issues

### Build-Specific Issues

1. **Missing Dependencies Error**
   ```
   Error: Cannot find module 'dotenv-webpack'
   ```
   **Solution**: Ensure all build dependencies are in `dependencies`, not `devDependencies`:
   ```json
   {
     "dependencies": {
       "dotenv-webpack": "^8.1.0",
       "webpack": "^5.99.7",
       "webpack-cli": "^6.0.1"
     }
   }
   ```

2. **Webpack Configuration Issues**
   - Verify webpack.config.js is in project root
   - Check all webpack plugins are installed as dependencies
   - Ensure babel configuration is correct

3. **Environment Variables Not Loading**
   - Check if .env file exists (optional for production)
   - Verify environment variables are set in Render dashboard
   - Use `systemvars: true` in dotenv-webpack config

## Security Best Practices

1. **Environment Variables**
   - Never commit secrets to Git
   - Use strong, unique secrets for production
   - Rotate secrets regularly

2. **Database Security**
   - Enable Row Level Security (RLS) in Supabase
   - Use service role key only in backend
   - Limit database access by IP if possible

3. **HTTPS**
   - Render automatically provides HTTPS
   - Ensure all API calls use HTTPS
   - Set secure cookie flags

4. **CORS Configuration**
   - Restrict origins to your domains only
   - Don't use wildcard (*) in production
   - Enable credentials only when needed

## Monitoring and Maintenance

### 1. Health Checks

Both services have health check endpoints:
- Backend: `/api/v1/health`
- Frontend: `/health`

### 2. Uptime Monitoring

Consider using external monitoring services:
- UptimeRobot
- Pingdom
- StatusCake

### 3. Error Tracking

Integrate error tracking services:
- Sentry
- LogRocket
- Bugsnag

### 4. Performance Monitoring

Monitor application performance:
- Render built-in metrics
- Google Analytics
- Custom logging

## Backup Strategy

1. **Database Backups**
   - Supabase provides automatic backups
   - Export data regularly for additional safety
   - Test restore procedures

2. **Code Backups**
   - Git repositories serve as code backup
   - Tag releases for easy rollback
   - Maintain development/staging environments

3. **Environment Variables**
   - Keep secure backup of all environment variables
   - Document all configuration settings
   - Use infrastructure as code when possible

## Scaling Considerations

### 1. Horizontal Scaling

- Render supports horizontal scaling on paid plans
- Consider load balancing for high traffic
- Use CDN for static assets

### 2. Database Scaling

- Supabase handles database scaling
- Monitor database performance
- Optimize queries and indexes

### 3. Caching

- Implement Redis for session storage
- Use browser caching for static assets
- Consider API response caching

## Support and Resources

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Render Community**: [community.render.com](https://community.render.com)
- **Support**: Available through Render dashboard

## Quick Deployment Checklist

### Backend Deployment
- [ ] Backend repository ready with all dependencies
- [ ] Supabase project created and configured
- [ ] Environment variables prepared
- [ ] Render backend service created
- [ ] Environment variables added to Render
- [ ] Backend deployed and health check passing

### Frontend Deployment
- [ ] Frontend API URL updated for production
- [ ] Frontend repository ready
- [ ] Render frontend service created
- [ ] Environment variables added to Render
- [ ] Frontend deployed and accessible
- [ ] CORS configured in backend for frontend domain

### Post-Deployment
- [ ] Full application testing completed
- [ ] Database migrations run in Supabase
- [ ] Error monitoring set up
- [ ] Performance monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation updated with live URLs

## Live URLs

After deployment, your application will be available at:
- **Frontend**: `https://quotation-app-fe.onrender.com`
- **Backend**: `https://quotation-app-be.onrender.com`
- **API Health Check**: `https://quotation-app-be.onrender.com/api/v1/health`

Remember to update these URLs in your documentation and any external integrations.
