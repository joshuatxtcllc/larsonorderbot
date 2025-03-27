
// Order Scheduler for approved frame orders
const fs = require('fs');
const path = require('path');
const { processOrders } = require('./custom-frame-order-automation');
const { ordersDir } = require('./config');

// Function to get all approved orders waiting for scheduled processing
function getApprovedOrders() {
  try {
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

// Function to process scheduled orders
async function processScheduledOrders() {
  try {
    console.log('Running scheduled order processing...');
    const approvedOrders = getApprovedOrders();
    
    if (approvedOrders.length === 0) {
      console.log('No approved orders to process');
      return {
        success: true,
        message: 'No approved orders to process',
        processedCount: 0
      };
    }
    
    console.log(`Found ${approvedOrders.length} orders to process`);
    
    for (const order of approvedOrders) {
      try {
        // Extract the items for processing
        const items = order.items;
        
        // Update the order status
        order.status = 'processing';
        order.processingStartedAt = new Date().toISOString();
        fs.writeFileSync(
          path.join(ordersDir, `${order.id}.json`),
          JSON.stringify(order, null, 2)
        );
        
        // Process the order
        await processOrders(items);
        
        // Update status to completed
        order.status = 'completed';
        order.completedAt = new Date().toISOString();
        fs.writeFileSync(
          path.join(ordersDir, `${order.id}.json`),
          JSON.stringify(order, null, 2)
        );
        
        console.log(`Scheduled order ${order.id} processed successfully`);
      } catch (error) {
        // Update status to failed
        order.status = 'failed';
        order.error = error.message;
        order.failedAt = new Date().toISOString();
        fs.writeFileSync(
          path.join(ordersDir, `${order.id}.json`),
          JSON.stringify(order, null, 2)
        );
        
        console.error(`Error processing scheduled order ${order.id}:`, error);
      }
    }
    
    return {
      success: true,
      message: 'Scheduled order processing completed',
      processedCount: approvedOrders.length
    };
  } catch (error) {
    console.error('Error in scheduled order processing:', error);
    return {
      success: false,
      error: error.message,
      processedCount: 0
    };
  }
}

module.exports = {
  getApprovedOrders,
  processScheduledOrders
};
