# Supabase Setup Guide - Getting Your Project URL and API Keys

## Step 1: Create a Supabase Account and Project

1. **Go to Supabase**: Visit [supabase.com](https://supabase.com)
2. **Sign Up/Login**: Create an account or login with GitHub/Google
3. **Create New Project**: Click "New Project" button
4. **Fill Project Details**:
   - **Organization**: Select or create an organization
   - **Project Name**: Give your project a name (e.g., "quotation-app")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to your users
   - **Pricing Plan**: Select Free tier to start
5. **Create Project**: Click "Create new project"
6. **Wait**: Project creation takes 1-2 minutes

## Step 2: Get Your Project URL and API Keys

Once your project is created, you'll be taken to the project dashboard.

### Getting Project URL
1. **Look at the browser URL**: Your project URL is in the format:
   ```
   https://your-project-id.supabase.co
   ```
   Example: `https://abcdefghijklmnop.supabase.co`

2. **Or find it in Settings**:
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** in the settings menu
   - Look for **Project URL**

### Getting API Keys
1. **Go to API Settings**:
   - Click **Settings** (gear icon) in the left sidebar
   - Click **API** in the settings menu

2. **You'll see three important keys**:

   **a) Anon Key (Public)**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjM2NzY4NCwiZXhwIjoxOTUxOTQzNjg0fQ.example
   ```
   - This is safe to use in your frontend
   - Used for client-side operations

   **b) Service Role Key (Secret)**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM2MzY3Njg0LCJleHAiOjE5NTE5NDM2ODR9.example
   ```
   - **Keep this secret!** Never expose in frontend
   - Used for backend/server operations
   - Has admin privileges

   **c) JWT Secret**
   ```
   your-super-secret-jwt-token-with-at-least-32-characters-long
   ```
   - Used for JWT token verification
   - Keep this secret too!

## Step 3: Copy Your Credentials

### For Frontend (.env file):
```env
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Backend (.env file):
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-jwt-secret-here
```

## Step 4: Database Password

You'll also need the database password you created during project setup for:
- Direct database connections (if needed)
- Database migrations
- Backup/restore operations

**Find it in**: Settings → Database → Connection string

## Visual Guide

```
Supabase Dashboard
├── Settings (⚙️)
│   ├── API
│   │   ├── Project URL ← Copy this
│   │   ├── API Keys
│   │   │   ├── anon (public) ← For frontend
│   │   │   ├── service_role ← For backend (secret!)
│   │   │   └── JWT Secret ← For backend (secret!)
│   │   └── Configuration
│   └── Database
│       └── Connection string (contains password)
```

## Security Notes

⚠️ **Important Security Tips**:

1. **Never commit secrets to Git**:
   - Add `.env` to your `.gitignore`
   - Use environment variables in production

2. **Service Role Key**:
   - Only use on your backend/server
   - Never expose in frontend code
   - Has full database access

3. **Anon Key**:
   - Safe to use in frontend
   - Respects Row Level Security (RLS) policies
   - Limited by your database policies

4. **Environment Variables**:
   - Use different keys for development/production
   - Rotate keys if compromised

## Troubleshooting

**Can't find API keys?**
- Make sure project creation is complete
- Refresh the page
- Check Settings → API

**Keys not working?**
- Verify you copied the complete key
- Check for extra spaces or line breaks
- Ensure you're using the right key for frontend vs backend

**Project URL format**:
- Should be: `https://your-project-id.supabase.co`
- No trailing slash
- Must include `https://`

## Next Steps

Once you have your credentials:
1. Update your `.env` files with the actual values
2. Run the migration script: `./migrate-to-supabase.sh`
3. Test the connection before proceeding with migration

---

**Need help?** Check the [Supabase documentation](https://docs.supabase.com) or ask in their [Discord community](https://discord.supabase.com).
