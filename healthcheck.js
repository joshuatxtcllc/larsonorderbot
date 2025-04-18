
const fs = require('fs');
const path = require('path');
const http = require('http');

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

const checkAPI = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '0.0.0.0',
      port: process.env.PORT || 3000,
      path: '/api/status',
      method: 'GET',
      timeout: 5000 // 5 second timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve({ 
              success: true, 
              status: res.statusCode, 
              data: jsonData 
            });
          } catch (e) {
            resolve({ 
              success: false, 
              status: res.statusCode, 
              error: 'Invalid JSON response' 
            });
          }
        } else {
          resolve({ 
            success: false, 
            status: res.statusCode, 
            error: `HTTP ${res.statusCode}` 
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ 
        success: false, 
        error: error.message 
      });
    });

    req.on('timeout', () => {
      req.abort();
      resolve({
        success: false,
        error: 'Request timed out'
      });
    });

    req.end();
  });
};

(async () => {
  try {
    const apiCheck = await checkAPI();
    
    if (apiCheck.success) {
      console.log(`✅ API responded with status: ${apiCheck.status}`);
      console.log(`Response body: ${JSON.stringify(apiCheck.data)}`);
      console.log('\nHealth check passed:');
      console.log('- API is online');
      console.log('- Orders directory exists');
      console.log('All systems operational');
    } else {
      console.log(`❌ API check failed: ${apiCheck.error || 'Unknown error'}`);
      console.log('\nHealth check failed:');
      console.log(`- API is not responding: ${apiCheck.error}`);
      if (ordersDirExists) {
        console.log('- Orders directory exists');
      } else {
        console.log('- Orders directory is missing');
      }
    }
  } catch (error) {
    console.log(`❌ Error during health check: ${error.message}`);
  }
})();
