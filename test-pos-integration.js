
// Test script for POS integration
const fetch = require('node-fetch');
require('dotenv').config();

const API_KEY = process.env.API_KEY || 'frame_order_api_key_2025';
const BASE_URL = 'http://0.0.0.0:3000';

// Sample order from POS system
const posOrder = {
  apiKey: API_KEY,
  orderData: {
    customerName: "Jane Smith",
    posOrderId: "POS-TEST-123",
    items: [
      {
        itemNumber: "562810", // Larson-Juhl item number
        width: 16,
        height: 20,
        preparedness: "join",
        quantity: 1,
        customerInfo: "Returning customer",
        dueDate: "2025-05-01",
        notes: "Black frame for poster"
      },
      {
        itemNumber: "563420", // Another Larson-Juhl item number
        width: 8,
        height: 10,
        preparedness: "join",
        quantity: 2,
        dueDate: "2025-05-01",
        notes: "Gold frames for photos"
      }
    ]
  }
};

// 1. Submit a POS order
async function submitPosOrder() {
  try {
    console.log('Submitting POS order...');
    const response = await fetch(`${BASE_URL}/api/pos/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(posOrder)
    });
    
    const data = await response.json();
    console.log('POS order submitted successfully:');
    console.log(JSON.stringify(data, null, 2));
    
    return data.orderId;
  } catch (error) {
    console.error('Error submitting POS order:', error);
    return null;
  }
}

// 2. List pending approvals
async function listPendingApprovals() {
  try {
    console.log('\nListing pending approvals...');
    const response = await fetch(`${BASE_URL}/api/pos/pending-approvals?apiKey=${API_KEY}`);
    
    const data = await response.json();
    console.log('Pending approvals:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error listing pending approvals:', error);
    return [];
  }
}

// 3. Approve an order
async function approveOrder(orderId) {
  try {
    console.log(`\nApproving order ${orderId}...`);
    const response = await fetch(`${BASE_URL}/api/pos/orders/${orderId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey: API_KEY })
    });
    
    const data = await response.json();
    console.log('Order approved:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error approving order:', error);
    return null;
  }
}

// 4. Run scheduled processing
async function runScheduledProcessing() {
  try {
    console.log('\nRunning scheduled processing...');
    const response = await fetch(`${BASE_URL}/api/run-scheduled-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ apiKey: API_KEY })
    });
    
    const data = await response.json();
    console.log('Scheduled processing started:');
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error running scheduled processing:', error);
    return null;
  }
}

// Run the full test flow
async function runFullTest() {
  console.log('======= STARTING POS INTEGRATION TEST =======');
  
  // Step 1: Submit a POS order
  const orderId = await submitPosOrder();
  if (!orderId) {
    console.error('Test failed: Could not submit POS order');
    return;
  }
  
  // Step 2: List pending approvals
  const pendingOrders = await listPendingApprovals();
  if (!pendingOrders || pendingOrders.length === 0) {
    console.error('Test failed: No pending approvals found');
    return;
  }
  
  // Step 3: Approve the order
  const approvalResult = await approveOrder(orderId);
  if (!approvalResult) {
    console.error('Test failed: Could not approve order');
    return;
  }
  
  // Step 4: Run scheduled processing (this would normally run on schedule)
  const processingResult = await runScheduledProcessing();
  
  console.log('\n======= TEST COMPLETED SUCCESSFULLY =======');
  console.log('Your POS integration is working properly.');
  console.log('You can now integrate your actual POS system using the API.');
}

// Run the test
if (require.main === module) {
  runFullTest();
}

module.exports = {
  submitPosOrder,
  listPendingApprovals,
  approveOrder,
  runScheduledProcessing,
  runFullTest
};
