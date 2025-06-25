// Simple test script to verify server functionality
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('=== Testing Server Setup ===');

// Test 1: Check if dist directory and files exist
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('\n1. File System Check:');
console.log('   Dist exists:', fs.existsSync(distPath));
console.log('   Index exists:', fs.existsSync(indexPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('   Files in dist:', files.length, 'files');
  console.log('   Files:', files.slice(0, 5).join(', '), files.length > 5 ? '...' : '');
}

if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  console.log('   Index size:', content.length, 'bytes');
  console.log('   Contains app div:', content.includes('id="app"'));
  console.log('   Contains bundle.js:', content.includes('bundle.js'));
}

// Test 2: Check package.json
console.log('\n2. Package.json Check:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('   Main:', pkg.main);
  console.log('   Start script:', pkg.scripts.start);
  console.log('   Express dependency:', pkg.dependencies.express ? '✓' : '✗');
  console.log('   Node engine:', pkg.engines?.node || 'not specified');
}

// Test 3: Test server if it's running
console.log('\n3. Server Test:');
const testPort = process.env.PORT || 8080;

// Test health endpoint
const healthReq = http.request({
  hostname: 'localhost',
  port: testPort,
  path: '/health',
  method: 'GET'
}, (res) => {
  console.log('   Health endpoint status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      console.log('   Health response:', health.status);
      console.log('   Uptime:', Math.round(health.uptime), 'seconds');
    } catch (e) {
      console.log('   Health response (raw):', data.substring(0, 100));
    }
  });
});

healthReq.on('error', (err) => {
  console.log('   Health endpoint: Not accessible (' + err.code + ')');
});

healthReq.end();

// Test SPA route
const spaReq = http.request({
  hostname: 'localhost',
  port: testPort,
  path: '/login',
  method: 'GET'
}, (res) => {
  console.log('   SPA route (/login) status:', res.statusCode);
  console.log('   Content-Type:', res.headers['content-type']);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('   Response contains app div:', data.includes('id="app"'));
    console.log('   Response size:', data.length, 'bytes');
  });
});

spaReq.on('error', (err) => {
  console.log('   SPA route: Not accessible (' + err.code + ')');
});

spaReq.end();

console.log('\n=== Test Complete ===');
