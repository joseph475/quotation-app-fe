#!/bin/bash

# Deployment script for Quotation App
echo "🚀 Starting deployment preparation for Quotation App..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the frontend directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build the project
echo "🔨 Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
    echo "📁 Build files are in the 'dist' directory"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# Check if backend exists
if [ -d "../quotation-app-be" ]; then
    echo "🔍 Backend directory found. Checking backend..."
    cd ../quotation-app-be
    
    if [ -f "package.json" ]; then
        echo "📦 Installing backend dependencies..."
        npm install
        
        if [ $? -eq 0 ]; then
            echo "✅ Backend dependencies installed successfully!"
        else
            echo "❌ Backend dependency installation failed!"
            exit 1
        fi
    else
        echo "❌ Backend package.json not found!"
        exit 1
    fi
    
    cd ../quotation-app-fe
else
    echo "⚠️  Backend directory not found at ../quotation-app-be"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Push both frontend and backend to separate Git repositories"
echo "2. Deploy backend to Render first"
echo "3. Update the API URL in src/services/api.js with your backend URL"
echo "4. Deploy frontend to Render"
echo "5. Set up MongoDB Atlas and configure environment variables"
echo ""
echo "📖 See RENDER_DEPLOYMENT_GUIDE.md for detailed instructions"
