/**
 * Configuration constants for the extension
 */

// Toggle between development and production
const IS_PRODUCTION = true; // Set to true when deploying

const CONFIG = {
  SERVER_URL: IS_PRODUCTION 
    ? 'http://148.251.167.227'  // Your Ubuntu Server IP
    : 'http://localhost:3000',   // Development server
  SESSION_DURATION: 4 * 60 * 60 * 1000, // 4 hours
  OTP_EXPIRY: 5 * 60 * 1000, // 5 minutes
  MAX_LOGIN_ATTEMPTS: 3, // Maximum login attempts before stopping
  ATTEMPT_WINDOW: 30000, // 30 seconds window for counting attempts
};

const SITES = {
  COPART: {
    LOGIN_URL: 'https://www.copart.com/login',
    DASHBOARD_URL: 'https://www.copart.com/locations',  // Changed to avoid Three.js bug
    PROCESS_LOGIN_URL: 'https://www.copart.com/processLogin'
  },
  IAAI: {
    LOGIN_URL: 'https://login.iaai.com/Identity/Account/Login',
    PAYMENT_URL: 'https://www.iaai.com/Payment',
    PICKUP_URL: 'https://www.iaai.com/tobepickedup'
  }
};

// Allowed URL patterns (whitelist)
const ALLOWED_URLS = {
  iaai: [
    '/purchasehistory',
    '/tobepickedup',
    '/payment',
    '/locations',
    '/purchasehistory/showreport',
    '/vehicledetail',
    '/login'
  ],
  copart: [
    '/lot/',
    '/locations',
    '/member-payments',
    '/login'
  ]
};

// Default redirect URLs
const DEFAULT_REDIRECTS = {
  iaai: 'https://www.iaai.com/Payment',
  copart: 'https://www.copart.com/member-payments/unpaid-invoices'
};

export { CONFIG, SITES, ALLOWED_URLS, DEFAULT_REDIRECTS };
