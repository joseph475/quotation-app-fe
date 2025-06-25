const fs = require('fs');
const path = require('path');

console.log('=== Deployment Verification ===');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Current directory:', __dirname);

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
console.log('\n=== Dist Directory ===');
console.log('Dist path:', distPath);
console.log('Dist exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('Files in dist:', files);
  
  // Check if index.html exists
  const indexPath = path.join(distPath, 'index.html');
  console.log('Index.html exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    console.log('Index.html size:', indexContent.length, 'bytes');
    console.log('Index.html contains app div:', indexContent.includes('id="app"'));
  }
} else {
  console.log('ERROR: dist directory does not exist!');
  console.log('Available files in current directory:');
  const currentFiles = fs.readdirSync(__dirname);
  console.log(currentFiles);
}

// Check package.json
console.log('\n=== Package.json ===');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('Start script:', packageJson.scripts.start);
  console.log('Build script:', packageJson.scripts.build);
  console.log('Express dependency:', packageJson.dependencies.express);
} else {
  console.log('ERROR: package.json not found!');
}

console.log('\n=== Verification Complete ===');
