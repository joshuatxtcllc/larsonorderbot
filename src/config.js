
const path = require('path');

// Define common paths used throughout the application
module.exports = {
  // Path to orders directory
  ordersDir: path.join(__dirname, 'orders'),
  
  // API key validation
  validateApiKey: (providedKey) => {
    return providedKey === process.env.API_KEY;
  },
  
  // Port configuration
  port: process.env.PORT || 3000
};
