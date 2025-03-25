
// Wait for the DOM to fully load before executing any JavaScript
document.addEventListener('DOMContentLoaded', function() {
  let orderCount = 1;
  
  // Initialize tooltips
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  
  // Add another frame order
  document.getElementById('addOrderBtn').addEventListener('click', function() {
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
  
  // Remove order (event delegation)
  document.getElementById('ordersContainer').addEventListener('click', function(e) {
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
  
  // Form submission
  document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    submitBtn.disabled = true;
    
    try {
      // Form validation
      const forms = document.querySelectorAll('.frame-order');
      let hasError = false;
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
          if (!input.checkValidity()) {
            hasError = true;
            input.classList.add('is-invalid');
          }
        });
      });
      
      if (hasError) {
        throw new Error('Please fill in all required fields correctly');
      }
      
      // Continue with form submission...
    } catch (error) {
      console.error('Form submission error:', error);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      alert(error.message || 'An error occurred while processing your order');
    }
  });
});
