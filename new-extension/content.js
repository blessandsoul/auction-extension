// AAS - Content Script
// Reliable auto-login using chrome.storage.session
// Implements "Smart Fetch" logic for Copart with XSRF token support

(async function () {
    const currentUrl = window.location.href;
    const isCopartLogin = currentUrl.includes('copart.com/login');
    const isIAAILogin = currentUrl.includes('login.iaai.com');

    console.log('[AAS] ========================================');
    console.log('[AAS] Content script V2 (Cross-Profile) loaded');
    console.log('[AAS] URL:', currentUrl.substring(0, 60));
    console.log('[AAS] ========================================');

    // ============================================
    // PRIORITY 1: Handle Login (works without authentication)
    // ============================================
    if (isCopartLogin) {
        await handleCopartLogin();
    }

    // ============================================
    // PRIORITY 2: Apply UI Restrictions (requires authentication)
    // ============================================
    applyUserInterfaceSettings();

    async function handleCopartLogin() {
        console.log('[AAS] On Copart login page, checking for pending credentials...');
        
        // Wait for page to be initially ready
        console.log('[AAS] Waiting for page to load...');
        await new Promise(r => setTimeout(r, 2000));

        // Check for pending credentials in storage
        try {
            const result = await chrome.storage.local.get(['pendingLogin']);
            let pending = result.pendingLogin;

            // If not found in storage, ASK background (Pull method - reliable for Incognito)
            if (!pending) {
                console.log('[AAS] Storage empty, asking background for credentials...');
                try {
                    const response = await chrome.runtime.sendMessage({ action: 'GET_LOGIN_DATA' });
                    if (response && response.success && response.data) {
                        console.log('[AAS] Received credentials from background!');
                        pending = response.data;
                    } else {
                        console.log('[AAS] No credentials available');
                        return;
                    }
                } catch (err) {
                    console.log('[AAS] Background communication failed:', err);
                    return;
                }
            }

            if (!pending) {
                console.log('[AAS] No credentials found, skipping auto-login');
                return;
            }

            console.log('[AAS] Found pending login for:', pending.site);

            if (pending.site === 'copart') {
                // Wait for login form to be fully loaded
                console.log('[AAS] Waiting for login form to be ready...');
                const formReady = await waitForLoginForm();
                
                if (!formReady) {
                    console.error('[AAS] Login form did not load in time');
                    return;
                }

                // SHOW OVERLAY IMMEDIATELY
                showOverlay();

                console.log('[AAS] Executing Copart auto-login');
                await executeCopartLogin(pending.username, pending.password);
                // Clear credentials immediately to prevent reuse
                await chrome.storage.local.remove(['pendingLogin']);
            }
        } catch (e) {
            console.error('[AAS] Content script error:', e);
        }
    }

    // Helper function to wait for login form
    async function waitForLoginForm() {
        const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds max
        for (let i = 0; i < maxAttempts; i++) {
            const usernameInput = document.querySelector('#username, input[name="username"]');
            const passwordInput = document.querySelector('#password, input[name="password"]');
            
            if (usernameInput && passwordInput) {
                console.log('[AAS] ✓ Login form is ready');
                return true;
            }
            
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    async function applyUserInterfaceSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'GET_USER_SETTINGS' });

            if (response && response.success && response.role === 'logistics') {
                console.log('[AAS] Logistics Role Detected - applying robust DOM hiding...');

                const hideRestrictedElements = () => {
                    // 1. Hide Financial Dashboard & "Default payment type" area (Text & Structural)
                    const keywords = [
                        'Your deposits', 'Unapplied funds', 'Buying power', 'Overdue amount', 'Current balance',
                        'Default payment type', 'Wire transfer'
                    ];
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

                    let node;
                    while (node = walker.nextNode()) {
                        if (node.nodeValue && keywords.some(k => node.nodeValue.includes(k))) {
                            // Careful with "Wire transfer" - it might be in the table. 
                            // Only hide if it looks like a header/widget context.
                            if (node.nodeValue.includes('Wire transfer') && !node.nodeValue.includes('Default payment type')) {
                                continue;
                            }

                            // Find the appropriate container to hide
                            const container = node.parentElement.closest('.border') ||
                                node.parentElement.closest('.row') ||
                                node.parentElement.closest('.payment-summary-mobile') ||
                                node.parentElement.closest('.p-d-flex.p-jc-between'); // Default payment type container often uses flex

                            if (container) {
                                container.style.setProperty('display', 'none', 'important');
                                // Also hide immediately adjacent siblings if they are related (like the dropdown next to the label)
                                let next = container.nextElementSibling;
                                if (next && (next.classList.contains('cprt-dropdown') || next.tagName === 'P-DROPDOWN')) {
                                    next.style.setProperty('display', 'none', 'important');
                                }
                            }

                            // Specific handling for "Default payment type" label directly
                            if (node.nodeValue.includes('Default payment type')) {
                                const span = node.parentElement;
                                if (span) {
                                    span.style.setProperty('display', 'none', 'important');
                                    // Hide the pencil icon and dropdown next to it
                                    let sibling = span.nextElementSibling;
                                    while (sibling) {
                                        sibling.style.setProperty('display', 'none', 'important');
                                        sibling = sibling.nextElementSibling;
                                    }
                                }
                            }
                        }
                    }

                    // 2. Hide Action Buttons (Buyer Pickup / Transporter / Export) - ONLY in toolbar, NOT in table
                    const actionSelectors = [
                        'buyer-pickup',
                        'copart-vps-scheduling',
                        'copart-order-delivery',
                        '.export-csv-button',
                        'send-to-transporter'
                    ];
                    actionSelectors.forEach(sel => {
                        document.querySelectorAll(sel).forEach(el => {
                            // Only hide if NOT inside a table row (tr) or table cell (td)
                            if (!el.closest('tr') && !el.closest('td') && !el.closest('p-table')) {
                                el.style.setProperty('display', 'none', 'important');
                            }
                        });
                    });

                    // 3. Hide Notification Bell & Language Selector (Aggressive)
                    const headerButtons = document.querySelectorAll(
                        'button[aria-label="toggle notifications view"], .header-icon-unread-notification, .fa-bell, button[data-uname="homepageLanguageselect"], .language_select'
                    );
                    headerButtons.forEach(btn => {
                        btn.style.setProperty('display', 'none', 'important');
                        const parentLi = btn.closest('li');
                        if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
                    });

                    // 4. Hide "Pay Invoice" Button (Only the specific one in header, not table buttons)
                    document.querySelectorAll('.cprt-btn-yellow').forEach(btn => {
                        if (btn.innerText && btn.innerText.includes('Pay invoice')) {
                            btn.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // 5. Hide SPECIFIC Dropdowns (by aria-label, NOT all dropdowns)
                    const dropdownLabels = ['Wire transfer', 'Invoice status', 'USD', 'Debit card'];
                    document.querySelectorAll('.cprt-dropdown, .p-dropdown').forEach(el => {
                        const label = el.querySelector('[aria-label]');
                        const ariaLabel = label ? label.getAttribute('aria-label') : el.getAttribute('aria-label');
                        if (ariaLabel && dropdownLabels.includes(ariaLabel)) {
                            el.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // 6. Hide Date Range Picker (but not other mat-form-fields like search)
                    document.querySelectorAll('.cprt-date-range, copart-date-range-fiter').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // 7. Hide Left Sidebar Navigation
                    document.querySelectorAll('mat-sidenav, #sidenav, .mat-sidenav, .payment-nav-icons').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // 8. Stretch Content to Full Width (after hiding sidebar)
                    document.querySelectorAll('.mat-sidenav-content, .mat-drawer-content, mat-sidenav-content').forEach(el => {
                        el.style.setProperty('margin-left', '0', 'important');
                        el.style.setProperty('width', '100%', 'important');
                    });

                    // 9. Hide Navigation Menu Items
                    const menuItemsToHide = [
                        'Dashboard', 'Driver\'s seat', 'Inventory', 'Auctions',
                        'Bid status', 'Locations', 'Sell your car', 'Services & support'
                    ];

                    // Hide by data-uname attributes
                    const dataUnameSelectors = [
                        'a[data-uname="homePageDashboardTab"]',
                        'a[data-uname="lotSummaryTab"]',
                        '[data-uname*="Inventory"]',
                        '[data-uname*="Auctions"]',
                        '[data-uname*="Bid"]',
                        '[data-uname*="Location"]',
                        '[data-uname*="SellYourCar"]',
                        'a[href*="driverseat"]',
                        'a[href*="locations"]',
                        'a[href*="sell-your-car"]'
                    ];

                    dataUnameSelectors.forEach(sel => {
                        document.querySelectorAll(sel).forEach(el => {
                            el.style.setProperty('display', 'none', 'important');
                            // Also hide parent li if exists
                            const parentLi = el.closest('li');
                            if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
                        });
                    });

                    // Hide by text content in navigation
                    document.querySelectorAll('.header-nav li, .main-nav li, nav li, .menu_click').forEach(el => {
                        const text = el.innerText.trim();
                        if (menuItemsToHide.some(item => text.includes(item))) {
                            el.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // 10. Hide Deposits and Funds from Payments dropdown (keep only due/history)
                    document.querySelectorAll('a[href*="/deposits"], a[href*="/funds"], a[title="Deposits"], a[title="Funds"]').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                        const parentLi = el.closest('li');
                        if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
                    });

                    // Also hide by text content
                    document.querySelectorAll('ul li a, .dropdown-menu li a').forEach(el => {
                        const text = el.innerText.trim();
                        if (text === 'Deposits' || text === 'Funds') {
                            el.style.setProperty('display', 'none', 'important');
                            const parentLi = el.closest('li');
                            if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // 11. Hide Help center
                    document.querySelectorAll('a[href*="help-center"], a[href*="helpcenter"]').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                        const parentLi = el.closest('li');
                        if (parentLi) parentLi.style.setProperty('display', 'none', 'important');
                    });

                    // Hide by text
                    document.querySelectorAll('.header-nav li, .main-nav li, nav li').forEach(el => {
                        if (el.innerText.trim().includes('Help center')) {
                            el.style.setProperty('display', 'none', 'important');
                        }
                    });

                    // 12. Insert Payment Buttons NEXT TO Search Inventory button
                    const createPaymentButtons = () => {
                        if (document.getElementById('aas-payment-buttons-container')) return;

                        // Find the Search Inventory button or header area
                        const searchBtn = document.querySelector('button[data-uname*="search"], .search-inventory-btn, [class*="search-btn"], .header-top .search-area, .header-search');
                        const headerRight = document.querySelector('.header-right, .header-top-right, .header-actions');

                        const container = document.createElement('div');
                        container.id = 'aas-payment-buttons-container';
                        container.style.cssText = `
                            display: inline-flex !important;
                            gap: 10px !important;
                            margin-left: 15px !important;
                            align-items: center !important;
                        `;

                        const dueBtn = document.createElement('a');
                        dueBtn.href = '/member-payments/unpaid-invoices';
                        dueBtn.innerText = 'Payments Due';
                        dueBtn.style.cssText = `
                            background: #2196F3 !important;
                            color: #fff !important;
                            padding: 8px 16px !important;
                            border-radius: 4px !important;
                            text-decoration: none !important;
                            font-weight: bold !important;
                            font-size: 13px !important;
                            white-space: nowrap !important;
                        `;

                        const historyBtn = document.createElement('a');
                        historyBtn.href = '/member-payments/payment-history';
                        historyBtn.innerText = 'Payment History';
                        historyBtn.style.cssText = `
                            background: #4CAF50 !important;
                            color: #fff !important;
                            padding: 8px 16px !important;
                            border-radius: 4px !important;
                            text-decoration: none !important;
                            font-weight: bold !important;
                            font-size: 13px !important;
                            white-space: nowrap !important;
                        `;

                        container.appendChild(dueBtn);
                        container.appendChild(historyBtn);

                        // Try to insert next to search button
                        if (searchBtn && searchBtn.parentElement) {
                            searchBtn.parentElement.insertBefore(container, searchBtn.nextSibling);
                        } else if (headerRight) {
                            headerRight.appendChild(container);
                        } else {
                            // Fallback: fixed position in top-right
                            container.style.cssText = `
                                position: fixed !important;
                                top: 15px !important;
                                right: 200px !important;
                                z-index: 999999 !important;
                                display: flex !important;
                                gap: 10px !important;
                            `;
                            document.body.appendChild(container);
                        }
                    };

                    if (document.body) createPaymentButtons();
                    else document.addEventListener('DOMContentLoaded', createPaymentButtons);

                    // 13. Hide entire navigation menu
                    document.querySelectorAll('.header-nav, #mobile-header-nav-links, .navbar-nav, nav.navbar, .mobile-nav').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // 14. Hide Bid Information Section
                    document.querySelectorAll('.bid-information-section, bid-information, dashboard-prelim-bid, #bid-information-ldp6-section').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });

                    // 15. Hide Watchlist Button - specific selectors only
                    document.querySelectorAll('#watchlistBtn, .watch-button, button.watch-button').forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                    });
                }; // END hideRestrictedElements

                // Run once
                if (document.body) hideRestrictedElements();

                // Run on mutations (SPA navigation / Dynamic loading)
                const observer = new MutationObserver((mutations) => {
                    hideRestrictedElements();
                });

                if (document.body) {
                    observer.observe(document.body, { childList: true, subtree: true });
                } else {
                    document.addEventListener('DOMContentLoaded', () => {
                        hideRestrictedElements();
                        observer.observe(document.body, { childList: true, subtree: true });
                    });
                }

                // 16. Auto-set Rows Per Page to 500 - Based on working COP-IAAI-EXT implementation
                // Use window-level flag to reset on actual page navigation
                if (typeof window.aasPaginationSet === 'undefined') {
                    window.aasPaginationSet = false;
                }

                const setPaginationTo500 = () => {
                    // Check if already set in this page session
                    const currentRpp = document.querySelector('.p-paginator-rpp-options span');
                    if (currentRpp && currentRpp.textContent.includes('500')) {
                        console.log('[AAS] Pagination already at 500');
                        window.aasPaginationSet = true;
                        return;
                    }
                    if (window.aasPaginationSet) {
                        console.log('[AAS] Pagination flag already set, skipping');
                        return;
                    }

                    console.log('[AAS] Starting pagination to 500...');

                    // Wait for table to stop loading
                    const checkIfLoading = setInterval(() => {
                        const loadingIcon = document.querySelector('.p-datatable-loading-icon');
                        const rppDropdown = document.querySelector('.p-paginator-rpp-options');

                        if (!loadingIcon && rppDropdown) {
                            clearInterval(checkIfLoading);
                            window.aasPaginationSet = true;

                            console.log('[AAS] Table loaded, clicking dropdown...');

                            // Click dropdown to open
                            rppDropdown.click();

                            // Wait for options to appear then click 500
                            setTimeout(() => {
                                const option500 = document.querySelector('[aria-label="500"]');
                                if (option500) {
                                    option500.click();
                                    console.log('[AAS] Set rows per page to 500');
                                } else {
                                    // Fallback: find max option
                                    const allOptions = document.querySelectorAll('.p-dropdown-item, p-dropdownitem li');
                                    let maxOpt = null;
                                    let maxVal = 0;
                                    allOptions.forEach(opt => {
                                        const val = parseInt(opt.textContent);
                                        if (!isNaN(val) && val > maxVal) {
                                            maxVal = val;
                                            maxOpt = opt;
                                        }
                                    });
                                    if (maxOpt) {
                                        maxOpt.click();
                                        console.log('[AAS] Set rows per page to', maxVal);
                                    } else {
                                        console.log('[AAS] No pagination options found');
                                    }
                                }
                            }, 500);
                        }
                    }, 500);

                    // Clear interval after 10 seconds to prevent infinite loop
                    setTimeout(() => clearInterval(checkIfLoading), 10000);
                };

                // Only run on unpaid invoices or payment history pages
                if (window.location.href.includes('member-payments')) {
                    // Reset flag on fresh page load
                    window.aasPaginationSet = false;
                    setTimeout(setPaginationTo500, 2000);
                }
            }
        } catch (e) {
            // console.warn('[AAS] UI Settings Check:', e);
        }
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
async function executeCopartLogin(username, password) {
    console.log('[AAS] Starting Copart login process...');

    // Check if Copart has blocked access (Imperva/Incapsula security)
    const pageText = document.body.innerText || '';
    if (pageText.includes('Access denied') || pageText.includes('Error 15') || 
        pageText.includes('security service') || pageText.includes('Imperva')) {
        console.error('[AAS] ⚠️ COPART SECURITY BLOCK DETECTED');
        console.error('[AAS] Copart has blocked automated access from this IP');
        console.error('[AAS] Solutions: 1) Wait 10 minutes, 2) Change IP/VPN, 3) Clear cookies');
        
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
        if (csrfToken) {
            console.log('[AAS] CSRF Token found, attempting API login via Background...');

            // Ask background to perform the fetch to avoid CORS/Network issues in content script
            const response = await chrome.runtime.sendMessage({
                action: 'EXECUTE_COPART_LOGIN_API',
                data: { username, password, token: csrfToken }
            });

            if (response && response.success && response.data) {
                const json = response.data;
                console.log('[AAS] API Response received:', json);

                if (!json.error) {
                    console.log('[AAS] API Login SUCCESS!');
                    // Redirect manually since we are in content script
                    if (json.returnUrl) {
                        window.location.href = json.returnUrl;
                    } else {
                        window.location.href = 'https://www.copart.com/member-payments';
                    }
                    return; // Done
                } else {
                    console.warn('[AAS] API Login returned error:', json);
                }
            } else {
                console.warn('[AAS] Background fetch failed or returned error:', response?.error);
            }
        } else {
            console.warn('[AAS] CSRF Token NOT found, skipping API login');
        }
    } catch (e) {
        console.error('[AAS] API Login error:', e);
    }

    // 2. Fallback: Form Fill (The original method) with WAITING
    console.log('[AAS] Fallback to Form Fill...');

    // Wait for the username field to appear
    const usernameInput = await waitForElement('#username, input[name="username"]', 5000);

    if (usernameInput) {
        // We found the username, assume password is nearby
        const passwordInput = document.querySelector('#password') || document.querySelector('input[name="password"]');

        if (passwordInput) {
            console.log('[AAS] Login form found, injecting credentials...');

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
                submitBtn.click();
            } else {
                // Try form submit
                const form = document.querySelector('form');
                if (form) form.submit();
            }
        } else {
            console.error('[AAS] Password input not found!');
        }
    } else {
        console.error('[AAS] Login form not found (timeout)!');
    }
}

// (Removed client-side UI hiding to prevent flash of content. Handled by background script via insertCSS)
