
const fs = require('fs');
const path = require('path');

// Check if orders directory exists
const ordersDir = path.join(__dirname, 'orders');
if (!fs.existsSync(ordersDir)) {
  console.log('Creating orders directory...');
  fs.mkdirSync(ordersDir, { recursive: true });
}

// Check for required environment variables
const requiredEnvVars = ['USERNAME', 'PASSWORD', 'ACCOUNT_NUMBER', 'API_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missing.join(', ')}`);
  console.warn('The application may not function correctly without these variables.');
} else {
  console.log('✅ Environment variables: All required variables present');
}

console.log('Environment check completed');
// Check environment variables and set up folders
const fs = require('fs');
const path = require('path');
const { ordersDir } = require('./config');

// Check if API key is set
if (!process.env.API_KEY) {
  console.warn('WARNING: API_KEY environment variable is not set. API calls will fail.');
}

// Check if vendor credentials are set
if (!process.env.USERNAME || !process.env.PASSWORD) {
  console.warn('WARNING: USERNAME or PASSWORD environment variables are not set. Order processing will fail.');
}

// Ensure orders directory exists
if (!fs.existsSync(ordersDir)) {
  console.log(`Creating orders directory at ${ordersDir}`);
  fs.mkdirSync(ordersDir, { recursive: true });
}

console.log('Environment check completed.');
