# Complete Deployment Troubleshooting Guide

This guide addresses common issues when deploying both frontend and backend of the Quotation App to Render.

## Quick Checklist

### Frontend Issues:
- [ ] Build completes successfully locally
- [ ] All dependencies are in package.json
- [ ] API endpoints point to correct backend URL
- [ ] Environment variables are set correctly
- [ ] Static files are being served

### Backend Issues:
- [ ] Server starts without errors
- [ ] Database connection is established
- [ ] Environment variables are configured
- [ ] CORS is properly configured
- [ ] API endpoints respond correctly

## Common Issues and Solutions

### 1. Build Failures

**Problem**: Frontend build fails on Render
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```

**Solutions**:
1. **Check Node.js version compatibility**
2. **Verify all dependencies are in package.json**
3. **Test build locally first**

### 2. Render Configuration

**render.yaml for Frontend**:
```yaml
services:
  - type: web
    name: quotation-app-fe
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: NODE_ENV
        value: production
```

**render.yaml for Backend**:
```yaml
services:
  - type: web
    name: quotation-app-be
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
```

## Render Environment Variables Setup

### Backend Environment Variables:
Set these in your Render backend service:
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quotation_app
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-name.onrender.com
```

### Frontend Environment Variables:
Set these in your Render frontend service:
```
NODE_ENV=production
REACT_APP_API_URL=https://your-backend-name.onrender.com/api/v1
REACT_APP_CURRENCY_SYMBOL=₱
```

## Database Connection Issues

### MongoDB Atlas Setup:
1. **Create MongoDB Atlas account**
2. **Create a new cluster**
3. **Create database user**
4. **Whitelist IP addresses**
   - Add `0.0.0.0/0` for Render services
5. **Get connection string**

### Common Database Issues:
- [ ] Connection string is correct
- [ ] Database user has proper permissions
- [ ] Network access is configured (0.0.0.0/0 for Render)
- [ ] Database name exists

## Deployment Checklist

### Pre-deployment:
- [ ] Code is pushed to Git repository
- [ ] Environment variables are documented
- [ ] Build works locally
- [ ] Database is set up and accessible

### Render Deployment:
- [ ] Services are created on Render
- [ ] Environment variables are set in Render dashboard
- [ ] Backend builds and starts successfully
- [ ] Static files are served correctly
- [ ] Frontend connects to backend API

### Post-deployment:
- [ ] App loads without errors
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Authentication functions properly

## Testing Your Deployment

### Backend Health Check:
```bash
# Test if backend is responding
curl https://your-backend-name.onrender.com/api/v1/health

# Test database connection (if you have a health endpoint)
curl https://your-backend-name.onrender.com/api/v1/dashboard/summary
```

### Frontend Testing:
1. **Load the application**
2. **Test user authentication**
3. **Verify API calls work**
4. **Check console for errors**

## Common Error Messages

### "Cannot connect to database"
- **Check**: MongoDB connection string
- **Check**: Database user credentials are correct
- **Check**: Network access allows Render IPs (use 0.0.0.0/0)
- **Check**: Database name matches in connection string

### "CORS Error"
```javascript
// Backend: Update CORS configuration
app.use(cors({
  origin: ['https://your-frontend-name.onrender.com', 'http://localhost:3001'],
  credentials: true
}));
```

### "API endpoint not found"
- **Check**: Backend routes are properly defined
- **Check**: Frontend API URLs are correct
- **Check**: Backend is running and accessible

## Security Considerations

### Production Security:
1. **Use strong JWT secrets**
2. **Use principle of least privilege** for database permissions
3. **Enable MongoDB Atlas IP whitelist** (or use 0.0.0.0/0 for Render)
4. **Regular backup** your database
5. **Keep dependencies updated**

### Render Security:
1. **Use environment variables** for sensitive data
2. **Enable HTTPS** (automatic on Render)
3. **Monitor deployment logs**
4. **Set up proper CORS policies**

## Monitoring and Maintenance

### Render Monitoring:
1. Check deployment logs regularly
2. Monitor service health
3. Set up notifications for failures
4. Review performance metrics

### Database Monitoring:
1. Monitor connection counts
2. Check query performance
3. Set up alerts for issues
4. Regular backups

## Getting Help

### Documentation:
- Render Documentation: https://render.com/docs
- MongoDB Atlas Documentation: https://docs.atlas.mongodb.com/

### Support Channels:
- Render Community: https://community.render.com
- Render Support: support@render.com

## Emergency Procedures

### If deployment fails:
1. **Check build logs** in Render dashboard
2. **Rollback code changes** using git
3. **Check Render service history** and rollback if needed
4. **Verify database state** and restore if necessary

### If app is down:
1. **Check service status** in Render dashboard
2. **Review recent deployments**
3. **Check database connectivity**
4. **Review error logs**
5. **Contact support** if needed

## Performance Optimization

### Frontend Optimization:
- Minimize bundle size
- Optimize images
- Use CDN for static assets
- Enable compression (automatic on Render)

### Backend Optimization:
- Database indexing
- Query optimization
- Caching strategies
- Connection pooling

## Cost Management

### Render Pricing:
- Static sites: Free tier available
- Web services: Paid plans based on usage
- Monitor usage in dashboard
- Set up billing alerts

### MongoDB Atlas:
- Free tier: M0 cluster
- Paid tiers for production
- Monitor data usage
- Optimize queries to reduce costs
