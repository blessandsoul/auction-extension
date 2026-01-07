// AAS - Content Script
// Reliable auto-login using chrome.storage.session
// Implements "Smart Fetch" logic for Copart with XSRF token support

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
    }).catch(() => { }); // Ignore if background not ready
}

// DOM-based login detection (more reliable than URL)
function isOnLoginPage() {
    // Check for login form elements
    const usernameField = document.querySelector('#username, input[name="username"], input[type="email"][name*="user"]');
    const passwordField = document.querySelector('#password, input[name="password"], input[type="password"]');
    const loginButton = document.querySelector('button[type="submit"], [data-uname="loginButton"], input[type="submit"]');

    return !!(usernameField && passwordField) || !!loginButton;
}

function isLoggedIn() {
    // Check for logged-in indicators
    const userMenu = document.querySelector('.user-menu, .account-menu, [class*="user-name"], [class*="logout"]');
    const dashboardElements = document.querySelector('[class*="dashboard"], [class*="member-payments"]');

    return !!(userMenu || dashboardElements);
}

(async function () {
    const currentUrl = window.location.href;
    const isCopartLogin = currentUrl.includes('copart.com/login');
    const isIAAILogin = currentUrl.includes('login.iaai.com');

    log('info', '========================================');
    log('info', 'Content script V3 (Production Debug) loaded');
    log('info', 'URL:', currentUrl.substring(0, 80));
    log('info', 'isCopartLogin:', isCopartLogin);
    log('info', 'isIAAILogin:', isIAAILogin);
    log('info', '========================================');

    // ============================================
    // PRIORITY 1: Handle Login (works without authentication)
    // ============================================
    if (isCopartLogin) {
        await handleCopartLogin();
    }

    // ============================================
    // PRIORITY 2: Apply UI Restrictions (requires authentication)
    // ============================================
    // ============================================
    // PRIORITY 2: Apply UI Restrictions (requires authentication)
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

    async function handleCopartLogin() {
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

        // Wait for page to be initially ready
        log('info', 'Waiting for page to load...');
        await new Promise(r => setTimeout(r, 2000));

        // Check for pending credentials in storage
        try {
            const result = await chrome.storage.local.get(['pendingLogin']);
            let pending = result.pendingLogin;
            let runId = pending?.runId || 'unknown';

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

                // Wait for login form to be fully loaded
                log('info', `[${runId}] Waiting for login form to be ready...`);
                const formReady = await waitForLoginForm();

                if (!formReady) {
                    log('error', `[${runId}] Login form did not load in time`);
                    return;
                }

                // SHOW OVERLAY IMMEDIATELY
                showOverlay();
                log('info', `[${runId}] Overlay shown`);

                log('info', `[${runId}] Executing Copart auto-login`);
                await executeCopartLogin(pending.username, pending.password, runId);

                // Clear credentials immediately to prevent reuse
                await chrome.storage.local.remove(['pendingLogin']);
                log('info', `[${runId}] Cleared pendingLogin from storage`);
            }
        } catch (e) {
            log('error', 'Content script error:', e.message, e.stack);
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

    // Helper function to wait for login form
    async function waitForLoginForm() {
        const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds max
        for (let i = 0; i < maxAttempts; i++) {
            const usernameInput = document.querySelector('#username, input[name="username"]');
            const passwordInput = document.querySelector('#password, input[name="password"]');

            if (usernameInput && passwordInput) {
                log('info', '✓ Login form is ready');
                return true;
            }

            log('info', `Waiting for form... attempt ${i + 1}/${maxAttempts}`);
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    // ========================================
    // NO UI RESTRICTIONS - DEFAULT SITE VIEW
    // ========================================
    async function applyUserInterfaceSettings() {
        // DO NOTHING - show default site
        console.log('[AAS] No UI restrictions applied - default view');
    }

})();

// Create and inject overlay
function showOverlay() {
    if (document.getElementById('aas-auth-overlay')) return;

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
        flex-direction: column;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Lucide Lock Icon
    const lockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

    overlay.innerHTML = `
        <div style="background: white; padding: 40px 60px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; display: flex; flex-direction: column; align-items: center;">
            <div style="margin-bottom: 20px;">${lockIcon}</div>
            <h2 style="color: #1e293b; margin: 0 0 10px 0; font-weight: 700; font-size: 24px;">AAS</h2>
            <p style="color: #64748b; margin: 0 0 24px 0; font-size: 16px;">Securely Authenticating...</p>
            <div style="width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top: 3px solid #2563eb; border-radius: 50%; animation: aas-spin 1s linear infinite;"></div>
        </div>
        <style>
            @keyframes aas-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    (document.documentElement || document.body).appendChild(overlay);
}

// Function to extract CSRF token from head
function getCopartCsrfToken() {
    // Look for: csrfToken: "..." in any script tag or head content
    const htmlContent = document.documentElement.innerHTML;
    const match = htmlContent.match(/csrfToken:\s*"(?<token>.*?)"/);
    return match?.groups?.token || "";
}

// Helper to wait for element
function waitForElement(selector, timeout = 10000) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

// Copart login: Try Smart Fetch first, then Form Fill
async function executeCopartLogin(username, password, runId = 'unknown') {
    log('info', `[${runId}] Starting Copart login process...`);

    // Check if Copart has blocked access (Imperva/Incapsula security)
    const pageText = document.body.innerText || '';
    if (pageText.includes('Access denied') || pageText.includes('Error 15') ||
        pageText.includes('security service') || pageText.includes('Imperva')) {
        log('error', `[${runId}] ⚠️ COPART SECURITY BLOCK DETECTED`);
        log('error', `[${runId}] Copart has blocked automated access from this IP`);
        log('error', `[${runId}] Solutions: 1) Wait 10 minutes, 2) Change IP/VPN, 3) Clear cookies`);

        // Update overlay to show error
        const overlay = document.getElementById('aas-auth-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <h2 style="color: #dc2626; margin-bottom: 16px;">Security Block Detected</h2>
                    <p style="color: #6b7280; margin-bottom: 24px; max-width: 400px;">
                        Copart has temporarily blocked automated access from your IP address.
                    </p>
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
                        <p style="font-weight: 600; margin-bottom: 8px;">Solutions:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #6b7280;">
                            <li>Wait 10-15 minutes before trying again</li>
                            <li>Use a VPN to change your IP address</li>
                            <li>Clear all Copart cookies and try again</li>
                        </ul>
                    </div>
                    <button onclick="window.location.reload()" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Reload Page</button>
                </div>
            `;
        }
        return;
    }

    // 1. Try Smart Fetch (API injection VIA BACKGROUND)
    try {
        const csrfToken = getCopartCsrfToken();
        log('info', `[${runId}] CSRF Token search result:`, csrfToken ? 'FOUND' : 'NOT FOUND');

        if (csrfToken) {
            log('info', `[${runId}] CSRF Token found, attempting API login via Background...`);

            // Ask background to perform the fetch to avoid CORS/Network issues in content script
            const response = await chrome.runtime.sendMessage({
                action: 'EXECUTE_COPART_LOGIN_API',
                data: { username, password, token: csrfToken }
            });

            log('info', `[${runId}] Background API call response:`, response?.success ? 'SUCCESS' : 'FAILED');

            if (response && response.success && response.data) {
                const json = response.data;
                log('info', `[${runId}] API Response received:`, JSON.stringify(json).substring(0, 100));

                if (!json.error) {
                    log('info', `[${runId}] API Login SUCCESS!`);
                    // Redirect manually since we are in content script
                    if (json.returnUrl) {
                        log('info', `[${runId}] Redirecting to:`, json.returnUrl);
                        window.location.href = json.returnUrl;
                    } else {
                        log('info', `[${runId}] Redirecting to default: member-payments`);
                        window.location.href = 'https://www.copart.com/member-payments';
                    }
                    return; // Done
                } else {
                    log('warn', `[${runId}] API Login returned error:`, json);
                }
            } else {
                log('warn', `[${runId}] Background fetch failed or returned error:`, response?.error);
            }
        } else {
            log('warn', `[${runId}] CSRF Token NOT found, skipping API login`);
        }
    } catch (e) {
        log('error', `[${runId}] API Login error:`, e.message, e.stack);
    }

    // 2. Fallback: Form Fill (The original method) with WAITING
    log('info', `[${runId}] Fallback to Form Fill...`);

    // Wait for the username field to appear
    const usernameInput = await waitForElement('#username, input[name="username"]', 5000);

    if (usernameInput) {
        // We found the username, assume password is nearby
        const passwordInput = document.querySelector('#password') || document.querySelector('input[name="password"]');

        if (passwordInput) {
            log('info', `[${runId}] Login form found, injecting credentials...`);

            // Fill username
            usernameInput.value = username;
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Fill password
            passwordInput.value = password;
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

            await new Promise(r => setTimeout(r, 500));

            // Click submit
            const submitBtn = document.querySelector('button[type="submit"]') ||
                document.querySelector('[data-uname="loginButton"]');

            if (submitBtn) {
                log('info', `[${runId}] Clicking submit button`);
                submitBtn.click();
            } else {
                // Try form submit
                const form = document.querySelector('form');
                if (form) {
                    log('info', `[${runId}] Submitting form directly`);
                    form.submit();
                }
            }
        } else {
            log('error', `[${runId}] Password input not found!`);
        }
    } else {
        log('error', `[${runId}] Login form not found (timeout)!`);
    }
}

// (Removed client-side UI hiding to prevent flash of content. Handled by background script via insertCSS)
