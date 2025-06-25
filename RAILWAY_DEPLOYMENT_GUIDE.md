# Railway Deployment Guide for Quotation App Frontend

## Overview
This guide will help you deploy your Quotation App frontend to Railway successfully.

## Prerequisites
- Railway account
- Backend API already deployed (e.g., on Railway or Vercel)
- Git repository connected to Railway

## Configuration Files

### 1. railway.toml
```toml
[build]
builder = "NIXPACKS"

[deploy]
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
variables = { NODE_ENV = "production" }
```

### 2. nixpacks.toml
```toml
[variables]
NODE_ENV = "production"
```
Note: Nixpacks will auto-detect Node.js and automatically run `npm install`, `npm run build`, and `npm start` based on your package.json.

### 3. package.json (start script)
```json
{
  "scripts": {
    "start": "npx http-server dist -p ${PORT:-8080} -a 0.0.0.0 --cors -c-1"
  }
}
```

## Environment Variables Setup

### Required Environment Variables in Railway Dashboard:
1. `NODE_ENV=production`
2. `REACT_APP_API_URL=https://your-backend-url.railway.app/api/v1`
3. `REACT_APP_CURRENCY_SYMBOL=₱`

### Optional Environment Variables:
- `REACT_APP_NAME=Quotation App`
- `REACT_APP_ENABLE_NOTIFICATIONS=true`
- `REACT_APP_ENABLE_PWA=true`

## Deployment Steps

### 1. Connect Repository
1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your frontend repository

### 2. Configure Environment Variables
1. Go to your project in Railway
2. Click on "Variables" tab
3. Add the required environment variables listed above

### 3. Deploy
1. Railway will automatically detect your configuration files
2. The build process will:
   - Install dependencies with `npm ci`
   - Build the app with `npm run build`
   - Start the server with `npm start`

### 4. Custom Domain (Optional)
1. Go to "Settings" tab in your Railway project
2. Click "Domains"
3. Add your custom domain or use the Railway-provided domain

## Troubleshooting

### Common Issues:

#### 1. "Railway API" Welcome Page
**Problem**: You see the Railway welcome page instead of your app
**Solution**: 
- Check that your build completed successfully
- Verify environment variables are set correctly
- Ensure your `dist` folder is being generated during build

#### 2. API Connection Issues
**Problem**: Frontend loads but can't connect to backend
**Solution**:
- Verify `REACT_APP_API_URL` is set correctly
- Check that your backend is deployed and accessible
- Ensure CORS is configured on your backend for your frontend domain

#### 3. Build Failures
**Problem**: Build fails during deployment
**Solution**:
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify webpack configuration is correct

#### 4. Static Files Not Loading
**Problem**: CSS, JS, or images not loading
**Solution**:
- Check that `publicPath: '/'` is set in webpack config
- Verify `CopyWebpackPlugin` is copying public files correctly
- Ensure http-server is serving from the correct directory

### Debugging Commands:
```bash
# Test build locally
npm run build

# Test server locally
npm start

# Check if files are in dist folder
ls -la dist/
```

## Performance Optimization

### 1. Bundle Size
- Current bundle is ~659KB (large)
- Consider code splitting with dynamic imports
- Use webpack-bundle-analyzer to identify large dependencies

### 2. Caching
- http-server serves with cache headers
- Consider adding service worker for better caching

### 3. Compression
- Railway automatically handles gzip compression
- Consider pre-compressing assets for better performance

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to git
- Use Railway's environment variables for sensitive data
- Prefix client-side variables with `REACT_APP_`

### 2. API Security
- Ensure backend has proper CORS configuration
- Use HTTPS for all API communications
- Implement proper authentication tokens

## Monitoring

### 1. Railway Logs
- Check deployment logs in Railway dashboard
- Monitor application logs for errors
- Set up log alerts for critical issues

### 2. Application Monitoring
- Consider adding error tracking (Sentry)
- Monitor API response times
- Track user interactions and errors

## Next Steps

1. Deploy your app following the steps above
2. Test all functionality in production
3. Set up monitoring and alerts
4. Configure custom domain if needed
5. Optimize performance based on usage patterns

## Support

If you encounter issues:
1. Check Railway documentation
2. Review build and application logs
3. Verify all configuration files are correct
4. Test locally to isolate deployment-specific issues
