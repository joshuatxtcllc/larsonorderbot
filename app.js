
const express = require('express');
const path = require('path');
const app = express();
// Handle potential import error
let processOrders;
try {
  const automation = require('./src/custom-frame-order-automation');
  processOrders = automation.processOrders;
} catch (error) {
  console.error('Error importing processOrders:', error);
  // Fallback implementation to prevent crashes
  processOrders = async (orders) => {
    console.log('Mock processing orders:', orders);
    return { success: true, message: 'Orders processed (mock)' };
  };
}
// Import POS integration
let posIntegration;
try {
  posIntegration = require('./src/pos-integration');
} catch (error) {
  console.error('Error importing POS integration:', error);
  // Fallback implementation
  posIntegration = {
    handlePosOrder: (order) => {
      console.log('Mock handling POS order:', order);
      return { success: true, orderId: 'mock-id', pickList: [] };
    },
    approveOrderForScheduling: (orderId) => {
      console.log('Mock approving order:', orderId);
      return { success: true, message: 'Order approved (mock)', orderId };
    },
    rejectOrder: (orderId, reason) => {
      console.log('Mock rejecting order:', orderId, reason);
      return { success: true, message: 'Order rejected (mock)', orderId };
    }
  };
}
const crypto = require('crypto');
const fs = require('fs');
require('dotenv').config();

// Create orders directory if it doesn't exist
const ordersDir = path.join(__dirname, 'src', 'orders');
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir, { recursive: true });
}

// Body parser middleware
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Status endpoint for health checks
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'online' });
});

// List all orders (with optional status filter)
app.get('/api/orders', (req, res) => {
  try {
    const { status } = req.query;
    const files = fs.readdirSync(ordersDir);
    const orders = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const orderData = JSON.parse(fs.readFileSync(path.join(ordersDir, file), 'utf8'));
        return {
          id: orderData.id,
          timestamp: orderData.timestamp,
          status: orderData.status,
          itemCount: orderData.orders.length
        };
      })
      .filter(order => !status || order.status === status)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return res.status(200).json(orders);
  } catch (error) {
    console.error('Error listing orders:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Order processing endpoint
app.post('/api/process-orders', async (req, res) => {
  try {
    const { apiKey, orders } = req.body;
    
    // Validate API key (simple security measure)
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Validate order data
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }

    // Add timestamp and order ID
    const timestamp = new Date().toISOString();
    const orderId = crypto.randomBytes(8).toString('hex');
    
    // Save the order to a file for record-keeping and manual processing if needed
    const orderData = {
      id: orderId,
      timestamp,
      orders,
      status: 'pending'
    };
    
    fs.writeFileSync(
      path.join(ordersDir, `${orderId}.json`),
      JSON.stringify(orderData, null, 2)
    );
    
    // Process orders asynchronously so we can return quickly
    processOrders(orders)
      .then(() => {
        // Update status to completed
        orderData.status = 'completed';
        fs.writeFileSync(
          path.join(ordersDir, `${orderId}.json`),
          JSON.stringify(orderData, null, 2)
        );
        console.log(`Order ${orderId} processed successfully via API`);
      })
      .catch(err => {
        // Update status to failed
        orderData.status = 'failed';
        orderData.error = err.message;
        fs.writeFileSync(
          path.join(ordersDir, `${orderId}.json`),
          JSON.stringify(orderData, null, 2)
        );
        console.error(`Error processing order ${orderId} via API:`, err);
      });
    
    // Return success immediately (don't wait for processing to finish)
    return res.status(200).json({ 
      message: 'Order processing started',
      orderId,
      timestamp
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Check order status endpoint
app.get('/api/order-status/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const orderPath = path.join(ordersDir, `${orderId}.json`);
    
    if (!fs.existsSync(orderPath)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    return res.status(200).json({
      id: orderData.id,
      timestamp: orderData.timestamp,
      status: orderData.status,
      error: orderData.error || null
    });
  } catch (error) {
    console.error('Error checking order status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry failed order
app.post('/api/retry-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderPath = path.join(ordersDir, `${orderId}.json`);
    
    if (!fs.existsSync(orderPath)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
    
    if (orderData.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed orders can be retried' });
    }
    
    // Update status to pending
    orderData.status = 'pending';
    orderData.retryTimestamp = new Date().toISOString();
    fs.writeFileSync(orderPath, JSON.stringify(orderData, null, 2));
    
    // Process the order
    processOrders(orderData.orders)
      .then(() => {
        // Update status to completed
        orderData.status = 'completed';
        fs.writeFileSync(orderPath, JSON.stringify(orderData, null, 2));
        console.log(`Order ${orderId} retried successfully`);
      })
      .catch(err => {
        // Update status to failed
        orderData.status = 'failed';
        orderData.error = err.message;
        fs.writeFileSync(orderPath, JSON.stringify(orderData, null, 2));
        console.error(`Error retrying order ${orderId}:`, err);
      });
    
    return res.status(200).json({
      message: 'Order retry started',
      orderId
    });
  } catch (error) {
    console.error('Error retrying order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POS Integration - Receive orders from POS system
app.post('/api/pos/orders', async (req, res) => {
  try {
    const { apiKey, orderData } = req.body;
    
    // Validate API key
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Validate order data
    if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({ error: 'Invalid order data' });
    }
    
    // Process the POS order
    const result = posIntegration.handlePosOrder(orderData);
    
    return res.status(200).json({ 
      message: 'POS order received and pick-list created',
      orderId: result.orderId,
      pickList: result.pickList,
      status: 'awaiting_approval'
    });
  } catch (error) {
    console.error('Error processing POS order:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve order for scheduled processing
app.post('/api/pos/orders/:orderId/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { apiKey } = req.body;
    
    // Validate API key
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const result = posIntegration.approveOrderForScheduling(orderId);
    
    return res.status(200).json({ 
      message: 'Order approved for scheduled processing',
      orderId,
      status: 'approved_for_schedule'
    });
  } catch (error) {
    console.error('Error approving order:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Reject order
app.post('/api/pos/orders/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { apiKey, reason } = req.body;
    
    // Validate API key
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const result = posIntegration.rejectOrder(orderId, reason);
    
    return res.status(200).json({ 
      message: 'Order rejected',
      orderId,
      status: 'rejected'
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get pending orders that need approval
app.get('/api/pos/pending-approvals', async (req, res) => {
  try {
    const { apiKey } = req.query;
    
    // Validate API key
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const files = fs.readdirSync(ordersDir);
    const pendingOrders = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const orderData = JSON.parse(fs.readFileSync(path.join(ordersDir, file), 'utf8'));
        return orderData;
      })
      .filter(order => order.status === 'awaiting_approval')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return res.status(200).json(pendingOrders);
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger manual scheduled processing (for testing)
app.post('/api/run-scheduled-processing', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Validate API key
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Import scheduler
    const { processScheduledOrders } = require('./src/order-scheduler');
    
    // Run the scheduler
    processScheduledOrders()
      .then(result => {
        console.log('Manual scheduled processing result:', result);
      })
      .catch(error => {
        console.error('Error in manual scheduled processing:', error);
      });
    
    return res.status(200).json({ 
      message: 'Scheduled processing started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting scheduled processing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at http://0.0.0.0:${PORT}`);
});
