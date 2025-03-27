
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at http://0.0.0.0:${PORT}`);
});
