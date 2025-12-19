/**
 * Configuration constants for the extension
 */

// Toggle between development and production
const IS_PRODUCTION = false; // Set to true when deploying

const CONFIG = {
  SERVER_URL: IS_PRODUCTION 
    ? 'http://your-server-ip-or-domain'  // Replace with your production server
    : 'http://localhost:3000',            // Development server
  SESSION_DURATION: 4 * 60 * 60 * 1000, // 4 hours
  OTP_EXPIRY: 5 * 60 * 1000, // 5 minutes
};

const SITES = {
  COPART: {
    LOGIN_URL: 'https://www.copart.com/login',
    DASHBOARD_URL: 'https://www.copart.com/member-payments',
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
