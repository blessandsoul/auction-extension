/**
 * IAAI UI Restrictions - COPIED FROM EXAMPLE
 * Based on: EXAMPLE/cjlmblcipnoclbbgeelpefcdjdaekhnd/content_script.js
 * Lines 93-135
 */

/**
 * Apply IAAI restrictions
 * Copied from EXAMPLE content_script.js lines 130-135
 */
function applyIAAIRestrictions() {
    const pathname = window.location.pathname.toLowerCase();
    const username = localStorage.getItem('username');
    const host = window.location.host;

    // Redirect these pages for non-usalogistics users
    if (
        (pathname.includes('/titleinstructions') ||
            pathname.includes('/licenses') ||
            pathname.includes('/user') ||
            pathname.includes('/notifications')) &&
        host.includes('iaai.com') &&
        username !== 'usalogistics'
    ) {
        window.location.href = 'https://iaai.com';
        return;
    }
}

/**
 * Show purchase history for usalogistics
 * Copied from EXAMPLE content_script.js line 127
 */
function showPurchaseHistoryForAdmin() {
    const pathname = window.location.pathname.toLowerCase();
    const username = localStorage.getItem('username');

    if (pathname.includes('/purchasehistory') && username === 'usalogistics') {
        const rows = document.querySelectorAll('#divPurchaseHistoryList .table-row');
        rows.forEach(row => {
            row.style.setProperty('display', 'table-row', 'important');
        });
    }
}

/**
 * Hide user profile element in header
 * Removes the user name, avatar, dropdown menu, and specifically the Profile link
 */
function hideUserProfileElement() {
    // Remove the whole user block
    const headerUser = document.querySelector('.header__user');
    if (headerUser) {
        headerUser.remove();
    }

    // Also target specific Profile link elements to be sure
    const profileItems = document.querySelectorAll('a[href="/User"], #ProfileMenuProfileDropdown');
    profileItems.forEach(el => el.remove());
}

/**
 * Hide action area and bidding buttons
 * Removes Pre-Bid buttons, Buy Now buttons, Cost Calculator, Watch buttons, and Bid Data
 */
function hideActionArea() {
    const selectorsToRemove = [
        '.btn--pre-bid',                 // Pre-Bid buttons
        '.action-area__content',         // Main action area container
        '.action-area__bid-data',        // Bid data block
        '.action-area__cost-calculator', // Cost Calculator
        '.action-area__watch-btn',       // Watch buttons
        '.action-btn-container',         // Bidding buttons container
        '.action-area__secondary-info'   // Secondary info (Current Bid, Buy Now Price)
    ];

    selectorsToRemove.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
}

/**
 * Initialize IAAI restrictions
 * Called by roleManager.js
 */
async function initIAAIHiding(config) {
    console.log('[IAAI] Initializing EXAMPLE-style UI restrictions');

    // Apply restrictions immediately
    applyIAAIRestrictions();

    // Hide user profile element
    hideUserProfileElement();

    // Hide action area and bidding buttons
    hideActionArea();

    // Show purchase history for admin
    showPurchaseHistoryForAdmin();

    // Set up interval for dynamic content
    setInterval(() => {
        showPurchaseHistoryForAdmin();
        hideUserProfileElement(); // Keep checking in case element is re-added
        hideActionArea();         // Keep checking for dynamic content
    }, 500);
}

// Make available globally for roleManager
window.initIAAIHiding = initIAAIHiding;
