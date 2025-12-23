// AAS - Content Script V4 - Direct API Authentication
// No form filling, direct POST to /processLogin endpoint

// Logging helper with timestamp that also sends to background for persistence
function log(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[AAS-CS ${timestamp}]`;
    const message = args.join(' ');
    
    if (level === 'error') {
        console.error(prefix, ...args);
    } else if (level === 'warn') {
        console.warn(prefix, ...args);
    } else {
        console.log(prefix, ...args);
    }
    
    // Send to background for persistence (survives page reload)
    chrome.runtime.sendMessage({
        action: 'LOG_FROM_CONTENT',
        data: { level, message }
    }).catch(() => {}); // Ignore if background not ready
}

// Generate runId if needed
function generateRunId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

(async function () {
    const currentUrl = window.location.href;
    const isCopartLogin = currentUrl.includes('copart.com/login');
    const isIAAILogin = currentUrl.includes('login.iaai.com');

    log('info', '========================================');
    log('info', 'Content script V4 (Direct API Auth) loaded');
    log('info', 'URL:', currentUrl.substring(0, 80));
    log('info', 'isCopartLogin:', isCopartLogin);
    log('info', 'isIAAILogin:', isIAAILogin);
    log('info', '========================================');

    // ============================================
    // PRIORITY 1: Handle Login (Direct API Method)
    // ============================================
    if (isCopartLogin) {
        await handleCopartDirectAPILogin();
    }

    // ============================================
    // PRIORITY 2: Apply UI Restrictions
    // ============================================
    applyUserInterfaceSettings();

    // SAFETY: If we are on a dashboard page, force remove the overlay immediately
    if (window.location.href.includes('member-payments') || window.location.href.includes('dashboard')) {
        console.log('[AAS] Dashboard detected - forcing overlay removal');
        const overlay = document.getElementById('usalogistics-overlay');
        const hideStyle = document.getElementById('usalogistics-hide-style');
        if (overlay) overlay.remove();
        if (hideStyle) hideStyle.remove();
        document.documentElement.style.visibility = 'visible';
        document.body.style.visibility = 'visible';
    }

    /**
     * Direct API Authentication for Copart
     * Bypasses form filling in favor of direct network request to /processLogin
     */
    async function attemptDirectCopartLogin(username, password, runId) {
        log('info', `[${runId}] 🚀 Starting Direct API Authentication...`);

        try {
            // 1. Extract CSRF Token (CRITICAL for Copart security)
            log('info', `[${runId}] Extracting CSRF token from page head...`);
            const headText = document.head.textContent;
            const tokenMatch = headText.match(/csrfToken:.*?"(?<token>.*?)"/s);
            
            if (!tokenMatch || !tokenMatch.groups || !tokenMatch.groups.token) {
                log('error', `[${runId}] ❌ Failed to extract CSRF Token`);
                return { success: false, error: 'CSRF_MISSING' };
            }
            
            const csrfToken = tokenMatch.groups.token;
            log('info', `[${runId}] ✅ CSRF Token extracted: ${csrfToken.substring(0, 10)}...`);

            // 2. Prepare Payload (Copart standard format)
            const payload = JSON.stringify({
                accountType: 0,
                accountTypeValue: 0,
                username: username,
                password: password
            });

            log('info', `[${runId}] 📤 Sending authentication request to /processLogin...`);

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
                credentials: "include" // CRITICAL: Saves session cookies
            });

            log('info', `[${runId}] 📥 Response status: ${response.status}`);

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
                
                // Reload to apply session cookies and show logged-in view
                window.location.reload();
                return { success: true };
            } else {
                const errorMsg = data.data?.error || data.error || 'UNKNOWN_ERROR';
                log('error', `[${runId}] ❌ Authentication failed: ${errorMsg}`);
                return { success: false, error: errorMsg };
            }

        } catch (err) {
            log('error', `[${runId}] ❌ Network error:`, err.message);
            return { success: false, error: 'NETWORK_ERROR' };
        }
    }

    async function handleCopartDirectAPILogin() {
        // PERSISTENT IDEMPOTENT GUARD: Check chrome.storage.session (survives crashes)
        const tabId = await getCurrentTabId();
        const sessionKey = `aas_login_attempted_${tabId}`;
        
        try {
            const result = await chrome.storage.session.get(sessionKey);
            if (result[sessionKey] === true) {
                log('warn', 'Login already attempted on this tab (persistent guard), skipping');
                return;
            }
        } catch (e) {
            log('warn', 'chrome.storage.session not available, falling back to sessionStorage');
        }
        
        // Also check sessionStorage as fallback
        const alreadyRan = sessionStorage.getItem('aas_login_attempted');
        if (alreadyRan === 'true') {
            log('warn', 'Login already attempted on this page (sessionStorage guard), skipping');
            return;
        }
        
        log('info', 'On Copart login page, checking for pending credentials...');
        
        try {
            const result = await chrome.storage.local.get(['pendingLogin']);
            let pending = result.pendingLogin;
            let runId = pending?.runId || generateRunId();

            log('info', `[${runId}] Checking storage for credentials...`);
            log('info', `[${runId}] Storage result:`, pending ? 'FOUND' : 'EMPTY');

            // If not found in storage, ASK background (Pull method - reliable for Incognito)
            if (!pending) {
                log('info', `[${runId}] Storage empty, asking background for credentials...`);
                try {
                    const response = await chrome.runtime.sendMessage({ action: 'GET_LOGIN_DATA' });
                    log('info', `[${runId}] Background response:`, response?.success ? 'SUCCESS' : 'FAILED');
                    
                    if (response && response.success && response.data) {
                        log('info', `[${runId}] Received credentials from background!`);
                        pending = response.data;
                        runId = pending.runId || runId;
                    } else {
                        log('info', `[${runId}] No credentials available from background`);
                        return;
                    }
                } catch (err) {
                    log('error', `[${runId}] Background communication failed:`, err.message);
                    return;
                }
            }

            if (!pending) {
                log('info', `[${runId}] No credentials found anywhere, skipping auto-login`);
                return;
            }

            log('info', `[${runId}] Found pending login for site:`, pending.site);

            if (pending.site === 'copart') {
                // Mark as attempted BEFORE doing anything (both persistent and session)
                try {
                    await chrome.storage.session.set({ [sessionKey]: true });
                    log('info', `[${runId}] Set chrome.storage.session guard`);
                } catch (e) {
                    log('warn', `[${runId}] Could not set session storage guard:`, e.message);
                }
                
                sessionStorage.setItem('aas_login_attempted', 'true');
                log('info', `[${runId}] Set sessionStorage flag to prevent re-run`);
                
                // Show overlay
                showOverlay();
                log('info', `[${runId}] Overlay shown`);
                
                // Execute DIRECT API login (no form filling, no DOM waiting)
                log('info', `[${runId}] Executing Direct API Authentication...`);
                const loginResult = await attemptDirectCopartLogin(pending.username, pending.password, runId);
                
                if (!loginResult.success) {
                    log('error', `[${runId}] Direct API login failed:`, loginResult.error);
                    hideOverlay();
                    
                    // Show user-friendly error
                    const errorMessages = {
                        'CSRF_MISSING': 'Could not extract security token from page. Please try again.',
                        'BAD_CREDENTIALS': 'Invalid username or password.',
                        'NETWORK_ERROR': 'Network error. Please check your connection.',
                        'UNKNOWN_ERROR': 'Login failed. Please try again.'
                    };
                    
                    alert(`AAS Login Failed\n\n${errorMessages[loginResult.error] || loginResult.error}`);
                }
                
                // Clear credentials immediately to prevent reuse
                await chrome.storage.local.remove(['pendingLogin']);
                log('info', `[${runId}] Cleared pendingLogin from storage`);
            }
        } catch (e) {
            log('error', 'Content script error:', e.message, e.stack);
            hideOverlay();
        }
    }

    // Helper to get current tab ID
    async function getCurrentTabId() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            return tabs[0]?.id || 0;
        } catch (e) {
            return 0;
        }
    }

    // Overlay functions
    function showOverlay() {
        const existing = document.getElementById('aas-auth-overlay');
        if (existing) return;

        const overlay = document.createElement('div');
        overlay.id = 'aas-auth-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        overlay.innerHTML = `
            <div style="background: white; padding: 48px 64px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); text-align: center;">
                <div style="color: #1e293b; font-size: 22px; font-weight: 700; margin-bottom: 16px;">
                    AAS Authenticating...
                </div>
                <div style="color: #64748b; font-size: 15px; margin-bottom: 24px;">
                    Please wait
                </div>
                <div style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto;"></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function hideOverlay() {
        const overlay = document.getElementById('aas-auth-overlay');
        if (overlay) overlay.remove();
    }

    async function applyUserInterfaceSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'GET_USER_SETTINGS' });

            if (response && response.success && response.role === 'logistics') {
                console.log('[AAS] Logistics Role Detected - applying robust DOM hiding...');

                const hideRestrictedElements = () => {
                    // Hide Financial Dashboard & "Default payment type" area
                    const keywords = [
                        'Your deposits', 'Unapplied funds', 'Buying power', 'Overdue amount', 'Current balance',
                        'Default payment type', 'Wire transfer'
                    ];
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

                    let node;
                    while (node = walker.nextNode()) {
                        if (node.nodeValue && keywords.some(k => node.nodeValue.includes(k))) {
                            if (node.nodeValue.includes('Wire transfer') && !node.nodeValue.includes('Default payment type')) {
                                continue;
                            }

                            const container = node.parentElement.closest('.border') ||
                                node.parentElement.closest('.row') ||
                                node.parentElement.closest('.payment-summary-mobile') ||
                                node.parentElement.closest('.p-d-flex.p-jc-between');

                            if (container) {
                                container.style.setProperty('display', 'none', 'important');
                                let next = container.nextElementSibling;
                                if (next && (next.classList.contains('cprt-dropdown') || next.tagName === 'P-DROPDOWN')) {
                                    next.style.setProperty('display', 'none', 'important');
                                }
                            }
                        }
                    }
                };

                hideRestrictedElements();
                const observer = new MutationObserver(hideRestrictedElements);
                observer.observe(document.body, { childList: true, subtree: true });
            }
        } catch (e) {
            console.log('[AAS] Could not apply UI settings:', e.message);
        }
    }

})();
