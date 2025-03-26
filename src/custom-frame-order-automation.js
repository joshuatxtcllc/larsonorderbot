// Frame Order Automation for Larson-Juhl
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Process orders function that will be exported
async function processOrders(orders) {
  console.log('Processing orders:', orders);

  if (!orders || orders.length === 0) {
    throw new Error('No orders to process');
  }

  // Launch browser with proper configuration for Replit
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Login to Larson-Juhl
    await loginToLarsonJuhl(page);

    // Process each order
    for (const order of orders) {
      await processOrder(page, order);
    }

    console.log('All orders processed successfully');
    return true;
  } catch (error) {
    console.error('Error processing orders:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Login to Larson-Juhl website
async function loginToLarsonJuhl(page) {
  try {
    console.log('Logging in to Larson-Juhl...');

    // Navigate to the login page
    await page.goto('https://shop.larsonjuhl.com/customer/account/login/', { waitUntil: 'networkidle0' });

    // Enter credentials
    await page.type('#email', process.env.USERNAME);
    await page.type('#pass', process.env.PASSWORD);

    // Click login button
    await Promise.all([
      page.click('#send2'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error('Login failed. Please check your credentials.');
    }

    console.log('Login successful');
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Process a single order
async function processOrder(page, order) {
  try {
    console.log('Processing order:', order);

    // Navigate to the moulding product page
    await page.goto(`https://shop.larsonjuhl.com/catalogsearch/result/?q=${order.itemNumber}`, { waitUntil: 'networkidle0' });

    // Click on the product
    await Promise.all([
      page.click('.product-item-link'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Set the dimension options
    await page.type('#width', order.size.width.toString());
    await page.type('#height', order.size.height.toString());

    // Select joining option if requested
    if (order.preparedness === 'join') {
      await page.select('#joining_options', 'joined');
    }

    // Set quantity
    await page.type('#qty', order.quantity.toString());

    // Add to cart
    await Promise.all([
      page.click('#product-addtocart-button'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    console.log('Item added to cart successfully');

    // Navigate to cart
    await page.goto('https://shop.larsonjuhl.com/checkout/cart/', { waitUntil: 'networkidle0' });

    // Proceed to checkout
    try {
      await Promise.all([
        page.click('.action.primary.checkout'),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
    } catch (error) {
      console.log('Error clicking checkout button or not required:', error);
    }

    // For demonstration purposes, we'll stop before placing the actual order
    console.log('Order ready for final review and checkout - automation paused before final submission');
  } catch (error) {
    console.error('Error processing order:', error);
    throw error;
  }
}

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

// Run the automation
if (require.main === module) {
  processOrders(frameOrders)
    .then(() => console.log('Process completed'))
    .catch(err => console.error('Process failed:', err));
}

module.exports = { processOrders, loginToLarsonJuhl, processOrder };