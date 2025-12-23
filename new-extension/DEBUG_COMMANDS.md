# Quick Debugging Commands

## Service Worker Console Commands

Open service worker console:
1. Right-click extension icon
2. Click "Inspect service worker"

### View Captured Logs
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  console.table(response.logs);
});
```

### View Persistent Loop State
```javascript
chrome.storage.session.get(null, (data) => {
  console.log('All session data:', data);
  Object.keys(data).forEach(key => {
    if (key.startsWith('loop_attempts_')) {
      console.log(key, ':', data[key]);
    }
  });
});
```

### Reset Loop State (Clear All Tracking)
```javascript
chrome.storage.session.clear(() => {
  console.log('✅ Loop state cleared - you can try again');
});
```

### Check Specific Tab Loop State
```javascript
// Replace 123 with actual tab ID
const tabId = 123;
const domain = 'copart.com';
const key = `loop_attempts_${tabId}_${domain}`;

chrome.storage.session.get(key, (data) => {
  console.log(`Tab ${tabId} loop state:`, data[key]);
});
```

### View Log Buffer
```javascript
// This shows the in-memory log buffer
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  response.logs.forEach(log => {
    console.log(`[${log.timestamp}] [${log.level}] ${log.message}`);
  });
});
```

---

## Content Script Console Commands

Open content script console:
1. Open Copart/IAAI tab
2. Press F12
3. Go to Console tab

### Check SessionStorage Guard
```javascript
console.log('Login attempted:', sessionStorage.getItem('aas_login_attempted'));
```

### Check If On Login Page (DOM-based)
```javascript
const usernameField = document.querySelector('#username, input[name="username"]');
const passwordField = document.querySelector('#password, input[name="password"]');
console.log('On login page:', !!(usernameField && passwordField));
```

### Check If Logged In (DOM-based)
```javascript
const userMenu = document.querySelector('.user-menu, .account-menu, [class*="user-name"]');
const dashboardElements = document.querySelector('[class*="dashboard"], [class*="member-payments"]');
console.log('Logged in:', !!(userMenu || dashboardElements));
```

### Reset SessionStorage Guard
```javascript
sessionStorage.removeItem('aas_login_attempted');
console.log('✅ SessionStorage guard cleared');
```

---

## Extension Storage Inspection

### View All Local Storage
```javascript
chrome.storage.local.get(null, (data) => {
  console.log('Local storage:', data);
});
```

### View Pending Login
```javascript
chrome.storage.local.get('pendingLogin', (data) => {
  console.log('Pending login:', data.pendingLogin);
});
```

### Clear Pending Login
```javascript
chrome.storage.local.remove('pendingLogin', () => {
  console.log('✅ Pending login cleared');
});
```

---

## Tab Management

### Get Current Tab Info
```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Current tab:', tabs[0]);
  console.log('Tab ID:', tabs[0].id);
  console.log('URL:', tabs[0].url);
});
```

### Find All Copart Tabs
```javascript
chrome.tabs.query({ url: '*://*.copart.com/*' }, (tabs) => {
  console.log('Copart tabs:', tabs);
  tabs.forEach(tab => {
    console.log(`Tab ${tab.id}: ${tab.url}`);
  });
});
```

### Close All Copart Tabs
```javascript
chrome.tabs.query({ url: '*://*.copart.com/*' }, (tabs) => {
  tabs.forEach(tab => chrome.tabs.remove(tab.id));
  console.log(`✅ Closed ${tabs.length} Copart tabs`);
});
```

---

## Network Debugging

### Check If Credentials Are Sent

1. Open Network tab in DevTools
2. Filter by "credentials"
3. Click on request
4. Check "Request Headers" for cookies
5. Check "Response" status (should be 200, not 401/403)

### Check CORS Headers

Look for these in Response Headers:
```
Access-Control-Allow-Origin: chrome-extension://<extension-id>
Access-Control-Allow-Credentials: true
```

---

## Common Issues & Fixes

### Issue: "Loop already stopped for this tab"

**Cause**: Previous attempt hit the limit

**Fix**:
```javascript
// In service worker console
chrome.storage.session.clear(() => {
  console.log('✅ Cleared - close Copart tab and try again');
});
```

### Issue: "Login already attempted on this tab"

**Cause**: Persistent guard is active

**Fix**:
```javascript
// In service worker console
chrome.storage.session.clear();

// In content script console (Copart tab)
sessionStorage.removeItem('aas_login_attempted');

// Then reload the page
location.reload();
```

### Issue: Extension badge shows ⚠️

**Cause**: Loop was detected

**Fix**:
```javascript
// Clear loop state
chrome.storage.session.clear();

// Clear badge
chrome.action.setBadgeText({ text: '' });

// Close Copart tab and try again
```

### Issue: "Credentials API response status: 401"

**Cause**: Server not accepting credentials

**Check**:
1. Are you logged into the extension? (Check side panel)
2. Is session expired? (Try re-authenticating)
3. Server CORS configured correctly?

**Fix**:
```javascript
// Check current session
chrome.storage.local.get('session', (data) => {
  console.log('Session:', data.session);
  if (!data.session || !data.session.authenticated) {
    console.log('❌ Not authenticated - please log in');
  } else if (Date.now() > data.session.expiry) {
    console.log('❌ Session expired - please log in again');
  } else {
    console.log('✅ Session valid');
  }
});
```

---

## Full Reset (Nuclear Option)

If nothing works, reset everything:

```javascript
// In service worker console
chrome.storage.local.clear();
chrome.storage.session.clear();
chrome.action.setBadgeText({ text: '' });

// Close all Copart tabs
chrome.tabs.query({ url: '*://*.copart.com/*' }, (tabs) => {
  tabs.forEach(tab => chrome.tabs.remove(tab.id));
});

console.log('✅ Full reset complete - please re-authenticate and try again');
```

---

## Log Analysis

### Search Logs for Errors
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  const errors = response.logs.filter(log => log.level === 'error');
  console.log('Errors:', errors);
});
```

### Search Logs for Specific RunId
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  const runId = '1703351160000-abc123'; // Replace with your runId
  const filtered = response.logs.filter(log => log.message.includes(runId));
  console.table(filtered);
});
```

### Export Logs to File
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  const logs = response.logs.map(log => 
    `[${log.timestamp}] [${log.level}] ${log.message}`
  ).join('\n');
  
  const blob = new Blob([logs], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aas-logs-${Date.now()}.txt`;
  a.click();
  
  console.log('✅ Logs exported');
});
```

---

## Monitoring Loop Attempts in Real-Time

```javascript
// Run this in service worker console to monitor loop attempts
setInterval(() => {
  chrome.storage.session.get(null, (data) => {
    const loopKeys = Object.keys(data).filter(k => k.startsWith('loop_attempts_'));
    if (loopKeys.length > 0) {
      console.clear();
      console.log('=== Loop Attempts (Real-time) ===');
      loopKeys.forEach(key => {
        const attempts = data[key];
        const elapsed = Date.now() - attempts.firstAttempt;
        console.log(`${key}:`);
        console.log(`  Count: ${attempts.count}/3`);
        console.log(`  Elapsed: ${Math.round(elapsed/1000)}s`);
        console.log(`  Stopped: ${attempts.stopped}`);
        console.log(`  RunId: ${attempts.runId}`);
      });
    }
  });
}, 1000);
```

---

## Testing Checklist

Run these commands to verify everything is working:

### 1. Check Extension State
```javascript
chrome.storage.local.get('session', (data) => {
  console.log('✅ Session:', data.session?.authenticated ? 'Authenticated' : 'Not authenticated');
});
```

### 2. Check Loop State
```javascript
chrome.storage.session.get(null, (data) => {
  const loopKeys = Object.keys(data).filter(k => k.startsWith('loop_attempts_'));
  console.log('✅ Active loop trackers:', loopKeys.length);
});
```

### 3. Check Log Buffer
```javascript
chrome.runtime.sendMessage({ action: 'GET_LOGS' }, (response) => {
  console.log('✅ Log buffer size:', response.logs.length);
});
```

### 4. Test Loop Prevention
```javascript
// Manually trigger loop detection (for testing)
const testTabId = 999;
const domain = 'copart.com';
const runId = 'test-123';

// Simulate 3 attempts
for (let i = 0; i < 3; i++) {
  chrome.runtime.sendMessage({
    action: 'TEST_INCREMENT_LOOP',
    data: { tabId: testTabId, domain, runId }
  });
}

// Check if stopped
setTimeout(() => {
  const key = `loop_attempts_${testTabId}_${domain}`;
  chrome.storage.session.get(key, (data) => {
    console.log('Should be stopped:', data[key].stopped);
  });
}, 1000);
```
