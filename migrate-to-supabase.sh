#!/bin/bash

# Supabase Migration Script
# This script helps you migrate from MongoDB to Supabase step by step

set -e

echo "🚀 Supabase Migration Script"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_step "1" "Checking dependencies"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Dependencies check passed"
    echo ""
}

# Install Supabase dependencies
install_dependencies() {
    print_step "2" "Installing Supabase dependencies"
    
    echo "Installing backend dependencies..."
    cd ../quotation-app-be
    npm install @supabase/supabase-js
    cd ../quotation-app-fe
    
    echo "Installing frontend dependencies..."
    npm install @supabase/supabase-js
    
    print_success "Dependencies installed"
    echo ""
}

# Setup environment variables
setup_env() {
    print_step "3" "Setting up environment variables"
    
    echo "Setting up backend environment..."
    if [ ! -f "../quotation-app-be/.env" ]; then
        cp ../quotation-app-be/.env.supabase.example ../quotation-app-be/.env
        print_warning "Created backend .env file from template. Please update with your Supabase credentials."
    else
        print_warning "Backend .env file already exists. Please add Supabase variables manually."
    fi
    
    echo "Setting up frontend environment..."
    if [ ! -f ".env" ]; then
        cp .env.supabase.example .env
        print_warning "Created frontend .env file from template. Please update with your Supabase credentials."
    else
        print_warning "Frontend .env file already exists. Please add Supabase variables manually."
    fi
    
    print_success "Environment files created"
    echo ""
}

# Backup MongoDB data
backup_data() {
    print_step "4" "Backing up MongoDB data"
    
    echo "Exporting MongoDB data..."
    cd ../quotation-app-be
    node data-migration.js export
    
    if [ -f "mongodb-export.json" ]; then
        print_success "MongoDB data exported to ../quotation-app-be/mongodb-export.json"
        # Copy to frontend directory for easy access
        cp mongodb-export.json ../quotation-app-fe/supabase/
        print_success "Backup also copied to supabase/mongodb-export.json"
    else
        print_error "Failed to export MongoDB data"
        cd ../quotation-app-fe
        exit 1
    fi
    
    cd ../quotation-app-fe
    echo ""
}

# Run database migrations
run_migrations() {
    print_step "5" "Running database migrations"
    
    print_warning "Please run the following SQL scripts in your Supabase SQL Editor:"
    echo "1. supabase/migrations/001_create_users_table.sql"
    echo "2. supabase/migrations/002_create_inventory_table.sql"
    echo "3. supabase/migrations/003_create_quotations_table.sql"
    echo "4. supabase/migrations/004_create_other_tables.sql"
    echo "5. supabase/migrations/005_enable_rls_policies.sql"
    echo "6. supabase/migrations/006_update_user_roles.sql"
    echo ""
    print_warning "Important: Role changes have been made!"
    echo "- Default user role changed from 'user' to 'customer'"
    echo "- Existing 'user' roles will be updated to 'customer'"
    echo "- This provides better separation between customers and staff"
    echo ""
    
    read -p "Have you run all the SQL migrations in Supabase? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please run the SQL migrations first, then run this script again."
        exit 1
    fi
    
    print_success "Database migrations completed"
    echo ""
}

# Migrate data
migrate_data() {
    print_step "6" "Migrating data to Supabase"
    
    echo "Starting data migration..."
    cd ../quotation-app-be
    node data-migration.js migrate
    cd ../quotation-app-fe
    
    print_success "Data migration completed"
    echo ""
}

# Update backend configuration
update_backend() {
    print_step "7" "Updating backend configuration"
    
    print_warning "Manual steps required:"
    echo "1. Update ../quotation-app-be/server.js to use Supabase instead of MongoDB"
    echo "2. Replace database connection with: const { testConnection } = require('./config/supabase');"
    echo "3. Update controllers to use Supabase (see users-supabase.js example)"
    echo "4. Test your API endpoints"
    echo ""
    
    read -p "Have you updated the backend configuration? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_success "Backend configuration updated"
    else
        print_warning "Please update backend configuration manually"
    fi
    echo ""
}

# Update frontend configuration
update_frontend() {
    print_step "8" "Updating frontend configuration"
    
    print_warning "Manual steps required:"
    echo "1. Update src/services/api.js to use Supabase client"
    echo "2. Replace API calls with Supabase queries"
    echo "3. Update authentication to use Supabase Auth"
    echo "4. Test your frontend functionality"
    echo ""
    
    read -p "Have you updated the frontend configuration? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_success "Frontend configuration updated"
    else
        print_warning "Please update frontend configuration manually"
    fi
    echo ""
}

# Test the migration
test_migration() {
    print_step "9" "Testing the migration"
    
    echo "Starting backend server for testing..."
    cd ../quotation-app-be
    npm start &
    BACKEND_PID=$!
    cd ../quotation-app-fe
    
    echo "Starting frontend server for testing..."
    npm start &
    FRONTEND_PID=$!
    
    echo ""
    print_warning "Test your application thoroughly:"
    echo "1. Login functionality"
    echo "2. CRUD operations (Create, Read, Update, Delete)"
    echo "3. Real-time features"
    echo "4. All existing functionality"
    echo ""
    
    read -p "Press any key to stop test servers..." -n 1 -r
    echo ""
    
    # Kill the background processes
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    
    print_success "Test servers stopped"
    echo ""
}

# Cleanup
cleanup() {
    print_step "10" "Cleanup and final steps"
    
    echo "Migration completed! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Update your production environment variables"
    echo "2. Deploy your updated application"
    echo "3. Monitor for any issues"
    echo "4. Once stable, you can remove MongoDB dependencies"
    echo ""
    
    print_success "Migration script completed successfully!"
}

# Main execution
main() {
    echo "This script will help you migrate from MongoDB to Supabase."
    echo "Make sure you have:"
    echo "1. Created a Supabase project"
    echo "2. Have your Supabase URL and keys ready"
    echo "3. Backed up your current data"
    echo ""
    
    read -p "Are you ready to proceed? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled."
        exit 0
    fi
    
    check_dependencies
    install_dependencies
    setup_env
    backup_data
    run_migrations
    migrate_data
    update_backend
    update_frontend
    test_migration
    cleanup
}

# Run the main function
main "$@"
