# Deployment Guide for Quotation App

This guide covers deploying both the frontend and backend of the Quotation App to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Atlas**: Set up a MongoDB Atlas cluster for production database
3. **Git Repository**: Both frontend and backend should be in separate Git repositories

## Backend Deployment (quotation-app-be)

### 1. Prepare Backend for Deployment

The backend is already configured with:
- `vercel.json` configuration file
- Express.js server setup
- MongoDB connection
- All API routes

### 2. Environment Variables for Backend

Set these environment variables in Vercel dashboard for the backend:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quotation-app
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
```

### 3. Deploy Backend

1. Push your backend code to a Git repository
2. Go to Vercel dashboard
3. Click "New Project"
4. Import your backend repository
5. Vercel will automatically detect the Node.js project
6. Add the environment variables in the "Environment Variables" section
7. Deploy

Your backend will be available at: `https://your-backend-name.vercel.app`

## Frontend Deployment (quotation-app-fe)

### 1. Update API URL

The frontend is already configured to use:
- Development: `http://localhost:8000/api/v1`
- Production: `https://quotation-app-be.vercel.app/api/v1`

Update the production URL in `src/services/api.js` to match your deployed backend URL.

### 2. Deploy Frontend

1. Push your frontend code to a Git repository
2. Go to Vercel dashboard
3. Click "New Project"
4. Import your frontend repository
5. Vercel will automatically detect the build configuration from `vercel.json`
6. Deploy

Your frontend will be available at: `https://your-frontend-name.vercel.app`

## MongoDB Atlas Setup

### 1. Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (free tier is sufficient for testing)
3. Create a database user
4. Whitelist IP addresses (use 0.0.0.0/0 for all IPs or specific Vercel IPs)
5. Get your connection string

### 2. Connection String Format

```
mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority
```

## Post-Deployment Steps

### 1. Test the Application

1. Visit your deployed frontend URL
2. Try logging in with test credentials
3. Test creating quotations, managing inventory, etc.
4. Check browser console for any errors

### 2. Seed Database (Optional)

If you need to populate your database with initial data:

1. Update the seeder script in the backend to work with production database
2. Run the seeder locally pointing to your Atlas database
3. Or create an API endpoint to seed data

### 3. Custom Domain (Optional)

1. In Vercel dashboard, go to your project settings
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

## Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRE` | JWT expiration time | `30d` |
| `JWT_COOKIE_EXPIRE` | Cookie expiration (days) | `30` |

### Frontend Environment Variables

The frontend automatically uses the correct API URL based on `NODE_ENV`. No additional environment variables are required.

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend has proper CORS configuration
2. **Database Connection**: Verify MongoDB Atlas connection string and IP whitelist
3. **API Endpoints**: Check that all API routes are working correctly
4. **Build Errors**: Ensure all dependencies are properly installed

### Debugging

1. Check Vercel function logs in the dashboard
2. Use browser developer tools to inspect network requests
3. Check MongoDB Atlas logs for database connection issues

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **JWT Secret**: Use a strong, unique secret for production
3. **Database Access**: Restrict MongoDB Atlas IP access when possible
4. **HTTPS**: Vercel automatically provides HTTPS for all deployments

## Monitoring

1. **Vercel Analytics**: Enable analytics in Vercel dashboard
2. **MongoDB Atlas Monitoring**: Monitor database performance
3. **Error Tracking**: Consider integrating error tracking services

## Backup Strategy

1. **Database Backups**: MongoDB Atlas provides automatic backups
2. **Code Backups**: Ensure code is backed up in Git repositories
3. **Environment Variables**: Keep a secure backup of environment variables

## Support

For deployment issues:
1. Check Vercel documentation
2. Review MongoDB Atlas documentation
3. Check application logs in Vercel dashboard
