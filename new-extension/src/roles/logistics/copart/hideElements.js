/**
 * Copart UI Hiding - Logistics Role
 * 
 * This script hides UI elements on Copart for the logistics role.
 * All financial, account, and bidding-related elements are hidden.
 */

/**
 * Configuration for elements to hide
 */
const COPART_HIDE_CONFIG = {
    // Pages to always hide (redirect to /notfound-error)
    alwaysHidePages: ['/bidders'],

    // Pages to hide for this role
    hidePages: [
        'accountinformation',
        'accountsetting',
        'messagesettings',
        'preferred-locations',
        'deposit',
        'payment-options',
        'funds',
        'lotswon',
        'lotslost',
        'mylots',
        'viewtype=transaction',
        'mybids',
        '/dashboard',
        'member-payments'
    ],

    // Pages to never hide (whitelist)
    neverHide: ['myoffers'],

    // CSS selectors for elements to remove
    elementsToRemove: [
        '[pref-code="lotDetailsPreference.widgets"][access-value="showSimilarVehicleAlert"]',
        '#currentBids .bid_menu',
        '#openItems .bid_menu',
        '#watchlist .bid_menu',
        '#paymentsDue .bid_menu',
        '.payment-summary',
        '.balance-due-button',
        '.payment-selection-button',
        'copart-default-payment-selection'
    ],

    // Selectors for payment page elements
    paymentPageElements: [
        '.price button',
        'table .p-checkbox-box'
    ]
};

/**
 * Check if URL matches any path in the list
 */
function urlMatchesPath(url, paths) {
    const lowerUrl = url.toLowerCase();
    return paths.some(path => lowerUrl.includes(path.toLowerCase()));
}

/**
 * Check if current page should be hidden
 */
function shouldHidePage(url) {
    if (urlMatchesPath(url, COPART_HIDE_CONFIG.neverHide)) {
        return false;
    }
    if (urlMatchesPath(url, COPART_HIDE_CONFIG.alwaysHidePages)) {
        return true;
    }
    return urlMatchesPath(url, COPART_HIDE_CONFIG.hidePages);
}

/**
 * Hide navigation links that point to hidden pages
 */
function hideNavigationLinks() {
    document.querySelectorAll('a').forEach(link => {
        const href = link.href;
        if (!href) return;

        if (urlMatchesPath(href, COPART_HIDE_CONFIG.neverHide)) return;

        if (urlMatchesPath(href, COPART_HIDE_CONFIG.alwaysHidePages) ||
            urlMatchesPath(href, COPART_HIDE_CONFIG.hidePages)) {
            const parent = link.parentNode;
            if (parent && parent.nodeName === 'SPAN') {
                parent.remove();
            } else {
                link.remove();
            }
        }
    });
}

/**
 * Redirect if on a hidden page
 */
function redirectIfHiddenPage() {
    const currentUrl = window.location.href;
    if (shouldHidePage(currentUrl)) {
        window.location.href = '/notfound-error';
    }
}

/**
 * Remove specific DOM elements
 */
function removeElements() {
    COPART_HIDE_CONFIG.elementsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            const parent = el.parentElement;
            if (parent && (selector.includes('.bid_menu'))) {
                parent.remove();
            } else {
                el.remove();
            }
        });
    });

    // Payment page specific elements
    if (window.location.href.includes('member-payments/unpaid-invoices')) {
        COPART_HIDE_CONFIG.paymentPageElements.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });

        // Remove buttons with currency amounts
        document.querySelectorAll('button').forEach(btn => {
            if (btn.querySelector('.currencyAmount')) {
                btn.remove();
            }
        });
    }
}

/**
 * Initialize Copart hiding
 */
function initCopartHiding(config) {
    if (!config) return;

    console.log('[Copart] Initializing logistics role hiding');

    // Initial cleanup
    removeElements();
    hideNavigationLinks();

    // Set up interval for dynamic content
    setInterval(() => {
        removeElements();
        hideNavigationLinks();
        if (config.hidePages) {
            redirectIfHiddenPage();
        }
    }, 500);
}

// Make available globally for roleManager
window.initCopartHiding = initCopartHiding;
