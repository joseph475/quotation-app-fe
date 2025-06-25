#!/usr/bin/env node

const os = require('os');

console.log('🔧 Mobile Access Setup for Quotation App');
console.log('==========================================\n');

// Get network interfaces
const interfaces = os.networkInterfaces();
const addresses = [];

Object.keys(interfaces).forEach(name => {
  interfaces[name].forEach(interface => {
    if (interface.family === 'IPv4' && !interface.internal) {
      addresses.push({
        name,
        address: interface.address
      });
    }
  });
});

if (addresses.length === 0) {
  console.log('❌ No network interfaces found');
  process.exit(1);
}

console.log('📱 Your computer\'s IP addresses:');
addresses.forEach(addr => {
  console.log(`   ${addr.name}: ${addr.address}`);
});

const primaryIP = addresses[0].address;

console.log('\n🚀 Setup Instructions:');
console.log('======================');
console.log('\n1. Start your backend server:');
console.log('   cd ../quotation-app-be');
console.log('   npm start');
console.log(`   (Backend will be available at: http://${primaryIP}:8000)`);

console.log('\n2. Start your frontend server:');
console.log('   npm run dev');
console.log(`   (Frontend will be available at: http://${primaryIP}:3001)`);

console.log('\n3. On your iPhone:');
console.log('   - Make sure you\'re connected to the same WiFi network');
console.log(`   - Open Safari and go to: http://${primaryIP}:3001`);

console.log('\n4. Update API configuration (if needed):');
console.log('   - The app should automatically connect to your backend');
console.log(`   - Backend API: http://${primaryIP}:8000/api/v1`);
console.log(`   - WebSocket: ws://${primaryIP}:8000/ws`);

console.log('\n🔒 Security Notes:');
console.log('- This setup is for development only');
console.log('- Make sure your firewall allows connections on ports 3001 and 8000');
console.log('- Both devices must be on the same WiFi network');

console.log('\n📱 Troubleshooting:');
console.log('- If you can\'t connect, try disabling your computer\'s firewall temporarily');
console.log('- On macOS, you might need to allow incoming connections in System Preferences > Security & Privacy > Firewall');
console.log('- Make sure no VPN is blocking local network access');

console.log('\n✅ Ready to test on mobile!');
