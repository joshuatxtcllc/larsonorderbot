# # larson-juhl-frame-automation

Automated system for custom framing businesses to place orders with Larson-Juhl wholesaler, specializing in the automation of frame joining services.

## System Components

1. **Web Automation Script** - Automates the ordering process on the Larson-Juhl website (shop.larsonjuhl.com)
2. **API Backend** - Hosted on Replit, provides an endpoint for Zapier integration and order tracking
3. **Web Interface** - Hosted on Netlify, allows manual order submission with Larson-Juhl specific options
4. **Zapier Integration** - Connects your framing business systems with the Larson-Juhl ordering process

## Deployment Instructions

### 1. Set Up the Repository

```bash
# Clone this repository
git clone https://github.com/yourusername/larson-juhl-frame-automation.git
cd larson-juhl-frame-automation

# Install dependencies
npm install puppeteer express dotenv body-parser
```

### 2. Deploy the API Backend on Replit

1. Create a new Node.js project on [Replit](https://replit.com)
2. Import the `custom-frame-order-automation.js` and `frame-order-zapier-integration.js` files
3. Create a directory in your Replit project called `orders` to store order data
4. Create a directory called `public` and add your web interface files for dashboard access
5. Set up environment variables in the Replit Secrets tab:
   - `USERNAME`: Your Larson-Juhl login email
   - `PASSWORD`: Your Larson-Juhl account password
   - `ACCOUNT_NUMBER`: Your Larson-Juhl account number
   - `API_KEY`: A secret key for API authentication (create your own secure random string)
6. Run the project and note the URL of your Replit app

### 3. Deploy the Web Interface on Netlify

1. Connect your GitHub repository to [Netlify](https://netlify.com)
2. Configure the build settings:
   - Build command: Leave blank (we're not using a build system for this simple interface)
   - Publish directory: `public`
3. In your `public/index.html` file, update the API endpoint to point to your Replit app URL:
   ```javascript
   const API_URL = 'https://your-replit-app.repl.co/api';
   ```
4. Deploy the site
5. Set up a custom domain if desired

### 4. Set Up Zapier Integration

1. Create a new Zap in [Zapier](https://zapier.com)
2. Choose a trigger appropriate for your workflow:
   - Google Sheets: When a new row is added (for tracking frame orders in a spreadsheet)
   - Typeform/Google Forms: When a new entry is submitted (for customer order forms)
   - Airtable: When a record is created (for order management systems)
   - Square/Shopify: When a new order is placed (for e-commerce integration)
3. For the action, choose "Webhooks by Zapier" and select "POST"
4. Configure the webhook with your Replit app URL: `https://your-replit-app.repl.co/api/process-orders`
5. Set up the data structure to match the expected format:
   ```json
   {
     "apiKey": "your-api-key",
     "orders": [
       {
         "itemNumber": "{{itemNumber}}",
         "size": {
           "width": {{width}},
           "height": {{height}}
         },
         "preparedness": "join",
         "quantity": {{quantity}}
       }
     ]
   }
   ```
6. Test the Zap to ensure it's correctly formatting the data and sending it to your API
7. Activate the Zap once testing is successful

### 5. Test and Verify the System

1. Make a test frame order through your web interface
2. Check the Replit console to see the automation process logs
3. Verify that the order appears in your Larson-Juhl account
4. Test the Zapier integration by adding a test order to your trigger source
5. Fine-tune selectors and element interactions in the automation script if needed

## Usage Examples

### Scenario 1: Manual Order Entry

1. Visit your Netlify-hosted web interface
2. Enter Larson-Juhl frame moulding item number (e.g., 562810)
3. Specify frame dimensions (width and height in inches)
4. Select "Join" for unit of measurement to get assembled frames
5. Click "Submit Order"
6. The system will process the order with Larson-Juhl automatically

### Scenario 2: Automated Orders from Order Management System

1. Set up a Google Sheet with columns for your frame orders:
   - Item Number (Larson-Juhl moulding code)
   - Width (inches)
   - Height (inches)
   - Quantity
2. Configure Zapier to watch for new rows
3. When a new order is added, Zapier formats the data and sends it to your Replit API
4. The system logs in to Larson-Juhl's website and places the order automatically

### Scenario 3: Integration with Point of Sale System

1. Connect your POS system (Square, Shopify, etc.) to Zapier
2. Configure a Zap that triggers when a custom frame order is placed
3. Map the order details to the correct format for the API
4. When a customer orders a frame, the system automatically places the wholesale order

## Customization

- **Selectors Adjustment**: The most important customization will likely be adjusting the CSS selectors in the automation script if Larson-Juhl changes their website structure. Look for elements like:
  - Login form fields (`#email`, `#pass`)
  - Search input (`#search`)
  - Product details fields (unit of measurement dropdown, width/height inputs)
  - Add to cart and checkout buttons

- **Error Handling**: Enhance the error handling to send notifications (email/SMS) if an order fails to process

- **Order Tracking**: Expand the order history functionality to track status updates from Larson-Juhl

- **Reporting**: Add reporting features to analyze ordering patterns and popular mouldings

## Security Considerations

- **Secure Credentials**: Always store Larson-Juhl login credentials as environment variables
  - Never hardcode credentials in the script
  - Use Replit Secrets for secure storage

- **API Authentication**: The API uses a simple key-based authentication
  - Consider implementing more robust authentication for production use
  - Rotate the API key periodically

- **HTTPS**: Ensure all communications use HTTPS
  - Both your Netlify site and Replit API should use secure connections
  - Check for mixed content warnings

- **Rate Limiting**: Implement rate limiting on your API to prevent abuse
  - Add code to limit requests per IP address
  - Consider using a package like `express-rate-limit`

- **Data Retention**: Establish a policy for order data retention
  - Regularly clean up old order data from the `orders` directory
  - Ensure you're not storing more customer data than necessary

## Troubleshooting

- **Order Not Processing**: If orders aren't being processed:
  - Check Replit logs for errors
  - Verify Larson-Juhl credentials are correct
  - Test the automation script manually with `node custom-frame-order-automation.js`

- **Website Navigation Issues**: If the script fails to navigate the site:
  - Set `headless: false` in the script to watch the browser actions
  - Look for changed selectors or new UI elements
  - Add more `waitForSelector` and `waitForTimeout` calls if pages load slowly

- **API Connection Problems**: If Zapier can't connect to your API:
  - Ensure your Replit app is running (they sleep after inactivity)
  - Check that the webhook URL is correct
  - Verify the API key matches

## Additional Files

### package.json

```json
{
  "name": "larson-juhl-frame-automation",
  "version": "1.0.0",
  "description": "Automated system for custom framing businesses using Larson-Juhl",
  "main": "frame-order-zapier-integration.js",
  "scripts": {
    "start": "node frame-order-zapier-integration.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "puppeteer": "^21.0.3"
  },
  "author": "Your Name",
  "license": "MIT"
}
```

### .env (Do not commit to GitHub)

```
USERNAME=your_larsonjuhl_email@example.com
PASSWORD=your_larsonjuhl_password
ACCOUNT_NUMBER=your_larsonjuhl_account_number
API_KEY=your_custom_api_key_for_security
PORT=3000
```

### .gitignore

```
node_modules/
.env
*.log
orders/
```

## Support

If you encounter any issues or have questions, please open an issue on this GitHub repository or contact your system administrator.
## POS Integration

The system now supports integration with Point of Sale systems and scheduled order processing:

### API Endpoints for POS Integration

1. **Submit POS Order** - `POST /api/pos/orders`
   ```json
   {
     "apiKey": "your-api-key",
     "orderData": {
       "customerName": "John Doe",
       "posOrderId": "POS123456",
       "items": [
         {
           "itemNumber": "LJ123456",
           "width": 16,
           "height": 20,
           "preparedness": "join",
           "quantity": 1,
           "customerInfo": "Customer special instructions",
           "dueDate": "2023-12-31",
           "notes": "Specific notes for this item"
         }
       ]
     }
   }
   ```

2. **Approve Order** - `POST /api/pos/orders/{orderId}/approve`
   ```json
   {
     "apiKey": "your-api-key"
   }
   ```

3. **Reject Order** - `POST /api/pos/orders/{orderId}/reject`
   ```json
   {
     "apiKey": "your-api-key",
     "reason": "Reason for rejection"
   }
   ```

4. **Get Pending Approvals** - `GET /api/pos/pending-approvals?apiKey=your-api-key`

### Scheduled Order Processing

Orders approved through the POS integration will be automatically processed on Mondays and Wednesdays at 10:00 AM. This process:

1. Collects all approved orders
2. Submits them to Larson-Juhl
3. Updates order status

### Configuring Your POS System

For Square, Shopify, or other POS systems:

1. Use Zapier to connect your POS to our API
2. When a custom frame order is placed in your POS, configure Zapier to:
   - Format the order data according to our API structure
   - Send it to the `/api/pos/orders` endpoint
3. Check the POS Approvals page in our web interface to review and approve orders
4. Approved orders will be automatically processed on schedule

You can also manually trigger the scheduled processing for testing by calling:
```
POST /api/run-scheduled-processing
```
