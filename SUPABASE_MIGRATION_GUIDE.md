# Supabase Migration Guide

## Overview
This guide will help you migrate from MongoDB/Mongoose to Supabase (PostgreSQL) while maintaining all your existing functionality.

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a database password and region
4. Wait for the project to be provisioned

### 1.2 Get Connection Details
From your Supabase dashboard:
- Go to Settings > Database
- Copy the connection string
- Note down your project URL and anon key from Settings > API

## Step 2: Database Schema Migration

### 2.1 Create Tables
Run the SQL scripts in the Supabase SQL Editor (found in `/supabase/migrations/` folder):

1. `001_create_users_table.sql`
2. `002_create_inventory_table.sql`
3. `003_create_quotations_table.sql`
4. `004_create_other_tables.sql`
5. `005_enable_rls_policies.sql`
6. `006_update_user_roles.sql`

### 2.2 Role Changes
**Important**: The default user role has been changed from 'user' to 'customer' for better separation of concerns. This affects:
- New user registrations will default to 'customer' role
- Existing users with 'user' role will be updated to 'customer' role
- Frontend and backend code updated to use 'customer' instead of 'user'

## Step 3: Backend Migration

### 3.1 Install Supabase Dependencies
```bash
cd ../quotation-app-be
npm install @supabase/supabase-js
npm uninstall mongoose
```

### 3.2 Update Configuration
- Replace `config/database.js` with `config/supabase.js`
- Update environment variables
- Replace Mongoose models with Supabase queries

### 3.3 Update Controllers
Replace Mongoose operations with Supabase operations in all controllers.

## Step 4: Frontend Updates

### 4.1 Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 4.2 Update API Service
Update `src/services/api.js` to use Supabase client for real-time features.

## Step 5: Data Migration

### 5.1 Export MongoDB Data
Use the provided migration scripts to export your existing data.

### 5.2 Import to Supabase
Use the import scripts to transfer data to Supabase.

## Step 6: Testing and Deployment

### 6.1 Test Locally
- Test all CRUD operations
- Verify authentication works
- Test real-time features

### 6.2 Update Environment Variables
Update your production environment variables to use Supabase.

## Benefits of Migration

1. **Real-time Features**: Built-in real-time subscriptions
2. **Authentication**: Built-in auth with social providers
3. **Storage**: File storage capabilities
4. **Edge Functions**: Serverless functions
5. **Dashboard**: Built-in admin dashboard
6. **Backup**: Automated backups
7. **Scaling**: Automatic scaling
8. **SQL**: Powerful SQL queries and joins

## Migration Checklist

- [ ] Create Supabase project
- [ ] Run database migrations
- [ ] Update backend dependencies
- [ ] Replace database configuration
- [ ] Update all models/controllers
- [ ] Update frontend API service
- [ ] Migrate existing data
- [ ] Test all functionality
- [ ] Update environment variables
- [ ] Deploy and verify

## Rollback Plan

Keep your MongoDB instance running during migration for easy rollback if needed.
