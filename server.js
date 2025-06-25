const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// Log environment info
console.log('=== Server Starting ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', port);
console.log('Current directory:', __dirname);
console.log('Node version:', process.version);

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('Dist path:', distPath);
console.log('Dist exists:', fs.existsSync(distPath));
console.log('Index path:', indexPath);
console.log('Index exists:', fs.existsSync(indexPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:', files);
}

// Verify index.html content
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  console.log('Index.html size:', indexContent.length, 'bytes');
  console.log('Index.html contains app div:', indexContent.includes('id="app"'));
} else {
  console.error('ERROR: index.html not found!');
  process.exit(1);
}

// Disable Express powered-by header
app.disable('x-powered-by');

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.get('User-Agent')}`);
  next();
});

// Health check endpoint (before static middleware)
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    distExists: fs.existsSync(distPath),
    indexExists: fs.existsSync(indexPath)
  });
});

// Serve static files from the dist directory
app.use(express.static(distPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0', // Cache in production only
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper MIME types
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Handle SPA routing - MUST be last route
app.get('*', (req, res) => {
  console.log('SPA fallback for:', req.url);
  
  // Double-check file exists before serving
  if (!fs.existsSync(indexPath)) {
    console.error('CRITICAL: index.html missing at request time!');
    return res.status(500).send('Server configuration error: index.html not found');
  }
  
  try {
    // Set proper headers for HTML
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send the file
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).send('Error serving application');
      } else {
        console.log('Successfully served index.html for:', req.url);
      }
    });
  } catch (error) {
    console.error('Exception in SPA handler:', error);
    res.status(500).send('Server error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).send('Internal server error');
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`=== Server Running ===`);
  console.log(`Server is running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`App URL: http://localhost:${port}`);
  console.log('======================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
