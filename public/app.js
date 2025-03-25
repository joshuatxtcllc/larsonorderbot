// Tool functions
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

async function retryFailedOrders() {
  try {
    const response = await fetch('/api/orders?status=failed');
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

async function viewOrderHistory() {
  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();
    
    const historyText = orders.map(order => 
      `Order ${order.id}\n` +
      `Status: ${order.status}\n` +
      `Items: ${order.itemCount}\n` +
      `Date: ${new Date(order.timestamp).toLocaleString()}\n`
    ).join('\n');

    alert('Order History:\n\n' + historyText);
  } catch (error) {
    console.error('Error viewing order history:', error);
    alert('Failed to load order history');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('frameOrderForm');
  const submitBtn = document.getElementById('submitBtn');
  const ordersList = document.getElementById('ordersList');

  // Load existing orders
  loadOrders();

  // Refresh orders every 30 seconds
  setInterval(loadOrders, 30000);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Processing...';
    submitBtn.disabled = true;

    try {
      const order = {
        itemNumber: document.getElementById('itemNumber').value,
        size: {
          width: parseFloat(document.getElementById('width').value),
          height: parseFloat(document.getElementById('height').value)
        },
        preparedness: 'join',
        quantity: parseInt(document.getElementById('quantity').value)
      };

      const response = await fetch('/api/process-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: localStorage.getItem('apiKey') || prompt('Please enter your API key:'),
          orders: [order]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order');
      }

      alert('Order submitted successfully! Order ID: ' + data.orderId);
      form.reset();
      loadOrders();
    } catch (error) {
      console.error('Form submission error:', error);
      alert(error.message || 'An error occurred while processing your order');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  async function loadOrders() {
    try {
      const response = await fetch('/api/orders');
      const orders = await response.json();

      ordersList.innerHTML = orders.map(order => `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h5 class="mb-1">Order ${order.id}</h5>
            <small class="text-muted">${new Date(order.timestamp).toLocaleString()}</small>
          </div>
          <p class="mb-1">Items: ${order.itemCount}</p>
          <span class="badge bg-${getStatusColor(order.status)}">${order.status}</span>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  }
});