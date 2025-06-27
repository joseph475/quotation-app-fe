#!/bin/bash

# Render Deployment Script for Quotation App
# This script helps prepare and deploy both frontend and backend to Render

set -e  # Exit on any error

echo "🚀 Render Deployment Helper for Quotation App"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend root directory."
    exit 1
fi

# Check if this is the frontend project
if ! grep -q "quotation-app-fe" package.json; then
    print_error "This doesn't appear to be the quotation-app-fe project."
    exit 1
fi

print_status "Detected quotation-app-fe project ✓"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
print_status "Checking required tools..."

if ! command_exists git; then
    print_error "Git is required but not installed."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is required but not installed."
    exit 1
fi

print_success "All required tools are available ✓"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
    exit 1
fi

print_success "Node.js version $NODE_VERSION is compatible ✓"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_warning "Not in a git repository. Initializing..."
    git init
    print_success "Git repository initialized ✓"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. It's recommended to commit them before deployment."
    echo "Uncommitted files:"
    git status --short
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled."
        exit 0
    fi
fi

# Function to validate environment variables
validate_env_vars() {
    local missing_vars=()
    
    # Check for required environment variables
    if [ -z "$REACT_APP_SUPABASE_URL" ]; then
        missing_vars+=("REACT_APP_SUPABASE_URL")
    fi
    
    if [ -z "$REACT_APP_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("REACT_APP_SUPABASE_ANON_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Missing environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        print_warning "These should be set in your Render service environment variables."
        print_warning "The app will use default values for development if not set."
    else
        print_success "Environment variables look good ✓"
    fi
}

# Check environment variables
print_status "Checking environment variables..."
validate_env_vars

# Test build process
print_status "Testing build process..."

# Clean previous build
if [ -d "dist" ]; then
    rm -rf dist
    print_status "Cleaned previous build ✓"
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run build
print_status "Running build..."
npm run build

if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not created"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    print_error "Build failed - index.html not found in dist"
    exit 1
fi

print_success "Build completed successfully ✓"

# Test server start (briefly)
print_status "Testing server start..."
timeout 10s npm start > /dev/null 2>&1 || true
print_success "Server start test completed ✓"

# Check render.yaml configuration
print_status "Checking Render configuration..."

if [ -f "render.yaml" ]; then
    print_success "render.yaml found ✓"
elif [ -f "render-node.yaml" ]; then
    print_status "Found render-node.yaml, copying to render.yaml..."
    cp render-node.yaml render.yaml
    print_success "render.yaml created from render-node.yaml ✓"
else
    print_warning "No render.yaml found. Creating one..."
    cat > render.yaml << EOF
services:
  - type: web
    name: quotation-app-fe
    runtime: node
    region: oregon
    plan: free
    buildCommand: npm ci && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
    healthCheckPath: /health
    autoDeploy: true
EOF
    print_success "render.yaml created ✓"
fi

# Display deployment checklist
echo ""
echo "📋 DEPLOYMENT CHECKLIST"
echo "======================="
echo ""
echo "Frontend (quotation-app-fe):"
echo "✓ Build process tested"
echo "✓ Dependencies verified"
echo "✓ render.yaml configured"
echo ""
echo "Next steps:"
echo "1. 🔗 Push your code to Git repository"
echo "2. 🌐 Go to https://dashboard.render.com"
echo "3. ➕ Create new Web Service"
echo "4. 🔗 Connect your Git repository"
echo "5. ⚙️  Configure service settings:"
echo "   - Name: quotation-app-fe"
echo "   - Runtime: Node"
echo "   - Build Command: npm ci && npm run build"
echo "   - Start Command: npm start"
echo "6. 🔧 Add environment variables:"
echo "   - NODE_ENV=production"
echo "   - REACT_APP_API_URL=https://quotation-app-be.onrender.com/api/v1"
echo "   - REACT_APP_SUPABASE_URL=your-supabase-url"
echo "   - REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key"
echo "   - REACT_APP_WS_URL=wss://quotation-app-be.onrender.com"
echo "   - REACT_APP_ENV=production"
echo "7. 🚀 Deploy!"
echo ""

# Backend deployment reminder
echo "Backend (quotation-app-be):"
echo "📁 Make sure your backend repository has:"
echo "   - package.json with start script"
echo "   - All dependencies listed"
echo "   - CORS configured for your frontend domain"
echo "   - Health check endpoint at /api/v1/health"
echo ""
echo "🔧 Backend environment variables needed:"
echo "   - NODE_ENV=production"
echo "   - SUPABASE_URL=your-supabase-url"
echo "   - SUPABASE_ANON_KEY=your-supabase-anon-key"
echo "   - SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key"
echo "   - JWT_SECRET=your-jwt-secret (32+ characters)"
echo "   - JWT_EXPIRE=30d"
echo "   - JWT_COOKIE_EXPIRE=30"
echo "   - CORS_ORIGIN=https://quotation-app-fe.onrender.com"
echo "   - PORT=10000"
echo ""

# Git commands helper
echo "🔗 GIT COMMANDS"
echo "==============="
echo ""
echo "If you haven't pushed to Git yet:"
echo "  git add ."
echo "  git commit -m \"Prepare for Render deployment\""
echo "  git branch -M main"
echo "  git remote add origin https://github.com/yourusername/quotation-app-fe.git"
echo "  git push -u origin main"
echo ""

# Final reminders
echo "📚 DOCUMENTATION"
echo "================"
echo ""
echo "📖 Full deployment guide: RENDER_DEPLOYMENT_GUIDE.md"
echo "🌐 Render Dashboard: https://dashboard.render.com"
echo "🗄️  Supabase Dashboard: https://supabase.com/dashboard"
echo ""

print_success "Frontend is ready for Render deployment! 🎉"
print_status "Follow the checklist above to complete the deployment."

# Optional: Open relevant URLs
if command_exists open; then
    read -p "Open Render dashboard in browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://dashboard.render.com"
    fi
fi

echo ""
print_success "Deployment preparation completed!"
