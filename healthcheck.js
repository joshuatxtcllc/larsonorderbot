
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('Running health check...');

// Check for .env file
console.log('\nChecking .env file:');
const envExists = fs.existsSync(path.join(__dirname, '.env'));
console.log(envExists ? '✅ .env file exists' : '❌ .env file is missing');

// Check required files
console.log('\nChecking core files:');
['app.js', 'src/custom-frame-order-automation.js'].forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`${exists ? '✅' : '❌'} ${file} ${exists ? 'exists' : 'is missing'}`);
});

// Check orders directory
console.log('\nChecking orders directory:');
const ordersDir = path.join(__dirname, 'src', 'orders');
const ordersDirExists = fs.existsSync(ordersDir);
console.log(ordersDirExists ? `✅ Orders directory exists at ${ordersDir}` : `❌ Orders directory is missing at ${ordersDir}`);

if (ordersDirExists) {
  try {
    const files = fs.readdirSync(ordersDir);
    console.log(`✅ Orders directory contains ${files.length} files`);
  } catch (error) {
    console.log(`❌ Error reading orders directory: ${error.message}`);
  }
}

// Check API availability
console.log('\nChecking API availability:');
const req = http.request({
  hostname: '0.0.0.0',
  port: 3000,
  path: '/api/status',
  method: 'GET'
}, (res) => {
  console.log(`✅ API responded with status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response body: ${chunk}`);
  });
});

req.on('error', (error) => {
  console.log(`❌ API request failed: ${error.message}`);
});

req.end();

console.log('\nHealth check complete. Run this script after starting the server to identify issues.');
