# 🔑 How to Get Your Supabase Service Role Key

## The Problem
Your data migration is failing because the Service Role Key is still a placeholder. You need the **real** Service Role Key from Supabase.

## 📍 Where to Find It

### Step 1: Go to Your Supabase Dashboard
1. Open [supabase.com](https://supabase.com)
2. Login to your account
3. Select your project: **kijpjqvjlrfjgmmlsyzj**

### Step 2: Navigate to API Settings
1. Click **Settings** (⚙️ gear icon) in the left sidebar
2. Click **API** in the settings menu

### Step 3: Copy the Service Role Key
Look for the section called **Project API keys** and find:

**Service Role Key (Secret)**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpanBqcXZqbHJmamdtbWxzeXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyMjI0OCwiZXhwIjoyMDY2NDk4MjQ4fQ.REAL_SECRET_KEY_HERE
```

⚠️ **This is different from your Anon Key!** The Service Role Key:
- Is much longer
- Ends with a different signature
- Has `"role":"service_role"` in the JWT payload
- **Must be kept secret** (never expose in frontend)

### Step 4: Also Get the JWT Secret
In the same API settings page, scroll down to find:

**JWT Secret**
```
your-super-secret-jwt-token-with-at-least-32-characters-long
```

## 🔧 Update Your Backend .env File

Replace these lines in `../quotation-app-be/.env`:

```env
# Replace this placeholder:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpanBqcXZqbHJmamdtbWxzeXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyMjI0OCwiZXhwIjoyMDY2NDk4MjQ4fQ.example-service-role-key-replace-with-actual

# With the real key:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpanBqcXZqbHJmamdtbWxzeXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDkyMjI0OCwiZXhwIjoyMDY2NDk4MjQ4fQ.REAL_SECRET_KEY_FROM_SUPABASE

# And replace this:
JWT_SECRET=your-jwt-secret-from-supabase

# With the real JWT secret:
JWT_SECRET=your-actual-jwt-secret-from-supabase-dashboard
```

## 🚀 After Updating

1. **Save the .env file**
2. **Run the migration again**:
   ```bash
   ./migrate-to-supabase.sh
   ```

The "Invalid API key" errors will be resolved and your data will migrate successfully!

## 🔒 Security Note

**Keep these keys secret!**
- Never commit them to Git
- Never share them publicly
- The Service Role Key has full database access
- Only use it on your backend/server

---

**Need help finding the keys?** Check the visual guide in `SUPABASE_SETUP_GUIDE.md`
