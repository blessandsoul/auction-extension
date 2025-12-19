const { generateOTP } = require('../utils/otp');
const { sendTelegramOTP } = require('./telegram.service');

// In-memory OTP storage (use Redis for production/scaling)
const verificationCodes = new Map();

/**
 * Create and send OTP for user
 * @param {string} username
 * @param {object} userInfo - User information (IP, etc.)
 * @returns {Promise<string>} Generated OTP
 */
async function createOTP(username, userInfo) {
  const otp = generateOTP();
  const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes

  verificationCodes.set(otp, {
    username,
    expiry
  });

  await sendTelegramOTP(otp, username, userInfo);
  
  return otp;
}

/**
 * Verify OTP code
 * @param {string} code - OTP code to verify
 * @returns {object|null} Verification data if valid, null otherwise
 */
function verifyOTP(code) {
  const verification = verificationCodes.get(code);

  if (!verification) {
    return { valid: false, reason: 'invalid' };
  }

  if (Date.now() > verification.expiry) {
    verificationCodes.delete(code);
    return { valid: false, reason: 'expired' };
  }

  // Valid - delete and return
  verificationCodes.delete(code);
  return { valid: true, username: verification.username };
}

/**
 * Clean up expired OTPs (run periodically)
 */
function cleanupExpiredOTPs() {
  const now = Date.now();
  for (const [code, data] of verificationCodes.entries()) {
    if (now > data.expiry) {
      verificationCodes.delete(code);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  createOTP,
  verifyOTP
};
