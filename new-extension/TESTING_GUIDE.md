# Quick Testing Guide - Production Loop Fix

## Step 0: Reproduce & Confirm Loop Mechanics ✅ COMPLETED

**What we found**:
1. ❌ Missing `credentials: 'include'` in API calls → Server returns 401/403
2. ❌ No loop breaker → Infinite navigation attempts
3. ❌ No idempotent guard → Content script re-runs on every reload
4. ❌ Insufficient logging → Can't debug production issues

**What we fixed**:
1. ✅ Added `credentials: 'include'` to all fetch calls
2. ✅ Implemented navigation attempt tracking (max 3 attempts in 30s)
3. ✅ Added sessionStorage guard to prevent re-injection
4. ✅ Added comprehensive logging with unique runId

---

## How to Test

### 1. Load Extension
```bash
# Navigate to chrome://extensions
# Enable "Developer mode"
# Click "Load unpacked"
# Select: C:\Users\seed\Documents\GitHub\auction-extension\new-extension
```

### 2. Open DevTools for Service Worker
```bash
# Right-click extension icon → "Inspect service worker"
# Keep this window open to see background logs
```

### 3. Authorize
```bash
# Click extension icon → Side panel opens
# Enter username → Click "Send Password"
# Check Telegram for OTP
# Enter OTP → Click "Verify"
# Should see "Authenticated" status
```

### 4. Test Copart 1
```bash
# Click "COPART I" button
# Watch BOTH DevTools windows:
#   - Service Worker: [AAS-BG] logs
#   - New tab: [AAS-CS] logs (open DevTools on new tab)
```

**Expected behavior**:
- New tab opens to copart.com/login
- Overlay shows "Authenticating..."
- Form auto-fills (you won't see this, it's fast)
- Redirects to copart.com/locations
- Overlay disappears
- **NO RELOAD LOOP**

**Expected logs** (Service Worker):
```
[AAS-BG timestamp] [runId] Opening Copart account: COPART I
[AAS-BG timestamp] [runId] Fetching credentials from server...
[AAS-BG timestamp] [runId] Credentials API response status: SUCCESS
[AAS-BG timestamp] [runId] Created tab XXX, navigating to login page
[AAS-BG timestamp] [runId] Tab XXX - Already on target page, cleaning up
```

**Expected logs** (Content Script - open DevTools on Copart tab):
```
[AAS-CS timestamp] Content script V3 (Production Debug) loaded
[AAS-CS timestamp] [runId] Storage result: FOUND
[AAS-CS timestamp] [runId] Set sessionStorage flag to prevent re-run
[AAS-CS timestamp] [runId] API Login SUCCESS!
[AAS-CS timestamp] [runId] Redirecting to: https://www.copart.com/locations
```

### 5. Check for Loop
**If loop occurs**, you'll see:
```
[AAS-BG timestamp] [runId] Navigation attempts: 1, elapsed: XXXms
[AAS-BG timestamp] [runId] Navigation attempts: 2, elapsed: XXXms
[AAS-BG timestamp] [runId] Navigation attempts: 3, elapsed: XXXms
[AAS-BG timestamp] [runId] LOOP DETECTED! Exceeded 3 navigation attempts in 30000ms
[AAS-BG timestamp] [runId] Stopping automatic navigation to prevent infinite loop
```

And an alert will show:
```
AAS Error: Login automation failed (loop detected). RunId: XXXXX

Please check the console logs and contact support.
```

### 6. Test Copart 2 and IAAI
Repeat steps 4-5 for:
- COPART II button
- IAAI I button

---

## Debugging Checklist

If loop still occurs, check:

### ✅ 1. Credentials are being sent
**Service Worker Console**:
```
[API] getCredentials response status: 200  ← Should be 200, not 401/403
```

If you see 401/403:
- Server CORS is not configured correctly
- Server is not accepting credentials
- Session cookie is not being sent

### ✅ 2. sessionStorage guard is working
**Content Script Console** (Copart tab → DevTools → Console):
```
[AAS-CS timestamp] Set sessionStorage flag to prevent re-run
```

Then check **Application → Session Storage → copart.com**:
- Should see: `aas_login_attempted: "true"`

If you don't see this:
- sessionStorage is being cleared
- Page is reloading before flag is set

### ✅ 3. Navigation attempts are being tracked
**Service Worker Console**:
```
[AAS-BG timestamp] [runId] Navigation attempts: 0, elapsed: XXXms
```

If you don't see this:
- Listener is not firing
- Tab ID mismatch

### ✅ 4. No password in logs
Search all logs for your password → Should find **ZERO** matches

---

## Common Issues

### Issue: "Credentials API response status: 401"
**Cause**: Server is not accepting credentials  
**Fix**: Check server CORS configuration:
```javascript
// Server must have:
app.use(cors({
  origin: 'chrome-extension://<extension-id>',
  credentials: true
}));

// Cookies must have:
res.cookie('session', token, {
  sameSite: 'none',
  secure: true
});
```

### Issue: "Storage result: EMPTY" and "No credentials available"
**Cause**: Background script didn't store credentials  
**Fix**: Check background logs for error before "Created tab"

### Issue: Loop still occurs after 3 attempts
**Cause**: Loop breaker is not working  
**Fix**: Check if `CONFIG.MAX_LOGIN_ATTEMPTS` is defined in constants.js

### Issue: Content script runs multiple times
**Cause**: sessionStorage guard is not working  
**Fix**: Check if sessionStorage is being cleared by Copart's page

---

## Success Criteria

✅ Click Copart 1 → Opens → Auto-fills → Lands on dashboard → **NO LOOP**  
✅ Click Copart 2 → Same as above  
✅ Click IAAI → Opens → Auto-fills → Lands on payment page → **NO LOOP**  
✅ Logs show unique runId in all messages  
✅ Logs show "Navigation attempts: 0" (or 1, max 3)  
✅ No password appears in any log  
✅ If loop occurs, stops after 3 attempts with error alert  

---

## Report Template

If loop still occurs, copy this and fill in:

```
**RunId**: [Copy from logs]

**Service Worker Logs**:
[Paste all [AAS-BG] logs]

**Content Script Logs**:
[Paste all [AAS-CS] logs]

**Network Tab**:
- Request to /credentials/copart: [Status code]
- Request includes cookies: [Yes/No]
- Response body: [Paste if error]

**sessionStorage**:
- aas_login_attempted: [Value or "not found"]

**Behavior**:
- Page reloads: [How many times?]
- Final URL: [Where does it end up?]
- Error alert shown: [Yes/No]
```

---

## Next Steps After Testing

1. If successful → Set `IS_PRODUCTION = true` permanently
2. If loop occurs → Fill in report template above
3. If different error → Check PRODUCTION_LOOP_FIX.md for detailed analysis
