
// POS Integration for Frame Orders
const fs = require('fs');
const path = require('path');
const { ordersDir } = require('./config');

// Function to handle incoming POS orders
function handlePosOrder(orderData) {
  try {
    // Generate unique order ID
    const orderId = `pos-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Format the pick list for each order
    const pickList = orderData.items.map(item => {
      return {
        itemNumber: item.itemNumber,
        size: {
          width: item.width,
          height: item.height
        },
        preparedness: item.preparedness || 'join',
        quantity: item.quantity || 1,
        customerInfo: item.customerInfo || '',
        dueDate: item.dueDate || '',
        notes: item.notes || ''
      };
    });
    
    // Create order object with pending status
    const orderObject = {
      id: orderId,
      timestamp: new Date().toISOString(),
      source: 'POS',
      status: 'awaiting_approval',
      scheduled: true,
      customerName: orderData.customerName || 'Unknown',
      posOrderId: orderData.posOrderId || '',
      items: pickList
    };
    
    // Save to file system
    const orderPath = path.join(ordersDir, `${orderId}.json`);
    fs.writeFileSync(orderPath, JSON.stringify(orderObject, null, 2));
    
    console.log(`New POS order received and saved: ${orderId}`);
    
    return {
      success: true,
      orderId,
      pickList
    };
  } catch (error) {
    console.error('Error handling POS order:', error);
    throw error;
  }
}

// Function to approve order for scheduled processing
function approveOrderForScheduling(orderId) {
  try {
    const orderPath = path.join(ordersDir, `${orderId}.json`);
    
    if (!fs.existsSync(orderPath)) {
      throw new Error('Order not found');
    }
    
    const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    
    if (orderData.status !== 'awaiting_approval') {
      throw new Error('Order is not awaiting approval');
    }
    
    // Update status
    orderData.status = 'approved_for_schedule';
    orderData.approvedAt = new Date().toISOString();
    
    fs.writeFileSync(orderPath, JSON.stringify(orderData, null, 2));
    
    return {
      success: true,
      message: 'Order approved for scheduled processing',
      orderId
    };
  } catch (error) {
    console.error('Error approving order:', error);
    throw error;
  }
}

// Function to reject order
function rejectOrder(orderId, reason) {
  try {
    const orderPath = path.join(ordersDir, `${orderId}.json`);
    
    if (!fs.existsSync(orderPath)) {
      throw new Error('Order not found');
    }
    
    const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    
    if (orderData.status !== 'awaiting_approval') {
      throw new Error('Order is not awaiting approval');
    }
    
    // Update status
    orderData.status = 'rejected';
    orderData.rejectedAt = new Date().toISOString();
    orderData.rejectionReason = reason || 'No reason provided';
    
    fs.writeFileSync(orderPath, JSON.stringify(orderData, null, 2));
    
    return {
      success: true,
      message: 'Order rejected',
      orderId
    };
  } catch (error) {
    console.error('Error rejecting order:', error);
    throw error;
  }
}

module.exports = {
  handlePosOrder,
  approveOrderForScheduling,
  rejectOrder
};
