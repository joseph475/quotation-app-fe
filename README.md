# Quotation App Frontend

Frontend application for the Quotation App with MongoDB backend integration.

## Overview

This is a React-based frontend application for managing quotations, sales, inventory, and customers. It connects to a MongoDB backend for data storage and retrieval.

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB backend server (see backend setup instructions)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Running the Application

#### Development Mode

```bash
npm run dev
```

This will start the development server, typically on port 3000.

#### Production Build

```bash
npm run build
```

This will create a production build in the `dist` directory.

### Connecting to the MongoDB Backend

The application is configured to connect to the MongoDB backend API at `http://localhost:8000/api/v1` in development mode. This can be modified in `src/services/api.js` if needed.

To ensure proper connection:

1. Make sure the backend server is running (see backend README for instructions)
2. The backend server should be running on port 8000 (default)
3. MongoDB should be properly set up and running

## Backend Setup

The backend code is located in the `../quotation-app-be` directory. Follow these steps to set up the backend:

1. Navigate to the backend directory:
   ```bash
   cd ../quotation-app-be
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables by creating a `.env` file with the following content:
   ```
   NODE_ENV=development
   PORT=8000
   MONGODB_URI=mongodb://localhost:27017/quotation-app
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   ```

4. Check if MongoDB is properly connected:
   ```bash
   npm run check-db
   ```
   This will verify your MongoDB connection and provide troubleshooting tips if needed.

5. Start the backend server (with MongoDB connection check):
   ```bash
   npm run start-safe
   ```
   This will first verify the MongoDB connection and then start the server only if the connection is successful.

6. (Optional) Seed the database with sample data:
   ```bash
   npm run seed
   ```

For more detailed instructions on setting up the backend, refer to the [Backend README](../quotation-app-be/README.md).

## Features

- User authentication and authorization
- Inventory management
- Customer management
- Quotation creation and management
- Sales tracking
- Dashboard with key metrics

## Login Credentials (when using seeded data)

- Admin User:
  - Email: admin@example.com
  - Password: password123

- Regular User:
  - Email: user@example.com
  - Password: password123

## Deployment

This application is ready for deployment on Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Steps

1. **Prepare for deployment:**
   ```bash
   ./deploy.sh
   ```

2. **Deploy Backend:**
   - Push backend code to a Git repository
   - Deploy to Vercel with MongoDB Atlas connection
   - Set environment variables in Vercel dashboard

3. **Deploy Frontend:**
   - Update API URL in `src/services/api.js` with your backend URL
   - Push frontend code to a Git repository
   - Deploy to Vercel

### Files Added for Deployment

- `vercel.json` - Vercel configuration for frontend
- `../quotation-app-be/vercel.json` - Vercel configuration for backend
- `.env.example` - Environment variables template for frontend
- `../quotation-app-be/.env.example` - Environment variables template for backend
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `deploy.sh` - Deployment preparation script

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
