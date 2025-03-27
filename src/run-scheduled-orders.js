
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
