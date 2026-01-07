/**
 * Copart UI Restrictions - FULL COPY FROM EXAMPLE
 * Source: EXAMPLE/cjlmblcipnoclbbgeelpefcdjdaekhnd/components/copartHandlers.js
 * Source: EXAMPLE/cjlmblcipnoclbbgeelpefcdjdaekhnd/modules/domManipulation.js
 * Source: EXAMPLE/cjlmblcipnoclbbgeelpefcdjdaekhnd/content_script.js
 */

// Track current page for SPA navigation
let currentPage = '';

/**
 * hideNavigationElements - FROM EXAMPLE copartHandlers.js lines 24-44
 * Removes navigation tabs and dropdown
 */
function hideNavigationElements() {
    const checkIfNavigationRenderedInterval = setInterval(checkIfNavigationRendered, 500);

    function checkIfNavigationRendered() {
        const lotsWonTab = document.querySelector('[data-uname="lotsWonSubTab"]');
        if (lotsWonTab) {
            clearInterval(checkIfNavigationRenderedInterval);

            // Change "Lots Won" to "Open Items"
            lotsWonTab.textContent = 'Open Items';
            lotsWonTab.setAttribute('href', './myBids/openItems/');

            // Remove navigation elements
            const elementsToRemove = [
                '[data-uname="lotsLostSubTab"]',
                '[data-uname="myOffersSubTab"]',
                '[data-uname="depositsSubTab"]',
                '[data-uname="fundsSubTab"]',
                '[data-uname="paymentsOptionSubTab"]',
                '[data-uname="locationsTab"]',
                '[data-uname="needHelpSubTabTertiary"]',
                '[data-uname="sellVehicleTab"]',
                '[data-uname="serviceSubTab"]',
                '#headerloggedInUserDropdown',
                '.user-dropdown-btn',
                '.bid-information-section',
                '[data-uname="lotsearchLothighbid"]'
            ];

            elementsToRemove.forEach(selector => {
                const el = document.querySelector(selector);
                if (el) el.remove();
            });
        }
    }
}

/**
 * cleanCopartDashboard - FROM EXAMPLE copartHandlers.js lines 47-57
 * Removes dashboard widgets
 */
function cleanCopartDashboard() {
    const checkIfDashboardRenderedInterval = setInterval(checkIfDashboardRendered, 500);

    function checkIfDashboardRendered() {
        const currentBids = document.getElementById('currentBids');
        if (currentBids) {
            clearInterval(checkIfDashboardRenderedInterval);

            const toRemove = ['currentBids', 'savedSearches', 'openItems'];
            toRemove.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
        }
    }
}

/**
 * hideMyBidsSection - FROM EXAMPLE copartHandlers.js lines 60-70
 * Hides mybids sidebar menu
 */
function hideMyBidsSection() {
    const checkIfMyBidsRenderedInterval = setInterval(checkIfMyBidsRendered, 500);

    function checkIfMyBidsRendered() {
        const mybidsMenu = document.querySelector('.mybids-menu');
        if (mybidsMenu) {
            clearInterval(checkIfMyBidsRenderedInterval);

            const sideMenu = document.querySelector('.col-sm-2.mybids-menu');
            if (sideMenu) sideMenu.remove();

            const results = document.querySelector('.col-sm-10.mybids-results');
            if (results) results.className = 'col-sm-12 mybids-results';
        }
    }
}

/**
 * Creates the loading overlay - shows while waiting for 500 items to load
 */
function showLoadingOverlay() {
    if (document.getElementById('aas-loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'aas-loading-overlay';
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
                Loading Data...
            </div>
            <div id="aas-loading-status" style="color: #64748b; font-size: 15px; margin-bottom: 24px;">
                Switching to 500 items view
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
    console.log('[AAS] Loading overlay shown - waiting for 500 items');
}

/**
 * Removes the loading overlay
 */
function hideLoadingOverlay() {
    const overlay = document.getElementById('aas-loading-overlay');
    if (overlay) {
        overlay.remove();
        console.log('[AAS] Loading overlay hidden - 500 items loaded');
    }
}

/**
 * Updates the loading status text
 */
function updateLoadingStatus(text) {
    const status = document.getElementById('aas-loading-status');
    if (status) status.textContent = text;
}

/**
 * unpaidInvoicesPageHandler - FROM EXAMPLE copartHandlers.js lines 73-101
 * Removes payment controls on unpaid invoices page
 * MODIFIED: Shows overlay while waiting for 500 items to load
 */
function unpaidInvoicesPageHandler() {
    // Show overlay immediately when entering unpaid invoices page
    showLoadingOverlay();

    const checkIfButtonsRenderedInterval = setInterval(checkIfButtonsRendered, 500);

    function checkIfButtonsRendered() {
        const buttons = document.querySelector('.unpaid-invoices-buttons');
        if (buttons) {
            clearInterval(checkIfButtonsRenderedInterval);

            // Remove elements
            const toRemove = [
                'copart-default-payment-selection',
                '.payment-summary',
                '.unpaid-invoices-buttons',
                '.payment-filter-dropdown',
                '.cprt-btn-yellow',
                '.deposits-icon',
                '.funds-icon'
            ];

            toRemove.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            // Set pagination to 500
            const paginatorSpan = document.querySelector('.p-paginator-rpp-options span');
            if (paginatorSpan && !paginatorSpan.textContent.includes('500')) {
                updateLoadingStatus('Opening pagination dropdown...');
                const paginationChangerInterval = setInterval(checkIfLoading, 500);

                function checkIfLoading() {
                    const loadingIcon = document.querySelector('.p-datatable-loading-icon');
                    if (!loadingIcon) {
                        clearInterval(paginationChangerInterval);

                        const dropdown = document.querySelector('.p-paginator-rpp-options');
                        if (dropdown) dropdown.click();

                        setTimeout(() => {
                            updateLoadingStatus('Selecting 500 items...');
                            const option500 = document.querySelector('[aria-label="500"]');
                            if (option500) {
                                option500.click();

                                // NOW wait for the data to ACTUALLY load after selecting 500
                                updateLoadingStatus('Loading 500 items...');
                                waitForDataToLoad();
                            } else {
                                // No 500 option found - hide overlay anyway
                                hideLoadingOverlay();
                            }
                        }, 500);
                    }
                }
            } else {
                // Already at 500 or no paginator - check if data is loaded
                waitForDataToLoad();
            }
        }
    }

    /**
     * Wait for data table to finish loading after switching to 500 items
     */
    function waitForDataToLoad() {
        console.log('[AAS] Waiting for data table to load...');

        const waitInterval = setInterval(() => {
            const loadingIcon = document.querySelector('.p-datatable-loading-icon');
            const paginatorSpan = document.querySelector('.p-paginator-rpp-options span');

            // Check if loading is done AND we have 500 selected
            if (!loadingIcon && paginatorSpan && paginatorSpan.textContent.includes('500')) {
                clearInterval(waitInterval);
                console.log('[AAS] ✅ Data loaded with 500 items pagination!');
                hideLoadingOverlay();
            }
        }, 300);

        // Safety timeout - don't wait forever (30 seconds max)
        setTimeout(() => {
            clearInterval(waitInterval);
            hideLoadingOverlay();
            console.log('[AAS] Loading timeout - hiding overlay anyway');
        }, 30000);
    }
}

/**
 * paymentHistoryPageHandler
 * Sets pagination to 500 on payment history page
 */
function paymentHistoryPageHandler() {
    const checkIfPageRenderedInterval = setInterval(checkIfPageRendered, 500);

    function checkIfPageRendered() {
        const paginatorSpan = document.querySelector('.p-paginator-rpp-options span');
        if (paginatorSpan) {
            clearInterval(checkIfPageRenderedInterval);

            // Remove deposits and funds icons
            const iconsToRemove = ['.deposits-icon', '.funds-icon'];
            iconsToRemove.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            // Set pagination to 500
            if (!paginatorSpan.textContent.includes('500')) {
                const paginationChangerInterval = setInterval(checkIfLoading, 500);

                function checkIfLoading() {
                    const loadingIcon = document.querySelector('.p-datatable-loading-icon');
                    if (!loadingIcon) {
                        clearInterval(paginationChangerInterval);

                        const dropdown = document.querySelector('.p-paginator-rpp-options');
                        if (dropdown) dropdown.click();

                        setTimeout(() => {
                            const option500 = document.querySelector('[aria-label="500"]');
                            if (option500) option500.click();
                        }, 500);
                    }
                }
            }
        }
    }
}

/**
 * hideNavigation - FROM EXAMPLE domManipulation.js lines 126-138
 * Hides navigation tabs and footer
 */
function hideNavigation() {
    const serviceTab = document.querySelector('[data-uname="serviceSubTab"]');
    const footer = document.querySelectorAll('.footer-column');

    if (serviceTab && footer.length > 0) {
        const toRemove = [
            '[data-uname="needHelpSubTabTertiary"]',
            '[data-uname="sellVehicleTab"]',
            '[data-uname="depositsSubTab"]',
            '[data-uname="fundsSubTab"]',
            '[data-uname="paymentsOptionSubTab"]',
            '[data-uname="serviceSubTab"]'
        ];

        toRemove.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.remove();
        });

        // Remove footer columns 5 and 6
        if (footer[4]) footer[4].remove();
        if (footer[5]) footer[5].remove();
    }
}

/**
 * Main manipulations function - FROM EXAMPLE content_script.js lines 19-76
 * Handles page-specific restrictions
 */
function manipulations() {
    const pathname = window.location.pathname.toLowerCase();
    const username = localStorage.getItem('username');

    // Only run on page change (SPA navigation)
    if (currentPage !== pathname) {
        currentPage = pathname;

        const targetUrl = 'https://www.copart.com/member-payments/unpaid-invoices';

        // Block Dashboard, MyBids, Deposits, Funds -> Redirect to Unpaid Invoices
        if (pathname.includes('/dashboard') ||
            pathname.includes('/mybids') ||
            pathname.includes('/deposits') ||
            pathname.includes('/funds')) {

            window.location.href = targetUrl;
            return;
        }

        // Redirect /lotswon
        if (pathname.includes('/lotswon')) {
            window.location.href = targetUrl;
            return;
        }

        // Redirect /lotslost
        if (pathname.includes('/lotslost')) {
            window.location.href = targetUrl;
            return;
        }

        // Redirect /myoffers
        if (pathname.includes('/myoffers')) {
            window.location.href = targetUrl;
            return;
        }

        // Unpaid Invoices - remove controls
        if (pathname.includes('/unpaid-invoices')) {
            unpaidInvoicesPageHandler();
        }

        // Payment History - set pagination to 500
        if (pathname.includes('/payment-history')) {
            paymentHistoryPageHandler();
        }

        // Payment Details - restrict for non-admin
        if (pathname.includes('/payment-details') && username !== 'usalogistics') {
            window.location.href = targetUrl;
            return;
        }
    }
}

/**
 * hideBidInformation
 * Hides the bid information panel (won lot details)
 */
function hideBidInformation() {
    const bidInfo = document.querySelector('.bid-information-section');
    if (bidInfo) {
        bidInfo.remove();
        console.log('[Copart] Removed bid information section');
    }
}

/**
 * Initialize Copart restrictions
 * Called by roleManager.js
 */
function initCopartHiding(config) {
    console.log('[Copart] Initializing FULL EXAMPLE-style UI restrictions');

    // Initial hide navigation
    hideNavigationElements();
    hideNavigation();

    // Initial manipulations
    manipulations();

    // Initial hide bid info
    hideBidInformation();

    // Set up interval for dynamic content (1 second like EXAMPLE)
    setInterval(() => {
        manipulations();
        hideNavigation();
        hideBidInformation();
    }, 1000);
}

// Make available globally
window.initCopartHiding = initCopartHiding;

// AUTO-RUN: Start hiding immediately (don't wait for roleManager)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Copart] Auto-initializing UI restrictions');
        initCopartHiding({});
    });
} else {
    console.log('[Copart] Auto-initializing UI restrictions (DOM ready)');
    initCopartHiding({});
}
