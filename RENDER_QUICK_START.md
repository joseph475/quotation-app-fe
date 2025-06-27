# Quick Start: Deploy to Render

This is a simplified guide to get your Quotation App deployed on Render quickly.

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- [Render account](https://render.com) (free)
- [Supabase account](https://supabase.com) (free)
- Git repositories for both frontend and backend

### 2. Run Deployment Helper
```bash
./deploy-to-render.sh
```

This script will:
- ✅ Test your build process
- ✅ Verify dependencies
- ✅ Create/update render.yaml
- ✅ Show deployment checklist

### 3. Deploy Backend First

1. **Create Render Service**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your backend repository

2. **Configure Service**:
   - Name: `quotation-app-be`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Add Environment Variables**:
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   JWT_SECRET=your-32-character-secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   CORS_ORIGIN=https://quotation-app-fe.onrender.com
   PORT=10000
   ```

4. **Deploy** and wait for completion

### 4. Deploy Frontend

1. **Create Render Service**:
   - Click "New +" → "Web Service"
   - Connect your frontend repository

2. **Configure Service**:
   - Name: `quotation-app-fe`
   - Runtime: `Node`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`

3. **Add Environment Variables**:
   ```
   NODE_ENV=production
   REACT_APP_API_URL=https://quotation-app-be.onrender.com/api/v1
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
   REACT_APP_WS_URL=wss://quotation-app-be.onrender.com
   REACT_APP_ENV=production
   ```

4. **Deploy** and wait for completion

### 5. Setup Supabase Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project
3. Go to SQL Editor
4. Run migration files in order:
   - `001_create_users_table.sql`
   - `002_create_inventory_table.sql`
   - `003_create_quotations_table.sql`
   - `004_create_other_tables.sql`
   - `005_enable_rls_policies.sql`
   - `006_update_user_roles.sql`

### 6. Test Your Deployment

- **Frontend**: `https://quotation-app-fe.onrender.com`
- **Backend Health**: `https://quotation-app-be.onrender.com/api/v1/health`

## 🔧 Environment Variables Needed

### Get Supabase Keys:
1. Go to Supabase project → Settings → API
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### Generate JWT Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📋 Deployment Checklist

### Backend ✅
- [ ] Repository pushed to Git
- [ ] Render service created
- [ ] Environment variables added
- [ ] Service deployed successfully
- [ ] Health check endpoint working

### Frontend ✅
- [ ] Repository pushed to Git
- [ ] Render service created
- [ ] Environment variables added
- [ ] Service deployed successfully
- [ ] App loads without errors

### Database ✅
- [ ] Supabase project created
- [ ] Migration scripts executed
- [ ] RLS policies enabled
- [ ] Test user can login

## 🆘 Common Issues

### Build Fails
- Check Node.js version (needs 18+)
- Verify all dependencies in package.json
- Check build logs in Render dashboard
- **Missing dotenv-webpack**: Ensure `dotenv-webpack` is in `dependencies`, not `devDependencies`

### CORS Errors
- Update backend CORS_ORIGIN to frontend URL
- Redeploy backend after CORS update

### Database Connection
- Verify Supabase URL and keys
- Check RLS policies are enabled
- Ensure migrations ran successfully

### App Won't Load
- Check browser console for errors
- Verify API URL in frontend env vars
- Test backend health endpoint

### Webpack Build Issues
```
Error: Cannot find module 'dotenv-webpack'
```
**Fix**: Move build dependencies to `dependencies` in package.json:
```json
{
  "dependencies": {
    "dotenv-webpack": "^8.1.0",
    "webpack": "^5.99.7",
    "webpack-cli": "^6.0.1"
  }
}
```

## 📚 Full Documentation

For detailed information, see:
- **Complete Guide**: `RENDER_DEPLOYMENT_GUIDE.md`
- **Deployment Script**: `./deploy-to-render.sh`

## 🎉 Success!

Once deployed, your app will be live at:
- **App**: `https://quotation-app-fe.onrender.com`
- **API**: `https://quotation-app-be.onrender.com/api/v1`

**Note**: Free tier services sleep after 15 minutes of inactivity. First request after sleep may take 30-60 seconds to wake up.
