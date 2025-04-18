// Middleware for API security and monitoring

const { recordApiRequest, trackResponseTime } = require('./monitoring');

// API Key validation middleware
function validateApiKey(req, res, next) {
  // Skip validation for certain routes (public routes)
  const publicRoutes = ['/api/status', '/api/metrics', '/status'];

  // Routes that should be available for dashboard but protected for modifications
  const dashboardRoutes = ['/api/orders'];

  // Log what path is being checked
  console.log(`Checking route: ${req.path}`);

  // Allow public routes without authentication
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // For dashboard routes, allow GET requests without API key but require API key for other methods
  if (dashboardRoutes.includes(req.path) && req.method === 'GET') {
    return next();
  }

  // Allow OPTIONS requests for CORS preflight
  if (req.method === 'OPTIONS') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] || req.query.apiKey || (req.body && req.body.apiKey);

  if (!apiKey || apiKey !== process.env.API_KEY) {
    console.log(`API key validation failed for ${req.path}`);
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
}

// Request logging middleware
function logRequests(req, res, next) {
  const start = Date.now();
  const { method, path, ip } = req;

  // Add CORS headers for API routes
  if (path.startsWith('/api')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return res.status(200).end();
    }
  }

  // Record API request in monitoring
  recordApiRequest();

  // Once response is finished
  res.on('finish', () => {
    const duration = trackResponseTime(start);
    const status = res.statusCode;

    console.log(`${method} ${path} - ${status} - ${duration}ms - ${ip}`);
  });

  next();
}

// Error handling middleware
function errorHandler(err, req, res, next) {
  console.error('API Error:', err);

  // Don't expose internal server errors
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

// Rate limiting (basic implementation)
const requestCounts = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function rateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();

  // Initialize or clean up old entries
  if (!requestCounts[ip] || now - requestCounts[ip].timestamp > RATE_LIMIT_WINDOW) {
    requestCounts[ip] = {
      count: 0,
      timestamp: now
    };
  }

  // Increment request count
  requestCounts[ip].count++;

  // Check if over limit
  if (requestCounts[ip].count > RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((requestCounts[ip].timestamp + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }

  next();
}

module.exports = {
  validateApiKey,
  logRequests,
  errorHandler,
  rateLimit
};