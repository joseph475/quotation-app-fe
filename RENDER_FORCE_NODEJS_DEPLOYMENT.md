# Force Render to Use Node.js Deployment

## Current Problem
Render is still deploying the app as a static site instead of using the Node.js server, causing all SPA routes to return 404 when accessed directly or refreshed.

## Evidence
- `/login` returns 404 when accessed directly
- `/orders` returns 404 when refreshed
- `/health` endpoint returns 404 (Express server not running)
- Build logs show "Uploading build" instead of "Starting server"

## Solution: Manual Service Recreation

Since Render is not recognizing the configuration change from static to Node.js, you need to manually create a new Node.js service:

### Step 1: Delete Current Service
1. Go to your Render dashboard
2. Find the `quotation-app-fe` service
3. Go to Settings → Delete Service
4. Confirm deletion

### Step 2: Create New Node.js Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure as follows:
   - **Name**: `quotation-app-fe`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV` = `production`

### Step 3: Alternative - Use render-node.yaml
If you prefer using the YAML file:
1. Rename `render-node.yaml` to `render.yaml`
2. Push to GitHub
3. Create new service using the YAML configuration

## Quick Fix Alternative

If you don't want to recreate the service, try this:

### Option A: Force Node.js Detection
Add this to your `package.json` to make it clear this is a Node.js app:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Option B: Use Different Start Command
In Render dashboard, manually change:
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `node server.js`
- **Environment**: Change from "Static Site" to "Node"

## Verification
After deployment, test these URLs:
- `https://quotation-app-fe.onrender.com/health` (should return JSON)
- `https://quotation-app-fe.onrender.com/login` (should load the app)
- `https://quotation-app-fe.onrender.com/orders` (should load the app)

## Files Ready for Node.js Deployment
- ✅ `server.js` - Express server with SPA routing
- ✅ `package.json` - Updated with Express dependency and start script
- ✅ `render.yaml` - Node.js configuration
- ✅ Build process creates `dist/` folder with all assets

The Express server will handle all routes correctly and serve `index.html` for any non-static file requests.
