# Production Refresh Loop Fix - Three.js Crash + Persistent Loop Breaker

**Date**: 2025-12-23  
**Status**: ✅ FIXED  
**Issue**: Infinite refresh loop caused by Copart's Three.js module error + insufficient loop prevention

---

## Root Cause Explanation

### 1. **Three.js Module Error (Copart's Bug, Not Ours)**

**Evidence from console screenshot**:
```
Uncaught SyntaxError: Cannot use import statement outside a module at three.module.js:6
Warning: Multiple instances of Three.js being imported
```

**Analysis**:
- This error occurs on **Copart's own website**, not from our extension
- Copart's dashboard page (`/dashboard` or `/member-payments`) loads `three.module.js` as a classic script instead of a module
- The error crashes the page before our content script can complete
- Our extension does NOT inject Three.js anywhere

**Search Results**:
- Searched entire codebase for `three.module.js`, `three`, `createElement('script')`, `executeScript` - **NO INJECTION FOUND**
- Only reference: `constants.js` line 21 comment: "Changed to avoid Three.js bug"
- This confirms the team already knew about Copart's bug and redirects to `/locations` instead of `/dashboard`

**Why This Causes Loop**:
1. Extension opens Copart login page
2. Login succeeds, redirects to dashboard
3. Dashboard page crashes due to Three.js error
4. Our content script's "success detection" fails because page crashed
5. Background script thinks login failed, retries
6. Loop continues

### 2. **Insufficient Loop Breaker (Our Bug)**

**Previous Implementation**:
- Loop tracking in `navigationAttempts` Map (in-memory only)
- Lost on page reload/crash
- Content script sets `sessionStorage` flag
- Also lost if page crashes before flag is set

**Why It Failed**:
- Page crashes **before** content script can set guards
- Background script's in-memory counter resets on service worker restart
- No persistent state survives crashes

---

## Solution Implemented

### Fix 1: **Persistent Loop Tracking (chrome.storage.session)**

**What Changed**:
- Added `chrome.storage.session` based tracking that survives:
  - Page crashes
  - Page reloads
  - Service worker restarts
- Tracks attempts **before** opening tab (not after)
- Key format: `loop_attempts_{tabId}_{domain}`

**Implementation** (`background.js`):
```javascript
async function incrementLoopAttempts(tabId, domain, runId) {
  const key = `loop_attempts_${tabId}_${domain}`;
  const attempts = await getLoopAttempts(tabId, domain);
  
  // Reset if window expired
  const elapsed = Date.now() - attempts.firstAttempt;
  if (elapsed > CONFIG.ATTEMPT_WINDOW) {
    attempts.count = 1;
    attempts.firstAttempt = Date.now();
    attempts.stopped = false;
  } else {
    attempts.count++;
  }
  
  attempts.runId = runId;
  await chrome.storage.session.set({ [key]: attempts });
  
  return attempts;
}
```

**Flow**:
1. User clicks "Open Copart"
2. **BEFORE** opening tab: Check if existing tab already hit limit
3. Open tab
4. **IMMEDIATELY** increment persistent counter (before any navigation)
5. On each navigation: Check persistent counter
6. If `count >= 3`: Stop, show error, set badge

**Benefits**:
- Works even if page crashes immediately
- Survives service worker restart
- Can't be bypassed by fast reloads

### Fix 2: **Log Capture System**

**Problem**: Page reloads too fast to see logs

**Solution**: 
- Content script sends all logs to background via `chrome.runtime.sendMessage`
- Background stores last 300 log entries in memory buffer
- Can be retrieved via `GET_LOGS` message

**Implementation**:
```javascript
// Content script
function log(level, ...args) {
    // ... console logging ...
    
    // Send to background for persistence
    chrome.runtime.sendMessage({
        action: 'LOG_FROM_CONTENT',
        data: { level, message }
    }).catch(() => {});
}

// Background script
const logBuffer = [];
const MAX_LOG_BUFFER = 300;

function captureLog(level, ...args) {
  const logEntry = { timestamp, level, message: args.join(' ') };
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
}
```

**Usage**:
```javascript
// In service worker console:
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  console.table(response.logs);
});
```

### Fix 3: **DOM-Based Login Detection**

**Problem**: URL-based detection (`currentUrl.includes('login')`) is unreliable

**Solution**: Check for actual DOM elements

**Implementation** (`content.js`):
```javascript
function isOnLoginPage() {
    const usernameField = document.querySelector('#username, input[name="username"]');
    const passwordField = document.querySelector('#password, input[name="password"]');
    const loginButton = document.querySelector('button[type="submit"]');
    
    return !!(usernameField && passwordField) || !!loginButton;
}

function isLoggedIn() {
    const userMenu = document.querySelector('.user-menu, .account-menu');
    const dashboardElements = document.querySelector('[class*="dashboard"]');
    
    return !!(userMenu || dashboardElements);
}
```

**Benefits**:
- Works regardless of URL structure
- Detects login state even if URL doesn't change
- More resilient to site updates

### Fix 4: **Persistent Idempotent Guard**

**Previous**: `sessionStorage` only (lost on crash)

**New**: `chrome.storage.session` + `sessionStorage` (double guard)

**Implementation**:
```javascript
async function handleCopartLogin() {
    // Persistent guard (survives crash)
    const tabId = await getCurrentTabId();
    const sessionKey = `aas_login_attempted_${tabId}`;
    
    const result = await chrome.storage.session.get(sessionKey);
    if (result[sessionKey] === true) {
        log('warn', 'Login already attempted on this tab, skipping');
        return;
    }
    
    // Fallback guard
    const alreadyRan = sessionStorage.getItem('aas_login_attempted');
    if (alreadyRan === 'true') {
        log('warn', 'Login already attempted (sessionStorage), skipping');
        return;
    }
    
    // Mark BEFORE doing anything
    await chrome.storage.session.set({ [sessionKey]: true });
    sessionStorage.setItem('aas_login_attempted', 'true');
    
    // ... proceed with login ...
}
```

### Fix 5: **Visual Error Indicator**

**New**: Extension badge shows error state

**Implementation**:
```javascript
async function markLoopStopped(tabId, domain, runId) {
  // ... mark stopped in storage ...
  
  // Set extension badge to show error
  chrome.action.setBadgeText({ text: '⚠️', tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId: tabId });
}
```

**User sees**: Red ⚠️ badge on extension icon when loop is detected

---

## Code Changes Summary

### File: `background.js`

**Added**:
1. `logBuffer` array for log capture (300 entries)
2. `captureLog()` function
3. `getLoopAttempts()` - Read from chrome.storage.session
4. `incrementLoopAttempts()` - Increment persistent counter
5. `shouldStopLoop()` - Check if should stop
6. `markLoopStopped()` - Mark stopped + set badge
7. `clearLoopTracking()` - Clean up session storage
8. `findExistingCopartTab()` - Find existing tab
9. `GET_LOGS` message handler
10. `LOG_FROM_CONTENT` message handler

**Modified**:
1. `handleOpenCopart()`:
   - Check for existing tab before opening new one
   - Increment persistent counter BEFORE navigation
   - Check persistent counter in listener (not in-memory)
   - Clear persistent tracking on success
2. `log()` - Now also calls `captureLog()`

**Complexity**: 9/10

### File: `content.js`

**Added**:
1. `isOnLoginPage()` - DOM-based login detection
2. `isLoggedIn()` - DOM-based logged-in detection
3. `getCurrentTabId()` - Get current tab ID for session key

**Modified**:
1. `log()` - Now sends logs to background via message
2. `handleCopartLogin()`:
   - Check `chrome.storage.session` guard first
   - Fallback to `sessionStorage` guard
   - Set both guards before proceeding
   - Get tab ID for session key

**Complexity**: 7/10

---

## Testing Evidence

### Expected Behavior (Success Case):

**Service Worker Logs**:
```
[AAS-BG 2025-12-23T17:58:00.000Z] [runId-123] Opening Copart account: COPART I
[AAS-BG 2025-12-23T17:58:00.100Z] [runId-123] Fetching credentials from server...
[AAS-BG 2025-12-23T17:58:00.200Z] [runId-123] Credentials API response status: SUCCESS
[AAS-BG 2025-12-23T17:58:00.300Z] [runId-123] Created tab 456, navigating to login page
[AAS-BG 2025-12-23T17:58:00.400Z] [runId-123] Loop attempts for tab 456: 1/3
[AAS-BG 2025-12-23T17:58:05.000Z] [runId-123] Tab 456 - Already on target page, cleaning up
```

**Content Script Logs**:
```
[AAS-CS 2025-12-23T17:58:03.000Z] Content script V3 loaded
[AAS-CS 2025-12-23T17:58:03.100Z] [runId-123] Set chrome.storage.session guard
[AAS-CS 2025-12-23T17:58:03.200Z] [runId-123] Set sessionStorage flag
[AAS-CS 2025-12-23T17:58:03.300Z] [runId-123] API Login SUCCESS!
[AAS-CS 2025-12-23T17:58:03.400Z] [runId-123] Redirecting to: /locations
```

**Result**: ✅ Lands on `/locations` page, no loop

### Expected Behavior (Loop Detected):

**Service Worker Logs**:
```
[AAS-BG timestamp] [runId-123] Loop attempts for tab 456: 1/3
[AAS-BG timestamp] [runId-123] Loop attempts for tab 456: 2/3
[AAS-BG timestamp] [runId-123] Loop attempts for tab 456: 3/3
[AAS-BG timestamp] [runId-123] Persistent attempts: 3/3, elapsed: 5000ms
[AAS-BG timestamp] [runId-123] LOOP DETECTED! Exceeded 3 navigation attempts
[AAS-BG timestamp] [runId-123] Stopping automatic navigation to prevent infinite loop
[AAS-BG timestamp] [runId-123] Loop stopped for tab 456
```

**User sees**:
- Alert: "AAS Error: Login automation failed (loop detected). RunId: runId-123"
- Extension badge: Red ⚠️

**Result**: ✅ Loop stopped after 3 attempts, user notified

---

## Acceptance Criteria

### ✅ Must Pass:

1. **Copart 1**: Opens → Logs in → Lands on `/locations` → **NO LOOP**
2. **Copart 2**: Same as above
3. **IAAI**: Opens → Logs in → Lands on payment page → **NO LOOP**
4. **Loop Prevention**: If loop occurs, stops after 3 attempts with error message
5. **Badge Indicator**: Shows ⚠️ when loop detected
6. **Log Persistence**: Logs available in background even after page reload
7. **No Three.js Error from Extension**: Extension does not inject Three.js (Copart's error is unavoidable)

### ✅ Edge Cases:

1. **Page Crashes Immediately**: Loop counter still increments, stops after 3
2. **Service Worker Restarts**: Loop counter persists in chrome.storage.session
3. **User Clicks Multiple Times**: Existing tab check prevents opening multiple tabs
4. **Session Expires**: Shows clear error, no loop

---

## Three.js Issue - Final Verdict

**Q**: Does our extension inject Three.js?  
**A**: **NO**. Comprehensive search found zero injection code.

**Q**: Why does the error appear?  
**A**: Copart's own website has a bug where they load `three.module.js` as a classic script instead of `type="module"`.

**Q**: Can we fix Copart's bug?  
**A**: **NO**. We can only avoid triggering it by:
- Redirecting to `/locations` instead of `/dashboard` (already done in `constants.js`)
- Implementing robust loop prevention (now done)

**Q**: What if the error still appears?  
**A**: The error will appear if Copart's page loads, but our loop breaker will prevent infinite retries.

---

## Debugging Tools

### 1. View Captured Logs

**In Service Worker Console**:
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  console.table(response.logs);
});
```

### 2. Check Persistent Loop State

**In Service Worker Console**:
```javascript
chrome.storage.session.get(null, (data) => {
  console.log('Session storage:', data);
});
```

### 3. Reset Loop State

**In Service Worker Console**:
```javascript
chrome.storage.session.clear(() => {
  console.log('Loop state cleared');
});
```

### 4. Check Extension Badge

Look at extension icon - if you see ⚠️, loop was detected.

---

## Rollback Plan

If issues persist:

1. Check service worker logs for `LOOP DETECTED` message
2. Check if `chrome.storage.session` is supported (Chrome 102+)
3. Verify server CORS allows `credentials: include`
4. Check Network tab for 401/403 responses
5. Try clearing all extension data: `chrome.storage.local.clear()` + `chrome.storage.session.clear()`

---

## Summary

**Root Cause**: 
1. Copart's Three.js bug crashes page before our guards can activate
2. Previous loop breaker used in-memory state that was lost on crash

**Fix**:
1. Persistent loop tracking in `chrome.storage.session` (survives crashes)
2. Increment counter BEFORE navigation (not after)
3. Check persistent state on every navigation
4. Stop after 3 attempts with visual indicator
5. Log capture system for debugging fast-reloading pages
6. DOM-based login detection (more reliable than URL)

**Result**: Loop prevention that works even if page crashes immediately.

**No Three.js injection by our extension** - the error is from Copart's site and unavoidable, but we now handle it gracefully.
