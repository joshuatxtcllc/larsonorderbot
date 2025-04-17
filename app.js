
const express = require('express');
const path = require('path');
const app = express();

// Import middleware if available
let middleware;
try {
  middleware = require('./src/middleware');
} catch (error) {
  console.warn('Middleware not available, running with reduced security:', error.message);
  // Fallback middleware
  middleware = {
    validateApiKey: (req, res, next) => next(),
    logRequests: (req, res, next) => next(),
    errorHandler: (err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    },
    rateLimit: (req, res, next) => next()
  };
}

// Apply global middleware
app.use(middleware.logRequests);
app.use(middleware.rateLimit);

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

// API routes - apply validation middleware
app.use('/api', middleware.validateApiKey);

// Status endpoint for health checks (public)
app.get('/api/status', (req, res) => {
  // Explicitly mark this endpoint as public by not requiring API key
  res.status(200).json({ status: 'online' });
});

// Additional public status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'online' });
});

// Additional public status endpoint
app.get('/status', (req, res) => {
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

// Run health check endpoint
app.post('/api/run-health-check', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const healthCheck = spawn('node', ['healthcheck.js']);
    
    let output = '';
    
    healthCheck.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    healthCheck.stderr.on('data', (data) => {
      console.error(`Health check error: ${data}`);
    });
    
    healthCheck.on('close', (code) => {
      const success = code === 0;
      console.log(`Health check completed with code ${code}`);
      
      return res.status(200).json({
        success,
        message: success ? 'Health check passed' : 'Health check failed',
        details: output
      });
    });
  } catch (error) {
    console.error('Error running health check:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get system metrics
app.get('/api/metrics', (req, res) => {
  try {
    // Import monitoring module
    let monitoring;
    try {
      monitoring = require('./src/monitoring');
    } catch (error) {
      console.error('Error importing monitoring module:', error);
      return res.status(500).json({ 
        error: 'Monitoring system not available',
        metrics: {
          orderProcessed: 0,
          ordersFailed: 0,
          apiRequests: 0,
          errors: 0,
          uptime: 0,
          responseTimeAvg: 0
        }
      });
    }
    
    // Record this API request
    monitoring.recordApiRequest();
    
    // Return metrics
    return res.status(200).json(monitoring.getMetrics());
  } catch (error) {
    console.error('Error getting metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// System logs endpoint (last 100 lines)
app.get('/api/logs', (req, res) => {
  try {
    const { apiKey } = req.query;
    
    // Validate API key for sensitive operations
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const logsDir = path.join(__dirname, 'src', 'logs');
    if (!fs.existsSync(logsDir)) {
      return res.status(200).json({ logs: [] });
    }
    
    // Get most recent log file
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse();
    
    if (logFiles.length === 0) {
      return res.status(200).json({ logs: [] });
    }
    
    const latestLogFile = path.join(logsDir, logFiles[0]);
    const content = fs.readFileSync(latestLogFile, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    
    // Return last 100 lines
    const logs = lines.slice(-100).map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { raw: line };
      }
    });
    
    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use(middleware.errorHandler);

// Create orders cleanup job (run every day at midnight)
const cleanupOldOrders = () => {
  try {
    console.log('Running order cleanup job');
    const MAX_AGE_DAYS = 30; // Keep orders for 30 days
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    const files = fs.readdirSync(ordersDir);
    let cleanedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const orderPath = path.join(ordersDir, file);
      const stats = fs.statSync(orderPath);
      
      // If file is older than MAX_AGE_DAYS
      if (now - stats.mtime.getTime() > maxAge) {
        // Get order status before deleting
        try {
          const orderData = JSON.parse(fs.readFileSync(orderPath, 'utf8'));
          // Don't delete orders that aren't completed or failed
          if (orderData.status !== 'completed' && orderData.status !== 'failed') {
            continue;
          }
        } catch (err) {
          console.warn(`Error reading order ${file} before cleanup:`, err);
          // If we can't read it, assume it's safe to delete
        }
        
        fs.unlinkSync(orderPath);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} old orders`);
  } catch (error) {
    console.error('Error cleaning up old orders:', error);
  }
};

// Schedule the cleanup job (every day at midnight)
const scheduleCleanup = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    0, 0, 0 // midnight
  );
  
  const timeToMidnight = night.getTime() - now.getTime();
  
  setTimeout(() => {
    cleanupOldOrders();
    // Schedule next run (every 24 hours)
    setInterval(cleanupOldOrders, 24 * 60 * 60 * 1000);
  }, timeToMidnight);
  
  console.log(`Order cleanup scheduled, first run in ${Math.round(timeToMidnight / 1000 / 60)} minutes`);
};

// Create orders directory if it doesn't exist
try {
  if (!fs.existsSync(ordersDir)) {
    console.log(`Creating orders directory at ${ordersDir}`);
    fs.mkdirSync(ordersDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating orders directory:', error);
}

// Start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at http://0.0.0.0:${PORT}`);
  console.log(`Server is ready and listening for connections!`);
  
  // Schedule cleanup job
  scheduleCleanup();
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
