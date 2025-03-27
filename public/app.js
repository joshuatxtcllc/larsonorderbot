
// Dashboard functionality for Frame Order Management

// Load orders when the page loads
document.addEventListener('DOMContentLoaded', function() {
  loadOrders();
  
  // Set up event listeners
  document.getElementById('checkStatusBtn').addEventListener('click', checkOrderStatus);
  document.getElementById('retryOrderBtn').addEventListener('click', retryFailedOrders);
  
  // Check system status
  checkSystemStatus();
});

// Load all orders
async function loadOrders() {
  try {
    const response = await fetch('/api/orders');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const orders = await response.json();
    displayOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
    document.getElementById('ordersTable').innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-danger">
          Failed to load orders. Please refresh the page or check server status.
        </td>
      </tr>
    `;
  }
}

// Display orders in the table
function displayOrders(orders) {
  const tableBody = document.getElementById('ordersTable');
  
  if (orders.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">No orders found</td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = orders.map(order => `
    <tr class="${getStatusClass(order.status)}">
      <td>${order.id}</td>
      <td>${new Date(order.timestamp).toLocaleString()}</td>
      <td>${order.status}</td>
      <td>${order.itemCount} item(s)</td>
    </tr>
  `).join('');
}

// Get appropriate class for status
function getStatusClass(status) {
  switch(status) {
    case 'completed': return 'table-success';
    case 'failed': return 'table-danger';
    case 'pending': return 'table-warning';
    default: return '';
  }
}

// Check system status
async function checkSystemStatus() {
  try {
    const response = await fetch('/api/status');
    
    if (response.ok) {
      const data = await response.json();
      document.getElementById('systemStatus').textContent = data.status;
      document.getElementById('systemStatus').className = 'badge bg-success';
    } else {
      document.getElementById('systemStatus').textContent = 'offline';
      document.getElementById('systemStatus').className = 'badge bg-danger';
    }
  } catch (error) {
    console.error('Error checking status:', error);
    document.getElementById('systemStatus').textContent = 'error';
    document.getElementById('systemStatus').className = 'badge bg-danger';
  }
}

// Check order status
async function checkOrderStatus() {
  try {
    const orderId = prompt('Enter order ID to check:');
    if (!orderId) return;

    const response = await fetch(`/api/order-status/${orderId}`);
    const data = await response.json();

    if (response.ok) {
      alert(`Order Status:\nID: ${data.id}\nStatus: ${data.status}\nTimestamp: ${new Date(data.timestamp).toLocaleString()}`);
    } else {
      alert('Error: ' + (data.error || 'Failed to check order status'));
    }
  } catch (error) {
    console.error('Error checking order status:', error);
    alert('Failed to check order status');
  }
}

// Retry failed orders
async function retryFailedOrders() {
  try {
    const response = await fetch('/api/orders?status=failed');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const orders = await response.json();
    
    if (orders.length === 0) {
      alert('No failed orders found');
      return;
    }

    const orderToRetry = prompt(`Failed orders:\n${orders.map(o => o.id).join('\n')}\n\nEnter order ID to retry:`);
    if (!orderToRetry) return;

    const retryResponse = await fetch(`/api/retry-order/${orderToRetry}`, { method: 'POST' });
    const retryData = await retryResponse.json();

    if (retryResponse.ok) {
      alert('Order retry initiated successfully');
      loadOrders();
    } else {
      alert('Error: ' + (retryData.error || 'Failed to retry order'));
    }
  } catch (error) {
    console.error('Error retrying orders:', error);
    alert('Failed to retry orders');
  }
}
