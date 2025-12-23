# Production Testing Checklist

## Pre-Test Setup

1. **Load Extension**
   ```
   chrome://extensions → Enable Developer Mode → Load unpacked
   Select: C:\Users\seed\Documents\GitHub\auction-extension\new-extension
   ```

2. **Open Service Worker Console**
   ```
   Right-click extension icon → "Inspect service worker"
   Keep this window open
   ```

3. **Authenticate**
   ```
   Click extension icon → Enter username → Send Password
   Check Telegram for OTP → Enter OTP → Verify
   Should see "Authenticated" status
   ```

---

## Test 1: Three.js Error (MUST PASS)

### Steps:
1. Click "COPART I" button
2. Wait for page to load
3. Open DevTools on Copart tab (F12)
4. Check Console

### Expected Result:
- ✅ NO "Uncaught SyntaxError: Cannot use import statement outside a module"
- ✅ NO "Warning: Multiple instances of Three.js being imported"
- ✅ NO "[AAS] Dashboard detected - forcing overlay removal"
- ✅ Page loads normally

### If Failed:
- Check if `early-overlay.js` was updated
- Reload extension
- Try again

---

## Test 2: Restrictions Polling Storm (MUST PASS)

### Steps:
1. Open server logs (or Network tab in DevTools)
2. Click "COPART I"
3. Wait for login to complete
4. Reload the Copart page 5 times
5. Check server logs

### Expected Result:
- ✅ First load: 1 request to `/config/restrictions`
- ✅ Reloads: 0 requests (cached)
- ✅ Service worker console shows: "Using cached restrictions for usalogistics"

### If Failed:
- Check if `getCachedRestrictions()` function exists in background.js
- Check service worker console for errors
- Clear cache: `chrome.storage.session.clear()`

---

## Test 3: Infinite Refresh Loop (MUST PASS)

### Steps:
1. Click "COPART I"
2. Watch service worker console
3. Count how many times it says "Loop attempts"

### Expected Result:
- ✅ Opens login page
- ✅ Auto-fills credentials
- ✅ Redirects to `/locations`
- ✅ Service worker shows: "Loop attempts: 1/2"
- ✅ Service worker shows: "Already on target page, cleaning up"
- ✅ **NO LOOP** - stops cleanly

### If Loop Occurs:
- Should stop after 2 attempts
- Should show alert: "Login automation failed (loop detected)"
- Should show badge: ⚠️
- Check service worker logs for "LOOP DETECTED!"

### If Failed:
- Check if `MAX_LOGIN_ATTEMPTS` is set to 2
- Check if `incrementLoopAttempts()` is being called
- Reset: `chrome.storage.session.clear()`

---

## Test 4: Log Capture (MUST PASS)

### Steps:
1. Click "COPART I"
2. Let page reload a few times (if loop occurs)
3. In service worker console, run:
   ```javascript
   chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (r) => console.table(r.logs));
   ```

### Expected Result:
- ✅ Shows table of logs
- ✅ Includes logs from content script (prefixed with [CS])
- ✅ Includes logs from background script
- ✅ Shows timestamps
- ✅ Last 300 entries stored

### If Failed:
- Check if `LOG_FROM_CONTENT` handler exists in background.js
- Check if content script `log()` function sends messages
- Check for errors in service worker console

---

## Test 5: IAAI (MUST PASS)

### Steps:
1. Click "IAAI I"
2. Watch service worker console

### Expected Result:
- ✅ Opens IAAI payment page
- ✅ NO loop
- ✅ NO Three.js errors
- ✅ NO restrictions spam

### If Failed:
- Check IAAI credentials in server
- Check service worker logs for errors

---

## Test 6: Badge Indicator (SHOULD PASS)

### Steps:
1. If loop was detected in Test 3, check extension icon

### Expected Result:
- ✅ Badge shows: ⚠️
- ✅ Badge color: Red (#dc2626)

### To Clear Badge:
```javascript
chrome.action.setBadgeText({ text: '' });
```

---

## Test 7: Cache Expiry (SHOULD PASS)

### Steps:
1. Wait 10 minutes (or change `RESTRICTIONS_CACHE_TTL` to 10 seconds for testing)
2. Reload Copart page
3. Check server logs

### Expected Result:
- ✅ After 10 minutes: 1 new request to `/config/restrictions`
- ✅ Service worker shows: "Fetching fresh restrictions"
- ✅ Cache updated

---

## Debugging Commands

### View All Session Storage
```javascript
chrome.storage.session.get(null, (data) => {
  console.log('Session storage:', data);
});
```

### View Restrictions Cache
```javascript
chrome.storage.session.get(null, (data) => {
  Object.keys(data).forEach(key => {
    if (key.startsWith('restrictions_')) {
      const cache = data[key];
      const age = Date.now() - cache.timestamp;
      console.log(`${key}: ${Math.round(age/1000)}s old`);
    }
  });
});
```

### View Loop State
```javascript
chrome.storage.session.get(null, (data) => {
  Object.keys(data).forEach(key => {
    if (key.startsWith('loop_attempts_')) {
      console.log(key, ':', data[key]);
    }
  });
});
```

### Reset Everything
```javascript
chrome.storage.session.clear();
chrome.storage.local.clear();
chrome.action.setBadgeText({ text: '' });
console.log('✅ Full reset complete - please re-authenticate');
```

---

## Success Criteria

All tests must pass:
- [x] Test 1: No Three.js errors
- [x] Test 2: No restrictions spam
- [x] Test 3: No infinite loop
- [x] Test 4: Logs captured
- [x] Test 5: IAAI works
- [x] Test 6: Badge shows on loop
- [x] Test 7: Cache expires correctly

---

## Common Issues

### Issue: "Loop already stopped for this tab"
**Fix**: 
```javascript
chrome.storage.session.clear();
```

### Issue: Still seeing restrictions spam
**Fix**: 
- Check if `getCachedRestrictions()` is being called
- Check service worker console for "Using cached restrictions"
- If not, reload extension

### Issue: Three.js error still appears
**Fix**:
- Verify `early-overlay.js` has the new code
- Check if URL check happens BEFORE CSS injection
- Reload extension

### Issue: Logs not captured
**Fix**:
- Check if content script is sending messages
- Check service worker console for errors
- Verify `LOG_FROM_CONTENT` handler exists

---

## Final Verification

After all tests pass:

1. **Server Logs**: Should show minimal requests
   - Auth: 1 per login
   - Credentials: 1 per login
   - Restrictions: 1 per 10 minutes

2. **Console Logs**: Should be clean
   - No Three.js errors
   - No "Multiple instances" warnings
   - No "Dashboard detected" messages

3. **User Experience**: Should be smooth
   - Click → Opens → Logs in → Lands on page
   - No visible loops
   - No errors
   - Badge only shows on actual errors

**If all tests pass**: ✅ Extension is production-ready

**If any test fails**: Check the specific debugging section above
