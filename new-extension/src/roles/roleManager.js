/**
 * Role Manager - Handles role-based UI hiding
 * Role: logistics (account: usalogistics)
 * 
 * This module orchestrates UI element hiding based on user role.
 * In the future, these rules will come from the server.
 */

// Current role configuration (hardcoded for now, will come from server later)
const CURRENT_ROLE = 'logistics';

// Role configurations
const ROLE_CONFIGS = {
    logistics: {
        copart: {
            enabled: true,
            hidePages: true,
            hidePayData: true
        },
        iaai: {
            enabled: true,
            hidePages: true,
            hidePayData: true
        }
    }
};

/**
 * Get current site type
 */
function getCurrentSite() {
    const hostname = window.location.hostname;
    if (hostname.includes('copart.com')) return 'copart';
    if (hostname.includes('iaai.com')) return 'iaai';
    return null;
}

/**
 * Initialize role-based hiding
 */
function initRoleHiding() {
    const site = getCurrentSite();
    if (!site) return;

    const config = ROLE_CONFIGS[CURRENT_ROLE];
    if (!config || !config[site] || !config[site].enabled) return;

    console.log(`[RoleManager] Initializing ${CURRENT_ROLE} role hiding for ${site}`);

    // Dispatch to site-specific handlers
    if (site === 'copart') {
        initCopartHiding(config.copart);
    } else if (site === 'iaai') {
        initIAAIHiding(config.iaai);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRoleHiding);
} else {
    initRoleHiding();
}

// Export for potential use by other modules
window.RoleManager = {
    getCurrentRole: () => CURRENT_ROLE,
    getCurrentSite,
    getConfig: () => ROLE_CONFIGS[CURRENT_ROLE]
};
