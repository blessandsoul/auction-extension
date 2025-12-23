// ============================================
// Navigation Gate - Prevents Infinite Loops
// ============================================

/**
 * Navigation Gate System
 * Prevents infinite refresh/navigation loops by:
 * 1. Tracking all navigation attempts per tab
 * 2. Enforcing strict limits (1 per 15s, max 3 per 60s)
 * 3. Persisting state in chrome.storage.session
 * 4. Blocking tabs that exceed limits
 */

const NAVIGATION_LIMITS = {
  SHORT_WINDOW: 15000, // 15 seconds
  LONG_WINDOW: 60000,  // 60 seconds
  MAX_SHORT: 1,        // Max 1 navigation per 15s
  MAX_LONG: 3          // Max 3 navigations per 60s
};

// Tab State Machine
const TabState = {
  IDLE: 'IDLE',
  OPENED_TARGET: 'OPENED_TARGET',
  ON_LOGIN_PAGE: 'ON_LOGIN_PAGE',
  SUBMITTED_LOGIN: 'SUBMITTED_LOGIN',
  WAITING_REDIRECT: 'WAITING_REDIRECT',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED'
};

/**
 * Get navigation history for a tab
 */
async function getNavigationHistory(tabId, domain) {
  const key = `nav_history_${tabId}_${domain}`;
  const result = await chrome.storage.session.get(key);
  return result[key] || { attempts: [], blocked: false };
}

/**
 * Get tab automation state
 */
async function getTabState(tabId, domain) {
  const key = `tab_state_${tabId}_${domain}`;
  const result = await chrome.storage.session.get(key);
  return result[key] || {
    state: TabState.IDLE,
    runId: null,
    attemptCount: 0,
    lastActionAt: 0,
    createdAt: Date.now()
  };
}

/**
 * Update tab automation state
 */
async function setTabState(tabId, domain, updates) {
  const key = `tab_state_${tabId}_${domain}`;
  const current = await getTabState(tabId, domain);
  const newState = { ...current, ...updates };
  await chrome.storage.session.set({ [key]: newState });
  return newState;
}

/**
 * Check if navigation is allowed through the gate
 */
async function canNavigate(tabId, domain, reason, runId) {
  const now = Date.now();
  const history = await getNavigationHistory(tabId, domain);
  
  // Check if already blocked
  if (history.blocked) {
    console.error(`[NAV-GATE] Tab ${tabId} is BLOCKED - navigation denied`);
    return { allowed: false, reason: 'Tab is blocked due to previous loop detection' };
  }
  
  // Filter recent attempts
  const recentShort = history.attempts.filter(a => (now - a.timestamp) < NAVIGATION_LIMITS.SHORT_WINDOW);
  const recentLong = history.attempts.filter(a => (now - a.timestamp) < NAVIGATION_LIMITS.LONG_WINDOW);
  
  // Check limits
  if (recentShort.length >= NAVIGATION_LIMITS.MAX_SHORT) {
    console.error(`[NAV-GATE] Tab ${tabId} exceeded SHORT limit: ${recentShort.length} navigations in 15s`);
    await blockTab(tabId, domain, runId, 'Exceeded 1 navigation per 15 seconds');
    return { allowed: false, reason: 'Too many navigations in short window (15s)' };
  }
  
  if (recentLong.length >= NAVIGATION_LIMITS.MAX_LONG) {
    console.error(`[NAV-GATE] Tab ${tabId} exceeded LONG limit: ${recentLong.length} navigations in 60s`);
    await blockTab(tabId, domain, runId, 'Exceeded 3 navigations per 60 seconds');
    return { allowed: false, reason: 'Too many navigations in long window (60s)' };
  }
  
  console.log(`[NAV-GATE] Tab ${tabId} navigation ALLOWED - ${recentShort.length}/1 (15s), ${recentLong.length}/3 (60s)`);
  return { allowed: true };
}

/**
 * Record a navigation attempt
 */
async function recordNavigation(tabId, domain, url, reason, runId) {
  const key = `nav_history_${tabId}_${domain}`;
  const history = await getNavigationHistory(tabId, domain);
  
  const attempt = {
    timestamp: Date.now(),
    url,
    reason,
    runId
  };
  
  history.attempts.push(attempt);
  
  // Keep only last 10 attempts
  if (history.attempts.length > 10) {
    history.attempts = history.attempts.slice(-10);
  }
  
  await chrome.storage.session.set({ [key]: history });
  
  console.log(`[NAV-GATE] Recorded navigation for tab ${tabId}: ${reason} -> ${url.substring(0, 50)}`);
}

/**
 * Block a tab from further automatic actions
 */
async function blockTab(tabId, domain, runId, reason) {
  const key = `nav_history_${tabId}_${domain}`;
  const history = await getNavigationHistory(tabId, domain);
  
  history.blocked = true;
  history.blockReason = reason;
  history.blockedAt = Date.now();
  history.blockedRunId = runId;
  
  await chrome.storage.session.set({ [key]: history });
  
  // Update tab state
  await setTabState(tabId, domain, { state: TabState.BLOCKED });
  
  // Set badge
  chrome.action.setBadgeText({ text: 'LOOP', tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId }).catch(() => {});
  
  console.error(`[NAV-GATE] ⛔ Tab ${tabId} BLOCKED: ${reason}`);
  console.error(`[NAV-GATE] RunId: ${runId}`);
  
  // Show alert to user
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      alert(`AAS Navigation Loop Detected\n\n${msg}\n\nAutomatic navigation has been stopped. Please close this tab and try again.`);
    },
    args: [reason]
  }).catch(() => {});
}

/**
 * Clear navigation history for a tab (on success)
 */
async function clearNavigationHistory(tabId, domain) {
  const navKey = `nav_history_${tabId}_${domain}`;
  const stateKey = `tab_state_${tabId}_${domain}`;
  
  await chrome.storage.session.remove([navKey, stateKey]);
  
  // Clear badge
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
  
  console.log(`[NAV-GATE] Cleared history for tab ${tabId}`);
}

/**
 * Safe navigation wrapper - MUST be used for all automatic navigation
 */
async function safeNavigate(tabId, domain, url, reason, runId) {
  console.log(`[NAV-GATE] Navigation request: tab=${tabId}, reason=${reason}, url=${url.substring(0, 50)}`);
  
  // Check gate
  const check = await canNavigate(tabId, domain, reason, runId);
  
  if (!check.allowed) {
    console.error(`[NAV-GATE] Navigation DENIED: ${check.reason}`);
    return { success: false, error: check.reason };
  }
  
  // Record attempt
  await recordNavigation(tabId, domain, url, reason, runId);
  
  // Perform navigation
  try {
    await chrome.tabs.update(tabId, { url });
    console.log(`[NAV-GATE] Navigation executed successfully`);
    return { success: true };
  } catch (error) {
    console.error(`[NAV-GATE] Navigation failed:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if tab should perform action based on state
 */
async function shouldPerformAction(tabId, domain, action) {
  const state = await getTabState(tabId, domain);
  
  switch (action) {
    case 'SUBMIT_LOGIN':
      // Only submit if on login page and haven't submitted yet
      if (state.state === TabState.SUBMITTED_LOGIN || 
          state.state === TabState.WAITING_REDIRECT ||
          state.state === TabState.DONE ||
          state.state === TabState.BLOCKED) {
        console.log(`[NAV-GATE] SUBMIT_LOGIN denied - state is ${state.state}`);
        return false;
      }
      
      // Check attempt count
      if (state.attemptCount >= 2) {
        console.log(`[NAV-GATE] SUBMIT_LOGIN denied - already attempted ${state.attemptCount} times`);
        return false;
      }
      
      return true;
      
    case 'NAVIGATE':
      // Check if blocked
      if (state.state === TabState.BLOCKED) {
        console.log(`[NAV-GATE] NAVIGATE denied - tab is blocked`);
        return false;
      }
      return true;
      
    default:
      return true;
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TabState,
    getTabState,
    setTabState,
    canNavigate,
    recordNavigation,
    blockTab,
    clearNavigationHistory,
    safeNavigate,
    shouldPerformAction,
    getNavigationHistory
  };
}
