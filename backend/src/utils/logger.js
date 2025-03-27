/**
 * Structured logging utility for the application
 */
const winston = require("winston");
const config = require("../config/env");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = () => {
  const envLevel = config.logLevel;
  if (envLevel !== undefined) {
    return envLevel <= 4 ? Object.keys(levels)[envLevel] : "info";
  }

  return config.isDevelopment ? "debug" : "info";
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Always write to console
  new winston.transports.Console(),

  // Write errors to a file
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
  }),

  // Write all logs to a file
  new winston.transports.File({ filename: "logs/all.log" }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

module.exports = logger;
