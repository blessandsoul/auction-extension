# Direct API Authentication - Implementation Guide

## What We're Implementing

**Method**: Direct POST to Copart's `/processLogin` endpoint
**Advantages**:
- No form filling
- No DOM waiting
- No navigation loops
- Instant authentication
- Immune to UI changes

## Implementation Steps

### Step 1: Update Content Script

Replace the entire login flow in `content.js` with:

```javascript
/**
 * Direct API Authentication for Copart
 * Bypasses form filling in favor of direct network request
 */
async function attemptDirectCopartLogin(username, password, runId) {
    log('info', `[${runId}] Starting Direct API Auth...`);

    try {
        // 1. Extract CSRF Token (CRITICAL)
        log('info', `[${runId}] Extracting CSRF token from page...`);
        const headText = document.head.textContent;
        const tokenMatch = headText.match(/csrfToken:.*?"(?<token>.*?)"/s);
        
        if (!tokenMatch || !tokenMatch.groups || !tokenMatch.groups.token) {
            log('error', `[${runId}] Failed to extract CSRF Token`);
            return { success: false, error: 'CSRF_MISSING' };
        }
        
        const csrfToken = tokenMatch.groups.token;
        log('info', `[${runId}] CSRF Token extracted successfully`);

        // 2. Prepare Payload
        const payload = JSON.stringify({
            accountType: 0,
            accountTypeValue: 0,
            username: username,
            password: password
        });

        log('info', `[${runId}] Sending authentication request to /processLogin...`);

        // 3. Send Direct API Request
        const response = await fetch("https://www.copart.com/processLogin", {
            method: "POST",
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json;charset=UTF-8",
                "X-XSRF-TOKEN": csrfToken,
                "X-Requested-With": "XMLHttpRequest"
            },
            body: payload,
            credentials: "include" // CRITICAL: Saves cookies
        });

        log('info', `[${runId}] Response status: ${response.status}`);

        const data = await response.json();
        log('info', `[${runId}] Response data:`, JSON.stringify(data).substring(0, 200));

        // 4. Validate Response
        if (response.ok && data.data && !data.data.error) {
            log('info', `[${runId}] ✅ Authentication successful! Reloading page...`);
            
            // Notify background of success
            chrome.runtime.sendMessage({
                action: 'LOGIN_SUCCESS',
                data: { site: 'copart', runId }
            }).catch(() => {});
            
            // Reload to apply session cookies
            window.location.reload();
            return { success: true };
        } else {
            const errorMsg = data.data?.error || data.error || 'UNKNOWN_ERROR';
            log('error', `[${runId}] Authentication failed: ${errorMsg}`);
            return { success: false, error: errorMsg };
        }

    } catch (err) {
        log('error', `[${runId}] Network error:`, err.message);
        return { success: false, error: 'NETWORK_ERROR' };
    }
}
```

### Step 2: Update handleCopartLogin

Replace the form-filling logic with:

```javascript
async function handleCopartLogin() {
    // PERSISTENT IDEMPOTENT GUARD
    const tabId = await getCurrentTabId();
    const sessionKey = `aas_login_attempted_${tabId}`;
    
    try {
        const result = await chrome.storage.session.get(sessionKey);
        if (result[sessionKey] === true) {
            log('warn', 'Login already attempted on this tab, skipping');
            return;
        }
    } catch (e) {
        log('warn', 'chrome.storage.session not available, falling back to sessionStorage');
    }
    
    const alreadyRan = sessionStorage.getItem('aas_login_attempted');
    if (alreadyRan === 'true') {
        log('warn', 'Login already attempted (sessionStorage), skipping');
        return;
    }
    
    log('info', 'On Copart login page, checking for pending credentials...');
    
    try {
        const result = await chrome.storage.local.get('pendingLogin');
        const pending = result.pendingLogin;
        
        if (!pending) {
            log('info', 'No pending login found');
            return;
        }
        
        const runId = pending.runId || generateRunId();
        log('info', `[${runId}] Found pending login for site:`, pending.site);
        
        if (pending.site === 'copart') {
            // Mark as attempted BEFORE doing anything
            try {
                await chrome.storage.session.set({ [sessionKey]: true });
                log('info', `[${runId}] Set chrome.storage.session guard`);
            } catch (e) {
                log('warn', `[${runId}] Could not set session storage guard:`, e.message);
            }
            
            sessionStorage.setItem('aas_login_attempted', 'true');
            log('info', `[${runId}] Set sessionStorage flag`);
            
            // Show overlay
            showOverlay();
            log('info', `[${runId}] Overlay shown`);
            
            // Execute DIRECT API login (no form filling)
            log('info', `[${runId}] Executing Direct API login...`);
            const result = await attemptDirectCopartLogin(pending.username, pending.password, runId);
            
            if (!result.success) {
                log('error', `[${runId}] Direct API login failed:`, result.error);
                hideOverlay();
                alert(`Login failed: ${result.error}`);
            }
            
            // Clear credentials
            await chrome.storage.local.remove(['pendingLogin']);
            log('info', `[${runId}] Cleared pendingLogin from storage`);
        }
    } catch (e) {
        log('error', 'Content script error:', e.message, e.stack);
    }
}
```

### Step 3: Remove All Form-Filling Code

Delete these functions (no longer needed):
- `waitForLoginForm()`
- `executeCopartLogin()` (old form-filling version)
- Any DOM manipulation for login forms

### Step 4: Update Background Script

Add handler for LOGIN_SUCCESS:

```javascript
case 'LOGIN_SUCCESS':
  const { site, runId } = message.data;
  log('info', `[${runId}] Login success reported from content script for ${site}`);
  
  // Clear navigation tracking (success)
  if (sender.tab && sender.tab.id) {
    const domain = site === 'copart' ? 'copart.com' : 'iaai.com';
    await clearNavigationHistory(sender.tab.id, domain);
    await setTabState(sender.tab.id, domain, { state: TabState.DONE });
  }
  
  sendResponse({ success: true });
  break;
```

### Step 5: Simplify handleOpenCopart

Since we're no longer doing redirects, simplify:

```javascript
async function handleOpenCopart(data, sendResponse) {
  const { account } = data;
  const runId = generateRunId();
  const domain = 'copart.com';

  log('info', `[${runId}] Opening Copart account:`, account);

  try {
    // Fetch credentials
    const credData = await apiService.getCredentials('copart', account);
    
    if (!credData.success || !credData.data) {
      throw new Error(credData.message || 'Credentials not found');
    }

    const creds = credData.data;
    
    // Clear cookies
    await clearCopartCookies();
    
    // Store credentials for content script
    await chrome.storage.local.set({
      pendingLogin: {
        site: 'copart',
        username: creds.username,
        password: creds.password,
        timestamp: Date.now(),
        runId: runId
      }
    });
    
    // Initialize tab state
    const tab = await chrome.tabs.create({
      url: 'https://www.copart.com/login'
    });
    
    await setTabState(tab.id, domain, {
      state: TabState.ON_LOGIN_PAGE,
      runId: runId,
      attemptCount: 0,
      lastActionAt: Date.now()
    });
    
    log('info', `[${runId}] Tab ${tab.id} created, credentials stored`);
    
    // NO LISTENER NEEDED - content script handles everything
    // Just cleanup after timeout
    setTimeout(async () => {
      await chrome.storage.local.remove(['pendingLogin']);
      await clearNavigationHistory(tab.id, domain);
    }, 60000); // 1 minute cleanup
    
    sendResponse({ success: true });
  } catch (error) {
    log('error', `[${runId}] Error:`, error.message);
    sendResponse({ success: false, error: error.message });
  }
}
```

## Key Differences from Old Approach

| Old (Form Filling) | New (Direct API) |
|--------------------|------------------|
| Wait for DOM | Immediate execution |
| Fill form fields | POST JSON payload |
| Submit form | Direct fetch request |
| Wait for redirect | Reload on success |
| Multiple navigations | Single request |
| Loop-prone | Loop-proof |
| Fragile (UI changes) | Robust (API stable) |

## Expected Flow

1. User clicks "COPART I"
2. Background fetches credentials
3. Background opens `/login` tab
4. Content script extracts CSRF token
5. Content script POSTs to `/processLogin`
6. Server returns success
7. Content script reloads page
8. User sees logged-in dashboard
9. ✅ DONE - No loops, no redirects

## Testing

**Expected logs**:
```
[AAS-CS] [runId-123] Starting Direct API Auth...
[AAS-CS] [runId-123] Extracting CSRF token from page...
[AAS-CS] [runId-123] CSRF Token extracted successfully
[AAS-CS] [runId-123] Sending authentication request to /processLogin...
[AAS-CS] [runId-123] Response status: 200
[AAS-CS] [runId-123] ✅ Authentication successful! Reloading page...
(page reloads)
(user sees dashboard)
```

## Benefits

1. ✅ No form filling = no DOM waiting
2. ✅ No redirects = no navigation loops
3. ✅ Single request = fast and clean
4. ✅ Immune to UI changes
5. ✅ Standard browser behavior (fetch + reload)
6. ✅ Navigation gate not even needed (no automatic navigation)

This is the **industry standard** approach for browser automation.
