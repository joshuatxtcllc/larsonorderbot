
// Monitoring system for frame order automation

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Metrics storage
const metrics = {
  orderProcessed: 0,
  ordersFailed: 0,
  ordersRetried: 0,
  apiRequests: 0,
  errors: 0,
  lastHealthCheck: null,
  uptime: Date.now(),
  responseTimeAvg: 0,
  responseTimeSamples: 0
};

// Track response time
function trackResponseTime(startTime) {
  const duration = Date.now() - startTime;
  
  // Update rolling average
  metrics.responseTimeAvg = 
    (metrics.responseTimeAvg * metrics.responseTimeSamples + duration) / 
    (metrics.responseTimeSamples + 1);
  metrics.responseTimeSamples++;
  
  return duration;
}

// Record API request
function recordApiRequest() {
  metrics.apiRequests++;
}

// Record successful order
function recordOrderProcessed() {
  metrics.orderProcessed++;
}

// Record failed order
function recordOrderFailed() {
  metrics.ordersFailed++;
}

// Record retried order
function recordOrderRetried() {
  metrics.ordersRetried++;
}

// Record error
function recordError() {
  metrics.errors++;
}

// Set last health check
function setLastHealthCheck(status) {
  metrics.lastHealthCheck = {
    timestamp: Date.now(),
    status
  };
}

// Get metrics snapshot
function getMetrics() {
  return {
    ...metrics,
    uptime: Math.floor((Date.now() - metrics.uptime) / 1000) // uptime in seconds
  };
}

// Save metrics to file periodically
function saveMetricsSnapshot() {
  try {
    const metricsDir = path.join(__dirname, 'metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsFile = path.join(metricsDir, `metrics-${timestamp}.json`);
    
    fs.writeFileSync(
      metricsFile,
      JSON.stringify(getMetrics(), null, 2),
      'utf8'
    );
    
    // Clean up old metrics files (keep only last 10)
    const files = fs.readdirSync(metricsDir)
      .filter(file => file.startsWith('metrics-'))
      .sort()
      .reverse();
    
    if (files.length > 10) {
      files.slice(10).forEach(file => {
        fs.unlinkSync(path.join(metricsDir, file));
      });
    }
  } catch (error) {
    logger.error('Error saving metrics snapshot', { error: error.message });
  }
}

// Set up periodic metrics saving (every hour)
setInterval(saveMetricsSnapshot, 60 * 60 * 1000);

module.exports = {
  trackResponseTime,
  recordApiRequest,
  recordOrderProcessed,
  recordOrderFailed,
  recordOrderRetried,
  recordError,
  setLastHealthCheck,
  getMetrics
};
