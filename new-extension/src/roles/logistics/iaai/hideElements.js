/**
 * IAAI UI Hiding - Logistics Role
 * 
 * This script hides UI elements on IAAI for the logistics role.
 * All financial, account, and purchase-related elements are hidden.
 */

/**
 * Configuration for elements to hide
 */
const IAAI_HIDE_CONFIG = {
    // Pages to always hide
    alwaysHidePages: ['/user'],

    // Pages to hide for this role
    hidePages: [
        '/lostvehicles',
        '/purchasehistory',
        '/titleinstructions'
        // NOTE: '/payment' and '/tobepickedup' REMOVED - these are landing pages after login
    ],

    // CSS selectors for elements to remove
    // NOTE: Removed #PaymentContainer and .sidebar - these are needed for the payment page
    elementsToRemove: [
        '#transactionalModal',
        '#myDashboardContainer',
        '#editContactPanel',
        '#dvLostVehiclesContent',
        '.segment-ctrl-container',
        '.tbp-total',
        '.table-th.checkbox',
        '.container-footer'
    ]
};

/**
 * Check if pathname matches any path in the list
 */
function pathMatchesList(pathname, paths) {
    const lowerPath = pathname.toLowerCase();
    return paths.some(path => lowerPath.includes(path.toLowerCase()));
}

/**
 * Check if current page should be hidden
 */
function shouldHidePage(pathname) {
    return pathMatchesList(pathname, IAAI_HIDE_CONFIG.alwaysHidePages) ||
        pathMatchesList(pathname, IAAI_HIDE_CONFIG.hidePages);
}

/**
 * Hide navigation links that point to hidden pages
 */
function hideNavigationLinks() {
    document.querySelectorAll('a').forEach(link => {
        const href = link.href || '';
        if (!href.startsWith('http')) return;

        try {
            const pathname = new URL(href).pathname.toLowerCase();

            if (pathMatchesList(pathname, IAAI_HIDE_CONFIG.alwaysHidePages) ||
                pathMatchesList(pathname, IAAI_HIDE_CONFIG.hidePages)) {
                const parent = link.parentNode;
                if (parent && parent.nodeName === 'LI') {
                    parent.remove();
                } else {
                    link.remove();
                }
            }
        } catch (e) {
            // Invalid URL, skip
        }
    });
}

/**
 * Redirect if on a hidden page
 */
function redirectIfHiddenPage() {
    const pathname = window.location.pathname;
    if (shouldHidePage(pathname)) {
        window.location.href = '/';
    }
}

/**
 * Remove specific DOM elements
 */
function removeElements() {
    IAAI_HIDE_CONFIG.elementsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            const parent = el.parentElement;
            if (selector === '#editContactPanel' && parent) {
                parent.remove();
            } else if (selector === '.tbp-total' && parent) {
                parent.remove();
            } else {
                el.remove();
            }
        });
    });
}

/**
 * Wait for body to be ready
 */
function waitForBody() {
    return new Promise(resolve => {
        if (document.body) {
            resolve();
        } else {
            const observer = new MutationObserver(() => {
                if (document.body) {
                    observer.disconnect();
                    resolve();
                }
            });
            observer.observe(document.documentElement, { childList: true });
        }
    });
}

/**
 * Initialize IAAI hiding
 */
async function initIAAIHiding(config) {
    if (!config) return;

    console.log('[IAAI] Initializing logistics role hiding');

    await waitForBody();

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
window.initIAAIHiding = initIAAIHiding;
