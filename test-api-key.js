
const fetch = require('node-fetch');

// This script tests API key validation
const apiKey = process.env.API_KEY; // Should access from environment variable

const testOrder = {
  apiKey: apiKey,
  orders: [
    {
      itemNumber: 'TEST123',
      size: {
        width: 10,
        height: 12
      },
      preparedness: 'join',
      quantity: 1
    }
  ]
};

console.log('Testing API key validation...');
console.log(`Using API key: ${apiKey}`);

fetch('http://0.0.0.0:3000/api/process-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testOrder)
})
.then(response => response.json())
.then(data => {
  console.log('API Response:', data);
  if (data.error && data.error.includes('Invalid API key')) {
    console.log('❌ API key validation failed');
    console.log('Check that the API_KEY environment variable matches the one expected by the server');
  } else {
    console.log('✅ API key validation passed');
  }
})
.catch(error => {
  console.error('Error:', error);
});
