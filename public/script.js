document.addEventListener('DOMContentLoaded', function() {
  // API URL
  const API_URL = '/api';

  // Counter for generating unique IDs for new order forms
  let orderCount = 1;

  // Check server status
  async function checkStatus() {
    try {
      console.log('Checking API status...');
      const response = await fetch(`${API_URL}/status`);
      if (!response.ok) {
        throw new Error(`Status check failed with HTTP ${response.status}`);
      }
      const data = await response.json();

      // Update multiple possible status elements
      const apiStatusElement = document.getElementById('api-status');
      if (apiStatusElement) {
        apiStatusElement.innerText = data.status || 'online';
        apiStatusElement.className = 'text-success';
      }
      
      // Update system status banner
      const systemStatusElement = document.getElementById('system-status');
      if (systemStatusElement) {
        systemStatusElement.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>System is online and operational</div>';
      }
      
      console.log('API status: Online');
    } catch (error) {
      // Update API status indicator
      const apiStatusElement = document.getElementById('api-status');
      if (apiStatusElement) {
        apiStatusElement.innerText = 'offline';
        apiStatusElement.className = 'text-danger';
      }
      
      // Update system status banner
      const systemStatusElement = document.getElementById('system-status');
      if (systemStatusElement) {
        systemStatusElement.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>System is currently offline</div>';
      }
      
      console.error('Error checking status:', error.message || error);
    }
  }

  // Load orders
  async function loadOrders() {
    try {
      console.log('Loading orders...');
      const response = await fetch(`${API_URL}/orders`);
      if (!response.ok) {
        throw new Error(`Orders fetch failed with HTTP ${response.status}`);
      }
      const orders = await response.json();

      // Update the orders directory status
      const ordersDirStatus = document.getElementById('orders-dir-status');
      if (ordersDirStatus) {
        ordersDirStatus.textContent = 'Available';
        ordersDirStatus.className = 'text-success';
      }

      // Check for different possible container elements
      const ordersTable = document.getElementById('ordersTable');
      const ordersList = document.getElementById('ordersList');
      const ordersContainer = document.getElementById('orders-container');

      // Handle orders container first (on dashboard page)
      if (ordersContainer) {
        if (!orders || orders.length === 0) {
          ordersContainer.innerHTML = '<div class="alert alert-info">No orders found</div>';
          return;
        }

        // Display only the most recent 3 orders
        const recentOrders = orders.slice(0, 3);
        ordersContainer.innerHTML = '';
        
        recentOrders.forEach(order => {
          const orderCard = createOrderCard(order);
          ordersContainer.appendChild(orderCard);
        });
      }
      
      // Handle table display if that element exists
      if (ordersTable) {
        const tbody = ordersTable.querySelector('tbody');

        if (!orders || orders.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found</td></tr>';
          return;
        }

        tbody.innerHTML = orders.map(order => `
          <tr class="${order.status === 'failed' ? 'table-danger' : order.status === 'completed' ? 'table-success' : 'table-warning'}">
            <td>${order.id}</td>
            <td>${new Date(order.timestamp).toLocaleString()}</td>
            <td>${order.itemCount || (order.orders ? order.orders.length : 0)}</td>
            <td>
              <span class="badge ${order.status === 'failed' ? 'bg-danger' : order.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                ${order.status}
              </span>
            </td>
            <td>
              <a href="${API_URL}/order-status/${order.id}" class="btn btn-sm btn-primary">Details</a>
              ${order.status === 'failed' ? `<button onclick="retryOrder('${order.id}')" class="btn btn-sm btn-warning">Retry</button>` : ''}
            </td>
          </tr>
        `).join('');
      }

      // Handle orders list display if that element exists
      else if (ordersList) {
        if (!orders || orders.length === 0) {
          ordersList.innerHTML = '<div class="alert alert-info">No orders found</div>';
          return;
        }

        ordersList.innerHTML = orders.map(order => `
          <div class="card order-card">
            <div class="card-header ${order.status === 'failed' ? 'bg-danger' : order.status === 'completed' ? 'bg-success' : 'bg-warning'} text-white">
              <div class="d-flex justify-content-between">
                <span>Order #${order.id}</span>
                <span>${new Date(order.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <div class="card-body">
              <p><strong>Status:</strong> ${order.status}</p>
              <p><strong>Items:</strong> ${order.itemCount || (order.orders ? order.orders.length : 0)}</p>
              <div class="mt-2">
                <a href="${API_URL}/order-status/${order.id}" class="btn btn-sm btn-primary">View Details</a>
                ${order.status === 'failed' ? `<button onclick="retryOrder('${order.id}')" class="btn btn-sm btn-warning ms-2">Retry</button>` : ''}
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error loading orders:', error);

      // Check for different possible container elements
      const ordersTable = document.getElementById('ordersTable');
      const ordersList = document.getElementById('ordersList');

      if (ordersTable) {
        const tbody = ordersTable.querySelector('tbody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading orders</td></tr>';
      } else if (ordersList) {
        ordersList.innerHTML = '<div class="alert alert-danger">Error loading orders</div>';
      }
    }
  }

  // Retry failed order
  window.retryOrder = async function(orderId) {
    try {
      const response = await fetch(`${API_URL}/retry-order/${orderId}`, {
        method: 'POST'
      });

      const result = await response.json();
      alert(`Order retry ${result.message ? 'started' : 'failed'}`);

      // Reload orders
      loadOrders();
    } catch (error) {
      alert('Error retrying order: ' + error.message);
    }
  };

  // Form submission
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      // Show loading state
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
      submitBtn.disabled = true;

      try {
        // Collect order data from form
        const orders = [];
        document.querySelectorAll('.frame-order').forEach(form => {
          const itemNumber = form.querySelector('.item-number').value;
          const width = parseFloat(form.querySelector('.width').value);
          const height = parseFloat(form.querySelector('.height').value);
          const preparedness = form.querySelector('.preparedness').value;
          const quantity = parseInt(form.querySelector('.quantity').value, 10);

          orders.push({
            itemNumber,
            size: { width, height },
            preparedness,
            quantity
          });
        });

        // Send to API
        const response = await fetch(`${API_URL}/process-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            apiKey: localStorage.getItem('apiKey') || prompt('Please enter your API key (will be saved in browser)'),
            orders
          })
        });

        const result = await response.json();

        if (response.ok) {
          // Create a nicer confirmation modal instead of alert
          const modalHtml = `
            <div class="modal fade" id="orderConfirmModal" tabindex="-1" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">Order Submitted Successfully!</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <div class="modal-body">
                    <p><strong>Order ID:</strong> ${result.orderId}</p>
                    <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                    <p>Your order has been received and is being processed.</p>
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <a href="#ordersList" class="btn btn-primary">View My Orders</a>
                  </div>
                </div>
              </div>
            </div>
          `;

          // Add modal to page and show it
          const modalContainer = document.createElement('div');
          modalContainer.innerHTML = modalHtml;
          document.body.appendChild(modalContainer);

          const orderModal = new bootstrap.Modal(document.getElementById('orderConfirmModal'));
          orderModal.show();

          // Clear the form for a new order
          document.querySelectorAll('.frame-order:not(:first-child)').forEach(el => el.remove());
          document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            if (input.id !== 'quantity0') {
              input.value = '';
            }
          });

          // Reload orders
          loadOrders();
        } else {
          throw new Error(result.error || 'Unknown error occurred');
        }
      } catch (error) {
        console.error('Form submission error:', error);

        // Create error modal
        const errorModalHtml = `
          <div class="modal fade" id="orderErrorModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                  <h5 class="modal-title">Order Submission Failed</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p><strong>Error:</strong> ${error.message || 'An error occurred while processing your order'}</p>
                  <p>Please try again or contact support if the issue persists.</p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
              </div>
            </div>
          </div>
        `;

        const errorModalContainer = document.createElement('div');
        errorModalContainer.innerHTML = errorModalHtml;
        document.body.appendChild(errorModalContainer);

        const errorModal = new bootstrap.Modal(document.getElementById('orderErrorModal'));
        errorModal.show();
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Add another frame order
  const addOrderBtn = document.getElementById('addOrderBtn');
  if (addOrderBtn) {
    addOrderBtn.addEventListener('click', function() {
      const ordersContainer = document.getElementById('ordersContainer');
      const newOrder = document.createElement('div');
      newOrder.className = 'frame-order';
      newOrder.innerHTML = `
        <div class="row">
          <div class="col-md-6 mb-3">
            <label for="itemNumber${orderCount}" class="form-label">Larson-Juhl Item Number</label>
            <i class="fas fa-question-circle tooltip-help" data-bs-toggle="tooltip" title="Enter the Larson-Juhl moulding number (e.g. LJ123456)"></i>
            <input type="text" class="form-control item-number" id="itemNumber${orderCount}" placeholder="e.g. 562810" required>
          </div>
          <div class="col-md-6 mb-3">
            <label for="quantity${orderCount}" class="form-label">Quantity</label>
            <input type="number" class="form-control quantity" id="quantity${orderCount}" min="1" value="1" required>
          </div>
        </div>
        <div class="row">
          <div class="col-md-3 mb-3">
            <label for="width${orderCount}" class="form-label">Width (inches)</label>
            <input type="number" class="form-control width" id="width${orderCount}" step="0.125" placeholder="e.g. 16.25" required>
          </div>
          <div class="col-md-3 mb-3">
            <label for="height${orderCount}" class="form-label">Height (inches)</label>
            <input type="number" class="form-control height" id="height${orderCount}" step="0.125" placeholder="e.g. 20.5" required>
          </div>
          <div class="col-md-6 mb-3">
            <label for="preparedness${orderCount}" class="form-label">Unit of Measurement</label>
            <i class="fas fa-question-circle tooltip-help" data-bs-toggle="tooltip" title="Select 'Join' for joined frames or 'Length' for cut lengths"></i>
            <select class="form-select preparedness" id="preparedness${orderCount}" required>
              <option value="join">Join (Assembled Frame)</option>
              <option value="length">Length (Cut Only)</option>
            </select>
          </div>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm remove-order">
          <i class="fas fa-trash-alt me-1"></i> Remove
        </button>
      `;
      ordersContainer.appendChild(newOrder);

      // Initialize tooltips for the new elements
      const newTooltips = newOrder.querySelectorAll('[data-bs-toggle="tooltip"]');
      newTooltips.forEach(el => {
        new bootstrap.Tooltip(el);
      });

      orderCount++;

      // Enable all remove buttons when there's more than one order
      document.querySelectorAll('.remove-order').forEach(btn => {
        btn.disabled = false;
      });
    });
  }

  // Remove order (event delegation)
  const ordersContainer = document.getElementById('ordersContainer');
  if (ordersContainer) {
    ordersContainer.addEventListener('click', function(e) {
      if (e.target.classList.contains('remove-order') || e.target.closest('.remove-order')) {
        const removeBtn = e.target.classList.contains('remove-order') ? e.target : e.target.closest('.remove-order');
        if (!removeBtn.disabled) {
          removeBtn.closest('.frame-order').remove();

          // If only one order left, disable its remove button
          const removeButtons = document.querySelectorAll('.remove-order');
          if (removeButtons.length === 1) {
            removeButtons[0].disabled = true;
          }
        }
      }
    });
  }

  // Initialize
  checkStatus();
  loadOrders();

  // Helper functions for styling based on status
  function getStatusClass(status) {
    switch(status) {
      case 'completed': return 'bg-success text-white';
      case 'processing': return 'bg-primary text-white';
      case 'failed': return 'bg-danger text-white';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary text-white';
    }
  }

  // Get badge CSS class
  function getStatusBadgeClass(status) {
    switch(status) {
      case 'completed': return 'bg-success';
      case 'processing': return 'bg-primary';
      case 'failed': return 'bg-danger';
      case 'pending': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  // Create order card element - useful helper function
  function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'card mb-3';

    // Handle case where orders field might not exist
    const orderItems = order.orders || [];

    card.innerHTML = `
      <div class="card-header ${getStatusClass(order.status)}">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="mb-0">Order #${order.id}</h5>
          <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
        </div>
      </div>
      <div class="card-body">
        <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
        <h6>Items:</h6>
        ${orderItems.length > 0 ? `
          <ul>
            ${orderItems.map(item => `
              <li>
                Item #${item.itemNumber} - ${item.quantity}x 
                ${item.size.width}"x${item.size.height}" 
                (${item.preparedness})
              </li>
            `).join('')}
          </ul>
        ` : '<p>No item details available</p>'}
        ${order.error ? `<div class="alert alert-danger">Error: ${order.error}</div>` : ''}
        ${order.retryTimestamp ? `<p><strong>Retry scheduled:</strong> ${new Date(order.retryTimestamp).toLocaleString()}</p>` : ''}
      </div>
    `;
    return card;
  }

// Refresh data every 30 seconds
setInterval(() => {
  checkStatus();
  loadOrders();
}, 30000);
});