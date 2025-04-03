
// Script for scheduled execution (Monday and Wednesday at 10:00 AM)
const { processScheduledOrders } = require('./order-scheduler');

console.log('Starting scheduled order processing');
console.log('Time:', new Date().toISOString());

processScheduledOrders()
  .then(result => {
    console.log('Scheduled processing result:', result);
    console.log('Finished at:', new Date().toISOString());
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running scheduled processing:', error);
    process.exit(1);
  });
#!/usr/bin/env node
// Script to run scheduled order processing

const { processScheduledOrders } = require('./order-scheduler');
const logger = require('./logger');
const monitoring = require('./monitoring');

// Main function
async function main() {
  console.log('Starting scheduled order processing');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Run the scheduled order processing
    const result = await processScheduledOrders();
    
    // Log the result with color formatting
    console.log('Scheduled processing result:', { 
      processed: `\x1b[33m${result.processed}\x1b[0m`, 
      success: `\x1b[33m${result.success}\x1b[0m` 
    });
    
    // Record metrics
    if (result.processed > 0) {
      for (let i = 0; i < result.processed; i++) {
        monitoring.recordOrderProcessed();
      }
    }
    
    // Update last successful run time if no errors
    if (result.success) {
      monitoring.setLastHealthCheck({
        scheduler: true,
        result: 'success',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error running scheduled orders:', error);
    monitoring.recordError();
  }
  
  console.log('Finished at:', new Date().toISOString());
}

// Run the main function
main().catch(console.error);
