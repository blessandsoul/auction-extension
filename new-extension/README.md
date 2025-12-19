# AAS Chrome Extension - Deployment Guide

## 📦 Deploying to Production

### Step 1: Update Server URL

Edit `new-extension/src/config/constants.js`:

```javascript
// Toggle between development and production
const IS_PRODUCTION = true; // Change to true

const CONFIG = {
  SERVER_URL: IS_PRODUCTION 
    ? 'http://your-server-ip-or-domain'  // Replace with your actual server
    : 'http://localhost:3000',
  // ...
};
```

Replace `your-server-ip-or-domain` with your actual Ubuntu server IP or domain.

Examples:
- `http://192.168.1.100` (IP address)
- `http://aas.yourdomain.com` (domain name)
- `https://aas.yourdomain.com` (with SSL)

### Step 2: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `new-extension` folder
6. Extension is now installed!

### Step 3: Test Connection

1. Click the extension icon
2. Try logging in with your username
3. Check if OTP is received via Telegram
4. Verify you can open Copart/IAAI accounts

---

## 🔒 Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Use HTTPS in production** - Set up SSL on your Ubuntu server
- **Restrict CORS** - Update server to only allow your extension's origin
- **Keep credentials secure** - Store in database, never in code

---

## 🚀 Quick Start (Development)

```bash
# 1. Start the server (on Ubuntu or locally)
cd server
npm run dev

# 2. Load extension in Chrome
# - Go to chrome://extensions
# - Enable Developer mode
# - Load unpacked -> select new-extension folder

# 3. Test the extension
# - Click extension icon
# - Login with username
# - Verify OTP via Telegram
```

---

## 📝 Configuration Files

| File | Purpose |
|------|---------|
| `src/config/constants.js` | Server URL and app settings |
| `manifest.json` | Extension permissions and metadata |
| `background.js` | Background service worker |
| `content.js` | Page injection scripts |
| `sidepanel.html/js/css` | Extension UI |

---

## 🔧 Troubleshooting

### Extension can't connect to server

1. Check `constants.js` has correct server URL
2. Verify server is running: `curl http://your-server/health`
3. Check browser console for errors (F12)
4. Ensure CORS is enabled on server

### OTP not received

1. Verify Telegram bot token in server `.env`
2. Check server logs: `pm2 logs aas-server`
3. Test Telegram bot manually

### Auto-login not working

1. Check content script logs in browser console
2. Verify credentials are in database
3. Clear browser cookies and try again

---

## 📦 Packaging for Distribution (Optional)

To create a `.crx` file for distribution:

```bash
# 1. Go to chrome://extensions
# 2. Click "Pack extension"
# 3. Select new-extension folder
# 4. Click "Pack Extension"
# 5. Share the generated .crx file
```

**Note:** For private use, loading unpacked is recommended.

---

## 🎯 Production Checklist

- [ ] Server deployed on Ubuntu
- [ ] MySQL database configured
- [ ] SSL certificate installed (optional but recommended)
- [ ] Extension `constants.js` updated with production URL
- [ ] Extension loaded in Chrome
- [ ] Login tested successfully
- [ ] Copart/IAAI auto-login tested
- [ ] UI restrictions verified

---

**Ready to deploy! 🚀**
