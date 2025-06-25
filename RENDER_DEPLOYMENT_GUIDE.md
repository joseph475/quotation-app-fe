# Render Deployment Guide for Quotation App Frontend

This guide will help you deploy the Quotation App frontend to Render.

## Prerequisites

1. A Render account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Backend API deployed and accessible

## Deployment Steps

### 1. Connect Your Repository

1. Log in to your Render dashboard
2. Click "New +" and select "Static Site"
3. Connect your Git repository containing the frontend code
4. Select the repository and branch you want to deploy

### 2. Configure Build Settings

Render will automatically detect your project settings, but verify these configurations:

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment**: `Static Site`

**Note**: This project has webpack and webpack-cli in the main dependencies to ensure they're always available during the build process.

### 3. Environment Variables

Set the following environment variables in Render:

- `NODE_ENV`: `production`

### 4. Deploy

1. Click "Create Static Site"
2. Render will automatically build and deploy your application
3. You'll get a URL like `https://your-app-name.onrender.com`

## Using render.yaml (Alternative Method)

This project includes a `render.yaml` file for Infrastructure as Code deployment:

1. In your Render dashboard, go to "Blueprint"
2. Click "New Blueprint Instance"
3. Connect your repository
4. Render will automatically use the `render.yaml` configuration

## Post-Deployment Configuration

### Update API Endpoint

After deploying, update your API endpoint in `src/services/api.js`:

```javascript
const API_BASE_URL = 'https://your-backend-api.onrender.com/api';
```

### Custom Domain (Optional)

1. In your Render service dashboard, go to "Settings"
2. Scroll to "Custom Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## Automatic Deployments

Render automatically deploys when you push to your connected branch:

- Push to your main branch
- Render detects changes and rebuilds
- New version goes live automatically

## Build Optimization

For faster builds, consider:

1. Using npm ci instead of npm install in build command
2. Caching node_modules (Render does this automatically)
3. Optimizing your webpack configuration

## Troubleshooting

### Build Failures

**Common Issue: "CLI for webpack must be installed"**
- **Solution**: This project has been configured with webpack and webpack-cli in the main dependencies
- **Alternative**: If you encounter this issue, you can move webpack-cli from devDependencies to dependencies in package.json
- **Reason**: Render's default npm install doesn't include devDependencies

**Other Build Issues:**
1. Check build logs in Render dashboard
2. Ensure all dependencies are in package.json
3. Verify build command works locally
4. Make sure Node.js version is compatible

### Runtime Issues

1. Check browser console for errors
2. Verify API endpoints are correct
3. Check CORS settings on your backend

### Performance Issues

1. Enable gzip compression (Render does this automatically)
2. Optimize images and assets
3. Use CDN for large static files

## Environment-Specific Configurations

### Development
- Local webpack dev server
- Hot reloading enabled
- Source maps for debugging

### Production (Render)
- Minified and optimized build
- Static file serving
- Automatic HTTPS

## Monitoring and Logs

1. Access logs in Render dashboard
2. Set up monitoring for uptime
3. Configure notifications for deployment status

## Cost Considerations

- Static sites on Render are free for personal projects
- Paid plans offer more bandwidth and features
- Monitor usage in dashboard

## Security Best Practices

1. Use HTTPS (automatic on Render)
2. Keep dependencies updated
3. Don't commit sensitive data
4. Use environment variables for configuration

## Support

- Render Documentation: https://render.com/docs
- Community Forum: https://community.render.com
- Support: support@render.com

## Next Steps

1. Deploy your backend API to Render
2. Update API endpoints in frontend
3. Test the complete application
4. Set up custom domain if needed
5. Configure monitoring and alerts
