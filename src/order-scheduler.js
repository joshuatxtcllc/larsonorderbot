
const fs = require('fs');
const path = require('path');
const { processOrders } = require('./custom-frame-order-automation');

const ordersDir = path.join(__dirname, 'orders');

function getApprovedOrders() {
  try {
    if (!fs.existsSync(ordersDir)) {
      console.log('Orders directory does not exist, creating it');
      fs.mkdirSync(ordersDir, { recursive: true });
      return [];
    }
    
    const files = fs.readdirSync(ordersDir);
    const approvedOrders = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const orderPath = path.join(ordersDir, file);
      const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
      
      if (orderData.status === 'approved_for_schedule' && orderData.scheduled) {
        approvedOrders.push(orderData);
      }
    }
    
    return approvedOrders;
  } catch (error) {
    console.error('Error getting approved orders:', error);
    return [];
  }
}

async function processScheduledOrders() {
  console.log('Running scheduled order processing');
  const approvedOrders = getApprovedOrders();
  
  if (approvedOrders.length === 0) {
    console.log('No approved orders to process');
    return { processed: 0, success: true };
  }
  
  console.log(`Found ${approvedOrders.length} orders to process`);
  
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  };
  
  for (const order of approvedOrders) {
    try {
      console.log(`Processing scheduled order: ${order.id}`);
      
      // Mark as processing
      order.status = 'processing';
      order.processingTimestamp = new Date().toISOString();
      fs.writeFileSync(
        path.join(ordersDir, `${order.id}.json`),
        JSON.stringify(order, null, 2)
      );
      
      // Process the order
      await processOrders(order.orders);
      
      // Mark as completed
      order.status = 'completed';
      order.completedTimestamp = new Date().toISOString();
      fs.writeFileSync(
        path.join(ordersDir, `${order.id}.json`),
        JSON.stringify(order, null, 2)
      );
      
      results.processed++;
      results.successful++;
      console.log(`Order ${order.id} processed successfully`);
    } catch (error) {
      console.error(`Error processing order ${order.id}:`, error);
      
      // Mark as failed
      order.status = 'failed';
      order.error = error.message;
      order.failedTimestamp = new Date().toISOString();
      fs.writeFileSync(
        path.join(ordersDir, `${order.id}.json`),
        JSON.stringify(order, null, 2)
      );
      
      results.processed++;
      results.failed++;
      results.errors.push({
        orderId: order.id,
        error: error.message
      });
    }
  }
  
  console.log('Scheduled processing complete:', results);
  return results;
}

module.exports = {
  getApprovedOrders,
  processScheduledOrders
};
