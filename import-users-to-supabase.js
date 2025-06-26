const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Your MongoDB users data
const mongoUsers = [
  {
    "_id": "6858d4960d871844c70d7e74",
    "name": "Regular User",
    "email": "user@example.com",
    "isActive": true,
    "role": "user",
    "createdAt": "2025-06-23T04:14:14.784Z",
    "__v": 0
  },
  {
    "_id": "6858d4960d871844c70d7e73",
    "name": "Admin User",
    "email": "admin@example.com",
    "isActive": true,
    "role": "admin",
    "createdAt": "2025-06-23T04:14:14.784Z",
    "__v": 0
  },
  {
    "_id": "6858d5cf6edd749f0e975090",
    "name": "delivery 1",
    "email": "delivery1@gmail.com",
    "phone": "41412415",
    "department": "No department",
    "isActive": true,
    "role": "delivery",
    "createdAt": "2025-06-23T04:19:27.174Z",
    "__v": 0
  },
  {
    "_id": "6858db9634670834fd6f861b",
    "name": "delivery 2",
    "email": "delivery2@gmail.com",
    "phone": "141414",
    "department": "No department",
    "isActive": true,
    "role": "delivery",
    "createdAt": "2025-06-23T04:44:06.964Z",
    "__v": 0
  },
  {
    "_id": "6858f6f2c743860e86604264",
    "name": "customer 2",
    "email": "customer2@gmail.com",
    "phone": "1414141",
    "department": "No department",
    "address": "burgos st cabanatuan manila",
    "isActive": true,
    "role": "user",
    "createdAt": "2025-06-23T06:40:50.311Z",
    "__v": 0
  },
  {
    "_id": "685921e7ac44fa4fb6c5e6d4",
    "name": "mjrc",
    "email": "asdads@gmail.com",
    "phone": "4151412",
    "department": "",
    "address": "sa tabi tabi",
    "isActive": true,
    "role": "user",
    "createdAt": "2025-06-23T09:44:07.057Z",
    "__v": 0
  },
  {
    "_id": "68592297ac44fa4fb6c5e6fb",
    "name": "superAdmin",
    "email": "superAdmin@gmail.com",
    "phone": "414141",
    "department": "No department",
    "address": "",
    "isActive": true,
    "role": "superadmin",
    "createdAt": "2025-06-23T09:47:03.948Z",
    "__v": 0
  }
];

// Load environment variables
require('dotenv').config({ path: '../quotation-app-be/.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importUsers() {
  console.log('🚀 Starting user import to Supabase...');
  console.log(`Found ${mongoUsers.length} users to import`);

  let successCount = 0;
  let errorCount = 0;

  for (const mongoUser of mongoUsers) {
    try {
      console.log(`\n📝 Processing: ${mongoUser.name} (${mongoUser.email})`);

      // Convert MongoDB user to Supabase format
      const supabaseUser = {
        name: mongoUser.name,
        email: mongoUser.email,
        phone: mongoUser.phone || null,
        department: mongoUser.department || null,
        address: mongoUser.address || null,
        is_active: mongoUser.isActive,
        role: mongoUser.role === 'user' ? 'customer' : mongoUser.role, // Convert 'user' to 'customer'
        password_hash: await bcrypt.hash('defaultpassword123', 10), // Default password
        created_at: mongoUser.createdAt,
        updated_at: mongoUser.createdAt
      };

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', supabaseUser.email)
        .single();

      if (existingUser) {
        console.log(`⚠️  User already exists: ${supabaseUser.email}`);
        continue;
      }

      // Insert user into Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([supabaseUser])
        .select()
        .single();

      if (error) {
        console.error(`❌ Error inserting ${supabaseUser.email}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Successfully imported: ${supabaseUser.email} (ID: ${data.id})`);
        successCount++;
      }

    } catch (err) {
      console.error(`💥 Unexpected error processing ${mongoUser.email}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Successfully imported: ${successCount} users`);
  console.log(`❌ Errors: ${errorCount} users`);
  console.log('\n🔑 Default Password: defaultpassword123');
  console.log('💡 Users should change their passwords after first login');

  if (successCount > 0) {
    console.log('\n🎉 User import completed successfully!');
    console.log('You can now test login with any of the imported users.');
  }
}

// Run the import
importUsers().catch(console.error);
