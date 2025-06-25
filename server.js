const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// Log environment info
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', port);
console.log('Current directory:', __dirname);

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
console.log('Dist path:', distPath);
console.log('Dist exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:', files);
}

// Serve static files from the dist directory
app.use(express.static(distPath, {
  maxAge: '1d', // Cache static files for 1 day
  etag: false
}));

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Handle SPA routing - return all requests to React app
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  console.log('Serving index.html for:', req.url);
  console.log('Index path:', indexPath);
  console.log('Index exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/health`);
});
