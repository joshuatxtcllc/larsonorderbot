// Frame Order Automation for Larson-Juhl
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Import utilities and logger
let utils, logger, monitoring;
try {
  utils = require('./utils');
  logger = require('./logger');
  monitoring = require('./monitoring');
} catch (error) {
  console.error('Error importing utility modules:', error);
  // Fallback implementation for backwards compatibility
  utils = {
    withRetry: async (fn, options) => fn(),
    formatError: (error) => ({ message: error.message, stack: error.stack })
  };
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.log,
    debug: console.log
  };
  monitoring = {
    recordOrderProcessed: () => {},
    recordOrderFailed: () => {}
  };
}

// Process orders function that will be exported
async function processOrders(orders) {
  logger.info('Processing orders', { orderCount: orders ? orders.length : 0 });

  if (!orders || orders.length === 0) {
    const error = new Error('No orders to process');
    logger.error('Order processing failed', { error: utils.formatError(error) });
    throw error;
  }

  // Launch browser with proper configuration for Replit
  let browser;
  try {
    browser = await utils.withRetry(
      () => puppeteer.launch({
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        timeout: 60000 // Increase timeout for slow starts
      }),
      { maxRetries: 3, initialDelay: 2000 }
    );
  } catch (error) {
    logger.error('Failed to launch browser', { error: utils.formatError(error) });
    monitoring?.recordOrderFailed();
    throw new Error(`Failed to launch browser: ${error.message}`);
  }

  try {
    const page = await browser.newPage();
    
    // Set debug level and page timeout
    await page.setDefaultNavigationTimeout(60000); // 60 seconds
    await page.setDefaultTimeout(30000); // 30 seconds
    
    await page.setViewport({ width: 1280, height: 800 });

    // Add page error handling
    page.on('error', err => {
      logger.error('Page error', { error: utils.formatError(err) });
    });
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        logger.error('Browser console error', { text });
      } else if (type === 'warning') {
        logger.warn('Browser console warning', { text });
      } else {
        logger.debug('Browser console', { type, text });
      }
    });

    // Login to Larson-Juhl with retry
    await utils.withRetry(
      () => loginToLarsonJuhl(page),
      { maxRetries: 3, initialDelay: 2000 }
    );

    // Process each order with individual error handling
    const results = {
      successful: [],
      failed: []
    };
    
    for (const order of orders) {
      try {
        await utils.withRetry(
          () => processOrder(page, order),
          { maxRetries: 2, initialDelay: 1000 }
        );
        results.successful.push(order.itemNumber);
        monitoring?.recordOrderProcessed();
        logger.info('Order processed successfully', { 
          itemNumber: order.itemNumber,
          size: order.size
        });
      } catch (error) {
        results.failed.push({
          itemNumber: order.itemNumber,
          error: error.message
        });
        monitoring?.recordOrderFailed();
        logger.error('Failed to process order', {
          order,
          error: utils.formatError(error)
        });
        
        // Take screenshot on failure for debugging
        try {
          const screenshotDir = path.join(__dirname, 'screenshots');
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }
          
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const screenshotPath = path.join(
            screenshotDir, 
            `error-${order.itemNumber}-${timestamp}.png`
          );
          
          await page.screenshot({ path: screenshotPath, fullPage: true });
          logger.info('Error screenshot saved', { path: screenshotPath });
        } catch (screenshotError) {
          logger.error('Failed to save error screenshot', { 
            error: utils.formatError(screenshotError)
          });
        }
      }
    }
    
    if (results.failed.length > 0) {
      logger.warn('Some orders failed to process', { 
        successful: results.successful.length,
        failed: results.failed.length,
        failedItems: results.failed
      });
    } else {
      logger.info('All orders processed successfully', { 
        count: results.successful.length
      });
    }
    
    return results;
  } catch (error) {
    logger.error('Error in order processing batch', { error: utils.formatError(error) });
    monitoring?.recordOrderFailed();
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug('Browser closed successfully');
      } catch (error) {
        logger.error('Error closing browser', { error: utils.formatError(error) });
      }
    }
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
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 })
    ]);

    console.log('Item added to cart successfully');

    // Navigate to cart
    await page.goto('https://shop.larsonjuhl.com/checkout/cart/', { waitUntil: 'networkidle0', timeout: 30000 });

    // Proceed to checkout
    try {
      await Promise.all([
        page.click('.action.primary.checkout'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 })
      ]);
    } catch (error) {
      console.log('Error clicking checkout button or not required:', error);
    }

    // Take screenshot of the cart for approval
    console.log('Capturing cart preview for approval...');
    const screenshotDir = path.join(__dirname, '..', 'public', 'cart-previews');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const cartPreviewPath = path.join(screenshotDir, `cart-${Date.now()}.png`);
    await page.screenshot({ path: cartPreviewPath, fullPage: true });
    
    // Store the cart URL for one-click ordering
    const cartUrl = page.url();
    
    console.log('Order ready for final review and checkout - paused before final submission');
    console.log('Cart preview saved at:', cartPreviewPath);
    
    return {
      status: 'ready_for_approval',
      cartUrl: cartUrl,
      cartPreviewPath: cartPreviewPath
    };
  } catch (error) {
    console.error('Error processing order:', error);
    throw error;
  } finally {
    try {
      // Always close the browser to prevent memory leaks
      if (browser) await browser.close();
    } catch (err) {
      console.error('Error closing browser:', err);
    }
  }
}

// Import the puppeteer config
const puppeteerConfig = require('./puppeteer-config');

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
