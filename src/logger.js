
// Structured logging system for frame order automation

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be adjusted based on environment)
const currentLogLevel = process.env.LOG_LEVEL ? 
  LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] : 
  LOG_LEVELS.INFO;

// Create a log entry
function createLogEntry(level, message, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
}

// Write log to file (daily rotation)
function writeToFile(entry) {
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `frame-orders-${today}.log`);
  
  fs.appendFileSync(
    logFile,
    JSON.stringify(entry) + '\n',
    'utf8'
  );
}

// Log functions
function error(message, meta = {}) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const entry = createLogEntry('ERROR', message, meta);
    console.error(`[ERROR] ${entry.timestamp}: ${message}`);
    writeToFile(entry);
    return entry;
  }
}

function warn(message, meta = {}) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    const entry = createLogEntry('WARN', message, meta);
    console.warn(`[WARN] ${entry.timestamp}: ${message}`);
    writeToFile(entry);
    return entry;
  }
}

function info(message, meta = {}) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    const entry = createLogEntry('INFO', message, meta);
    console.log(`[INFO] ${entry.timestamp}: ${message}`);
    writeToFile(entry);
    return entry;
  }
}

function debug(message, meta = {}) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    const entry = createLogEntry('DEBUG', message, meta);
    console.log(`[DEBUG] ${entry.timestamp}: ${message}`);
    writeToFile(entry);
    return entry;
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};
