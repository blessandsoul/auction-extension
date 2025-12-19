/**
 * Send OTP password to Telegram
 * @param {string} otp - The one-time password
 * @param {string} username - Username requesting login
 * @param {object} userInfo - User information (IP, timestamp, etc.)
 */
async function sendTelegramOTP(otp, username, userInfo) {
  const message = `
🔐 *AAS Login Request*

👤 *User:* ${username}
📍 *IP:* \`${userInfo.ip || 'unknown'}\`
🕐 *Time:* ${new Date().toISOString()}

━━━━━━━━━━━━━━━
🔑 *One-Time Password:*

\`${otp}\`

_(tap to copy)_
━━━━━━━━━━━━━━━
⏰ Expires in 5 minutes
`;

  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Telegram send failed:', error);
    throw error;
  }
}

module.exports = { sendTelegramOTP };
