// Custom Frame Order Automation for Larson-Juhl
// This code automates ordering frame materials with joining service
// using Puppeteer for web automation within a Node.js environment

const puppeteer = require('puppeteer');
const dotenv = require('dotenv');
dotenv.config();

// Configuration (would be stored in .env file)
const WHOLESALER_URL = 'https://shop.larsonjuhl.com/en-US/'; // Larson-Juhl's shop URL
const USERNAME = process.env.USERNAME; // Your login username
const PASSWORD = process.env.PASSWORD; // Your login password
const ACCOUNT_NUMBER = process.env.ACCOUNT_NUMBER; // Your Larson-Juhl account number

// Example frame order data structure
const frameOrders = [
  {
    itemNumber: 'LJ123456', // Replace with actual Larson-Juhl moulding number
    size: { width: 16, height: 20 }, // inches
    preparedness: 'join', // 'join' for joined frame, 'cut' for length cut
    quantity: 1
  },
  {
    itemNumber: 'LJ789012', // Replace with actual Larson-Juhl moulding number
    size: { width: 8, height: 10 }, // inches
    preparedness: 'join', // 'join' for joined frame, 'cut' for length cut
    quantity: 2
  }
];

// Main function to process orders
async function processOrders(orders) {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true in production
    defaultViewport: null, // Full page viewport
    args: ['--window-size=1920,1080'] // Larger viewport
  });
  const page = await browser.newPage();
  
  try {
    // 1. Login to Larson-Juhl website
    await login(page);
    
    // 2. Process each order
    for (const order of orders) {
      await addFrameToCart(page, order);
    }
    
    // 3. Proceed to checkout
    await checkout(page);
    
    console.log('Orders processed successfully!');
  } catch (error) {
    console.error('Error processing orders:', error);
  } finally {
    await browser.close();
  }
}

// Login to Larson-Juhl website
async function login(page) {
  console.log('Navigating to Larson-Juhl shop...');
  await page.goto(WHOLESALER_URL);
  
  // Look for and click the login link
  try {
    await page.waitForSelector('a.authorization-link', { timeout: 5000 });
    await Promise.all([
      page.click('a.authorization-link'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
  } catch (error) {
    console.log('Login link not found in expected location, trying alternative method...');
    // Try to find login button with different selector or go directly to login page
    await page.goto(`${WHOLESALER_URL}customer/account/login`);
  }
  
  // Wait for login form and enter credentials
  console.log('Entering login credentials...');
  await page.waitForSelector('#email');
  await page.type('#email', USERNAME);
  await page.type('#pass', PASSWORD);
  
  // Accept cookies if the dialog appears
  try {
    const cookieButton = await page.$('.amgdprcookie-button.-allow');
    if (cookieButton) {
      await cookieButton.click();
    }
  } catch (error) {
    console.log('No cookie dialog found or already accepted');
  }
  
  // Click login button and wait for navigation
  await Promise.all([
    page.click('#send2'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]);
  
  console.log('Logged in successfully');
}

// Add a frame to cart
async function addFrameToCart(page, order) {
  console.log(`Processing order for item ${order.itemNumber}...`);
  
  // Navigate to search page and enter item number
  await page.goto(WHOLESALER_URL);
  
  // Wait for search box and search for item number
  await page.waitForSelector('#search');
  await page.type('#search', order.itemNumber);
  await page.keyboard.press('Enter');
  
  // Wait for search results
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  // Click on the product in search results
  try {
    await page.waitForSelector('.product-item-link', { timeout: 5000 });
    await Promise.all([
      page.click('.product-item-link'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
  } catch (error) {
    console.error('Product not found in search results:', error);
    return;
  }
  
  // Wait for product page to load completely
  await page.waitForSelector('#product-addtocart-button');
  
  // Select "Join" option for preparedness if available
  try {
    console.log('Looking for unit of measurement dropdown...');
    await page.waitForSelector('#attribute93', { timeout: 5000 });
    
    // Click the dropdown and select the "Join" option
    await page.select('#attribute93', 'join');
    console.log('Selected "Join" for unit of measurement');
    
    // Wait for any dynamic content to load after changing the option
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log('Unit of measurement selector not found, continuing with default selection...');
  }
  
  // Enter frame dimensions
  try {
    console.log('Entering frame dimensions...');
    
    // Find width and height input fields (exact selectors may vary)
    const widthInput = await page.$('input[name="width"]') || 
                       await page.$('input[placeholder="Width"]') || 
                       await page.$('#width-input');
                       
    const heightInput = await page.$('input[name="height"]') || 
                        await page.$('input[placeholder="Height"]') || 
                        await page.$('#height-input');
    
    if (widthInput && heightInput) {
      await widthInput.click({ clickCount: 3 }); // Select all existing text
      await widthInput.type(order.size.width.toString());
      
      await heightInput.click({ clickCount: 3 }); // Select all existing text
      await heightInput.type(order.size.height.toString());
    } else {
      console.log('Width/height input fields not found. Frame size specification may be handled differently.');
    }
  } catch (error) {
    console.log('Error entering dimensions:', error);
  }
  
  // Look for "Calculate Price" button and click it
  try {
    console.log('Clicking Calculate Price button...');
    const calculateButton = await page.$('button:has-text("Calculate Price")') || 
                           await page.$('.calculate-price') ||
                           await page.$('.action.calculate');
    
    if (calculateButton) {
      await calculateButton.click();
      // Wait for price calculation to complete
      await page.waitForTimeout(2000);
    } else {
      console.log('Calculate Price button not found, continuing...');
    }
  } catch (error) {
    console.log('Error clicking Calculate Price:', error);
  }
  
  // Set quantity
  await page.waitForSelector('#qty');
  await page.click('#qty', { clickCount: 3 }); // Select all existing text
  await page.type('#qty', order.quantity.toString());
  
  // Add to cart
  console.log('Adding item to cart...');
  await Promise.all([
    page.click('#product-addtocart-button'),
    page.waitForSelector('.message-success')
  ]);
  
  // Wait to ensure the item is added properly
  await page.waitForTimeout(2000);
  
  console.log(`Added ${order.itemNumber} to cart`);
}

// Proceed to checkout
async function checkout(page) {
  // Go to shopping cart
  console.log('Proceeding to checkout...');
  await page.goto(`${WHOLESALER_URL}checkout/cart/`);
  
  // Wait for cart page to load
  await page.waitForSelector('.cart-summary');
  
  // Proceed to checkout
  try {
    const checkoutButton = await page.$('button.checkout') || 
                          await page.$('.action.checkout');
    
    if (checkoutButton) {
      await Promise.all([
        checkoutButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
    } else {
      console.error('Checkout button not found');
      return;
    }
  } catch (error) {
    console.error('Error proceeding to checkout:', error);
    return;
  }
  
  // Wait for checkout page to load completely
  await page.waitForSelector('.checkout-shipping-method');
  
  // Select shipping method if required
  try {
    const shippingMethodRadio = await page.$('input[type="radio"][name="shipping_method"]');
    if (shippingMethodRadio) {
      await shippingMethodRadio.click();
    }
  } catch (error) {
    console.log('Error selecting shipping method or not required:', error);
  }
  
  // Click next or continue button to proceed
  try {
    const nextButton = await page.$('button.continue') || 
                      await page.$('.action.continue') ||
                      await page.$('button:has-text("Next")');
    
    if (nextButton) {
      await Promise.all([
        nextButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
    }
  } catch (error) {
    console.log('Error clicking next/continue button or not required:', error);
  }
  
  // Select payment method if available
  try {
    const paymentMethodRadio = await page.$('input[type="radio"][name="payment[method]"]');
    if (paymentMethodRadio) {
      await paymentMethodRadio.click();
    }
  } catch (error) {
    console.log('Error selecting payment method or not required:', error);
  }
  
  // For demonstration purposes, we'll stop before placing the actual order
  // In production, you would uncomment the below code to complete the order
  
  /*
  // Place order
  try {
    const placeOrderButton = await page.$('button.checkout') || 
                            await page.$('.action.checkout') ||
                            await page.$('button:has-text("Place Order")');
    
    if (placeOrderButton) {
      await Promise.all([
        placeOrderButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
    }
  } catch (error) {
    console.error('Error placing order:', error);
    return;
  }
  */
  
  console.log('Order ready for final review and checkout - automation paused before final submission');
}

// Run the automation
if (require.main === module) {
  processOrders(frameOrders)
    .then(() => console.log('Process completed'))
    .catch(err => console.error('Process failed:', err));
}

module.exports = { processOrders };
