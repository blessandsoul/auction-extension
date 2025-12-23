// ============================================
// AAS - Auction Authorisation Service
// Background Service Worker (Server-Integrated)
// ============================================

import { CONFIG, SITES, ALLOWED_URLS, DEFAULT_REDIRECTS } from './src/config/constants.js';
import ApiService from './src/services/api.service.js';

// Initialize API Service
const apiService = new ApiService(CONFIG.SERVER_URL);

// ============================================
// Navigation Gate - Prevents Infinite Loops
// ============================================

const NAVIGATION_LIMITS = {
  SHORT_WINDOW: 15000, // 15 seconds
  LONG_WINDOW: 60000,  // 60 seconds
  MAX_SHORT: 1,        // Max 1 navigation per 15s
  MAX_LONG: 3          // Max 3 navigations per 60s
};

const TabState = {
  IDLE: 'IDLE',
  OPENED_TARGET: 'OPENED_TARGET',
  ON_LOGIN_PAGE: 'ON_LOGIN_PAGE',
  SUBMITTED_LOGIN: 'SUBMITTED_LOGIN',
  WAITING_REDIRECT: 'WAITING_REDIRECT',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED'
};

async function getNavigationHistory(tabId, domain) {
  const key = `nav_history_${tabId}_${domain}`;
  const result = await chrome.storage.session.get(key);
  return result[key] || { attempts: [], blocked: false };
}

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

async function setTabState(tabId, domain, updates) {
  const key = `tab_state_${tabId}_${domain}`;
  const current = await getTabState(tabId, domain);
  const newState = { ...current, ...updates };
  await chrome.storage.session.set({ [key]: newState });
  log('info', `[NAV-GATE] Tab ${tabId} state: ${current.state} -> ${newState.state}`);
  return newState;
}

async function canNavigate(tabId, domain, reason, runId) {
  const now = Date.now();
  const history = await getNavigationHistory(tabId, domain);
  
  if (history.blocked) {
    log('error', `[NAV-GATE] Tab ${tabId} is BLOCKED - navigation denied`);
    return { allowed: false, reason: 'Tab is blocked due to previous loop detection' };
  }
  
  const recentShort = history.attempts.filter(a => (now - a.timestamp) < NAVIGATION_LIMITS.SHORT_WINDOW);
  const recentLong = history.attempts.filter(a => (now - a.timestamp) < NAVIGATION_LIMITS.LONG_WINDOW);
  
  if (recentShort.length >= NAVIGATION_LIMITS.MAX_SHORT) {
    log('error', `[NAV-GATE] Tab ${tabId} exceeded SHORT limit: ${recentShort.length} in 15s`);
    await blockTab(tabId, domain, runId, 'Exceeded 1 navigation per 15 seconds');
    return { allowed: false, reason: 'Too many navigations in short window' };
  }
  
  if (recentLong.length >= NAVIGATION_LIMITS.MAX_LONG) {
    log('error', `[NAV-GATE] Tab ${tabId} exceeded LONG limit: ${recentLong.length} in 60s`);
    await blockTab(tabId, domain, runId, 'Exceeded 3 navigations per 60 seconds');
    return { allowed: false, reason: 'Too many navigations in long window' };
  }
  
  log('info', `[NAV-GATE] Tab ${tabId} navigation ALLOWED - ${recentShort.length}/1 (15s), ${recentLong.length}/3 (60s)`);
  return { allowed: true };
}

async function recordNavigation(tabId, domain, url, reason, runId) {
  const key = `nav_history_${tabId}_${domain}`;
  const history = await getNavigationHistory(tabId, domain);
  
  history.attempts.push({
    timestamp: Date.now(),
    url,
    reason,
    runId
  });
  
  if (history.attempts.length > 10) {
    history.attempts = history.attempts.slice(-10);
  }
  
  await chrome.storage.session.set({ [key]: history });
  log('info', `[NAV-GATE] Recorded: ${reason} -> ${url.substring(0, 50)}`);
}

async function blockTab(tabId, domain, runId, reason) {
  const key = `nav_history_${tabId}_${domain}`;
  const history = await getNavigationHistory(tabId, domain);
  
  history.blocked = true;
  history.blockReason = reason;
  history.blockedAt = Date.now();
  
  await chrome.storage.session.set({ [key]: history });
  await setTabState(tabId, domain, { state: TabState.BLOCKED });
  
  chrome.action.setBadgeText({ text: 'LOOP', tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId }).catch(() => {});
  
  log('error', `[NAV-GATE] ⛔ Tab ${tabId} BLOCKED: ${reason}`);
  
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => alert(`AAS Loop Detected\n\n${msg}\n\nAutomatic navigation stopped. Close tab and try again.`),
    args: [reason]
  }).catch(() => {});
}

async function clearNavigationHistory(tabId, domain) {
  await chrome.storage.session.remove([
    `nav_history_${tabId}_${domain}`,
    `tab_state_${tabId}_${domain}`
  ]);
  chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
  log('info', `[NAV-GATE] Cleared history for tab ${tabId}`);
}

async function safeNavigate(tabId, domain, url, reason, runId) {
  log('info', `[NAV-GATE] Navigation request: tab=${tabId}, reason=${reason}`);
  
  const check = await canNavigate(tabId, domain, reason, runId);
  
  if (!check.allowed) {
    log('error', `[NAV-GATE] Navigation DENIED: ${check.reason}`);
    return { success: false, error: check.reason };
  }
  
  await recordNavigation(tabId, domain, url, reason, runId);
  
  try {
    await chrome.tabs.update(tabId, { url });
    log('info', `[NAV-GATE] Navigation executed successfully`);
    return { success: true };
  } catch (error) {
    log('error', `[NAV-GATE] Navigation failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function shouldPerformAction(tabId, domain, action) {
  const state = await getTabState(tabId, domain);
  
  if (action === 'SUBMIT_LOGIN') {
    if ([TabState.SUBMITTED_LOGIN, TabState.WAITING_REDIRECT, TabState.DONE, TabState.BLOCKED].includes(state.state)) {
      log('warn', `[NAV-GATE] SUBMIT_LOGIN denied - state is ${state.state}`);
      return false;
    }
    
    if (state.attemptCount >= 2) {
      log('warn', `[NAV-GATE] SUBMIT_LOGIN denied - already attempted ${state.attemptCount} times`);
      return false;
    }
    
    return true;
  }
  
  if (action === 'NAVIGATE' && state.state === TabState.BLOCKED) {
    log('warn', `[NAV-GATE] NAVIGATE denied - tab is blocked`);
    return false;
  }
  
  return true;
}

// Cache for pending logins
const loginCache = new Map();

// Loop breaker: Track navigation attempts per tab (in-memory)
const navigationAttempts = new Map(); // tabId -> { count, firstAttempt, domain, runId }

// Log capture for debugging fast-reloading pages
const logBuffer = [];
const MAX_LOG_BUFFER = 300;

// Generate unique run ID for tracking
function generateRunId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced logging that also captures to buffer
function captureLog(level, ...args) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message: args.join(' ') };
  logBuffer.push(logEntry);
  if (logBuffer.length > MAX_LOG_BUFFER) {
    logBuffer.shift();
  }
}

// Logging helper with prefix
function log(level, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[AAS-BG ${timestamp}]`;
  if (level === 'error') {
    console.error(prefix, ...args);
  } else if (level === 'warn') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
  // Also capture to buffer
  captureLog(level, ...args);
}

// Persistent loop tracking using chrome.storage.session (survives crashes)
async function getLoopAttempts(tabId, domain) {
  const key = `loop_attempts_${tabId}_${domain}`;
  const result = await chrome.storage.session.get(key);
  return result[key] || { count: 0, firstAttempt: Date.now(), stopped: false };
}

async function incrementLoopAttempts(tabId, domain, runId) {
  const key = `loop_attempts_${tabId}_${domain}`;
  const attempts = await getLoopAttempts(tabId, domain);
  
  // Reset if window expired
  const elapsed = Date.now() - attempts.firstAttempt;
  if (elapsed > CONFIG.ATTEMPT_WINDOW) {
    attempts.count = 1;
    attempts.firstAttempt = Date.now();
    attempts.stopped = false;
  } else {
    attempts.count++;
  }
  
  attempts.runId = runId;
  await chrome.storage.session.set({ [key]: attempts });
  
  log('info', `[${runId}] Loop attempts for tab ${tabId}: ${attempts.count}/${CONFIG.MAX_LOGIN_ATTEMPTS}`);
  
  return attempts;
}

async function shouldStopLoop(tabId, domain) {
  const attempts = await getLoopAttempts(tabId, domain);
  return attempts.stopped || attempts.count >= CONFIG.MAX_LOGIN_ATTEMPTS;
}

async function markLoopStopped(tabId, domain, runId) {
  const key = `loop_attempts_${tabId}_${domain}`;
  const attempts = await getLoopAttempts(tabId, domain);
  attempts.stopped = true;
  await chrome.storage.session.set({ [key]: attempts });
  
  log('error', `[${runId}] Loop stopped for tab ${tabId}`);
  
  // Set extension badge to show error
  chrome.action.setBadgeText({ text: '⚠️', tabId: tabId }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId: tabId }).catch(() => {});
}

async function clearLoopTracking(tabId, domain) {
  const key = `loop_attempts_${tabId}_${domain}`;
  await chrome.storage.session.remove(key);
}

// Find existing Copart tab
async function findExistingCopartTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.copart.com/*' });
  return tabs.length > 0 ? tabs[0] : null;
}

// Restrictions caching (prevents polling storm)
const RESTRICTIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let restrictionsCache = new Map(); // username -> { data, timestamp }

async function getCachedRestrictions(username) {
  // Check in-memory cache first
  const cached = restrictionsCache.get(username);
  if (cached && (Date.now() - cached.timestamp) < RESTRICTIONS_CACHE_TTL) {
    log('info', `Using cached restrictions for ${username}`);
    return cached.data;
  }
  
  // Check chrome.storage.session
  const key = `restrictions_${username}`;
  const result = await chrome.storage.session.get(key);
  if (result[key] && (Date.now() - result[key].timestamp) < RESTRICTIONS_CACHE_TTL) {
    log('info', `Using session-cached restrictions for ${username}`);
    restrictionsCache.set(username, result[key]); // Update in-memory cache
    return result[key].data;
  }
  
  // Fetch from server
  log('info', `Fetching fresh restrictions for ${username}`);
  const restrictionsData = await apiService.getRestrictions(username);
  
  // Cache in both places
  const cacheEntry = { data: restrictionsData, timestamp: Date.now() };
  restrictionsCache.set(username, cacheEntry);
  await chrome.storage.session.set({ [key]: cacheEntry });
  
  return restrictionsData;
}

async function clearRestrictionsCache(username) {
  restrictionsCache.delete(username);
  const key = `restrictions_${username}`;
  await chrome.storage.session.remove(key);
}

// Cache for current session
let currentSession = null;

// Initialize session cache
chrome.storage.local.get('session').then(res => {
  currentSession = res.session || null;
});

// Sync session cache on storage change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.session) {
    currentSession = changes.session.newValue || null;
  }
});

// Open side panel on extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Check if URL is allowed
function isUrlAllowed(url, site) {
  const patterns = ALLOWED_URLS[site];
  if (!patterns) return true;
  const urlLower = url.toLowerCase();
  return patterns.some(pattern => urlLower.includes(pattern.toLowerCase()));
}

// UI Restrictions injection on page load
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    // URL Access Control (only when authenticated)
    if (currentSession && currentSession.authenticated) {
      // IAAI URL check
      if (tab.url.includes('iaai.com') && !tab.url.includes('login.iaai.com')) {
        if (!isUrlAllowed(tab.url, 'iaai')) {
          console.log('[AAS] Blocked IAAI URL:', tab.url);
          chrome.tabs.update(tabId, { url: DEFAULT_REDIRECTS.iaai });
          return;
        }
      }

      // Copart URL check
      if (tab.url.includes('copart.com')) {
        if (!isUrlAllowed(tab.url, 'copart')) {
          console.log('[AAS] Blocked Copart URL:', tab.url);
          chrome.tabs.update(tabId, { url: DEFAULT_REDIRECTS.copart });
          return;
        }
      }
    }

    // Apply UI restrictions from server (CACHED to prevent polling storm)
    if (tab.url.includes('copart.com') || tab.url.includes('iaai.com')) {
      if (currentSession && currentSession.authenticated) {
        try {
          // Use cached restrictions instead of fetching every time
          const restrictionsData = await getCachedRestrictions(currentSession.username);
          if (restrictionsData.success && restrictionsData.css) {
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              css: restrictionsData.css,
              origin: "AUTHOR"
            }).catch(err => {});
          }
        } catch (e) {
          log('warn', '[AAS] Failed to fetch restrictions:', e.message);
        }
      }
    }
  }
});

// Clear cookies on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[AAS] Extension installed/updated, clearing cookies');
  await clearAllSiteCookies();
  const res = await chrome.storage.local.get('session');
  currentSession = res.session || null;
});

// Clear cookies on browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[AAS] Browser startup, clearing cookies');
  await clearAllSiteCookies();
  const res = await chrome.storage.local.get('session');
  currentSession = res.session || null;
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep channel open for async
});

async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.action) {
      case 'AUTH_LOGIN':
        await handleLogin(message.data, sendResponse);
        break;

      case 'VERIFY_CODE':
        await handleVerifyCode(message.data, sendResponse);
        break;

      case 'LOGOUT':
        await handleLogout(sendResponse);
        break;

      case 'GET_SESSION':
        await handleGetSession(sendResponse);
        break;

      case 'OPEN_COPART':
        await handleOpenCopart(message.data, sendResponse);
        break;

      case 'OPEN_IAAI':
        await handleOpenIAAI(sendResponse);
        break;

      case 'GET_LOGIN_DATA':
        handleGetLoginData(sender, sendResponse);
        break;

      case 'EXECUTE_COPART_LOGIN_API':
        await handleExecuteCopartLogin(message.data, sendResponse);
        break;

      case 'GET_USER_SETTINGS':
        await handleGetUserSettings(sendResponse);
        break;

      case 'GET_LOGS':
        sendResponse({ success: true, logs: logBuffer });
        break;

      case 'LOG_FROM_CONTENT':
        // Receive logs from content script for persistence
        if (message.data) {
          captureLog(message.data.level || 'info', `[CS] ${message.data.message}`);
        }
        sendResponse({ success: true });
        break;

      case 'LOGIN_SUCCESS':
        // Content script reports successful Direct API login
        const { site, runId } = message.data;
        log('info', `[${runId}] ✅ Login success reported from content script for ${site}`);
        
        // Clear navigation tracking (success)
        if (sender.tab && sender.tab.id) {
          const domain = site === 'copart' ? 'copart.com' : 'iaai.com';
          await clearNavigationHistory(sender.tab.id, domain);
          await setTabState(sender.tab.id, domain, { state: TabState.DONE });
          loginCache.delete(sender.tab.id);
          log('info', `[${runId}] Cleaned up state for tab ${sender.tab.id}`);
        }
        
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('[AAS] Error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ============== AUTH HANDLERS ==============

async function handleLogin(data, sendResponse) {
  const { username } = data;

  try {
    // Collect user info
    const userInfo = await collectUserInfo();

    // Send login request to server (server handles OTP sending to Telegram)
    const result = await apiService.login(username, userInfo);

    if (result.success) {
      sendResponse({ success: true, message: result.message || 'Password sent to Telegram' });
    } else {
      sendResponse({ success: false, message: result.message || 'Unknown username' });
    }
  } catch (error) {
    console.error('[AAS] Login error:', error);
    sendResponse({ success: false, message: 'Connection error' });
  }
}

async function handleVerifyCode(data, sendResponse) {
  const { code } = data;

  try {
    const result = await apiService.verify(code);

    if (result.success) {
      // Save session from server response
      await chrome.storage.local.set({
        session: result.session
      });
      sendResponse({ success: true, message: 'Verified successfully' });
    } else {
      sendResponse({ success: false, message: result.message || 'Invalid password' });
    }
  } catch (error) {
    console.error('[AAS] Verify error:', error);
    sendResponse({ success: false, message: 'Connection error' });
  }
}

async function handleGetSession(sendResponse) {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (!session) {
      sendResponse({ authenticated: false });
      return;
    }

    if (Date.now() > session.expiry) {
      await chrome.storage.local.remove('session');
      sendResponse({ authenticated: false });
      return;
    }

    sendResponse({ authenticated: true, session });
  } catch (error) {
    sendResponse({ authenticated: false });
  }
}

async function handleLogout(sendResponse) {
  // Clear restrictions cache on logout
  if (currentSession && currentSession.username) {
    await clearRestrictionsCache(currentSession.username);
  }
  
  await chrome.storage.local.remove('session');
  await clearAllSiteCookies();
  sendResponse({ success: true });
}

// ============== COPART HANDLER ==============

async function handleOpenCopart(data, sendResponse) {
  const { account } = data;
  const runId = generateRunId();
  const domain = 'copart.com';

  log('info', `[${runId}] Opening Copart account:`, account);

  try {
    // Fetch credentials from server with session authentication
    log('info', `[${runId}] Fetching credentials from server...`);
    const credData = await apiService.getCredentials('copart', account);

    log('info', `[${runId}] Credentials API response status:`, credData.success ? 'SUCCESS' : 'FAILED');
    
    if (!credData.success || !credData.data) {
      log('error', `[${runId}] Credentials not found or API returned error:`, credData);
      throw new Error(credData.message || 'Credentials not found');
    }

    const creds = credData.data;
    log('info', `[${runId}] Credentials retrieved for username:`, creds.username);

    // Clear Copart cookies first
    await clearCopartCookies();
    log('info', `[${runId}] Copart cookies cleared`);

    // Store credentials in local storage for content script
    await chrome.storage.local.set({
      pendingLogin: {
        site: 'copart',
        type: 'COPART',
        username: creds.username,
        password: creds.password,
        timestamp: Date.now(),
        runId: runId
      }
    });
    log('info', `[${runId}] Credentials stored in chrome.storage.local`);

    // Open the login page - content script will handle Direct API auth
    const tab = await chrome.tabs.create({
      url: SITES.COPART.LOGIN_URL
    });
    const targetTabId = tab.id;
    log('info', `[${runId}] Created tab ${targetTabId}, navigating to login page`);
    
    // Initialize tab state with runId (for tracking only)
    await setTabState(targetTabId, domain, {
      state: TabState.ON_LOGIN_PAGE,
      runId: runId,
      attemptCount: 0,
      lastActionAt: Date.now()
    });

    // Save to Memory Cache (for GET_LOGIN_DATA requests)
    if (targetTabId) {
      loginCache.set(targetTabId, {
        site: 'copart',
        type: 'COPART',
        username: creds.username,
        password: creds.password,
        timestamp: Date.now(),
        runId: runId
      });
      log('info', `[${runId}] Credentials cached in memory for tab ${targetTabId}`);
    }

    // NO NAVIGATION MONITORING NEEDED
    // Content script will:
    // 1. Extract CSRF token
    // 2. POST to /processLogin
    // 3. Reload on success
    // 4. Send LOGIN_SUCCESS message
    
    // Just cleanup after timeout
    setTimeout(async () => {
      log('info', `[${runId}] Cleanup timeout reached`);
      await chrome.storage.local.remove(['pendingLogin']);
      await clearNavigationHistory(targetTabId, domain);
      loginCache.delete(targetTabId);
    }, 60000); // 1 minute cleanup

    sendResponse({ success: true });
  } catch (error) {
    log('error', `[${runId}] Error in handleOpenCopart:`, error.message, error.stack);
    sendResponse({ success: false, error: error.message });
  }
}

// ============== IAAI HANDLER ==============

async function handleOpenIAAI(sendResponse) {
  console.log('[AAS] Starting IAAI Background Login...');

  try {
    // Fetch credentials from server
    const credData = await apiService.getCredentials('iaai');

    if (!credData.success || !credData.data) {
      throw new Error('Credentials not found');
    }

    const creds = credData.data;

    // Clear IAAI cookies first
    await chrome.cookies.remove({ url: 'https://login.iaai.com', name: '.AspNetCore.Identity.Application' });

    // Fetch login page to get Verification Token
    const loginUrl = SITES.IAAI.LOGIN_URL;
    const initRes = await fetch(loginUrl);
    const initText = await initRes.text();
    const actionUrl = initRes.url;

    // Extract Token
    const tokenMatch = initText.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      throw new Error('Could not find __RequestVerificationToken');
    }

    console.log('[AAS] IAAI Token found, sending credentials...');

    // Prepare Form Data
    const formData = new FormData();
    formData.append('Input.Email', creds.username);
    formData.append('Input.Password', creds.password);
    formData.append('Input.RememberMe', 'false');
    formData.append('__RequestVerificationToken', token);

    // Send Login Request
    const loginRes = await fetch(actionUrl, {
      method: "POST",
      body: formData
    });

    console.log('[AAS] IAAI Login Status:', loginRes.status, loginRes.redirected);

    // Verify Success (Check cookie)
    const cookie = await chrome.cookies.get({
      url: "https://login.iaai.com/",
      name: ".AspNetCore.Identity.Application"
    });

    if (cookie) {
      console.log('[AAS] IAAI Login SUCCESS');
      await chrome.tabs.create({ url: SITES.IAAI.PAYMENT_URL });
      await chrome.tabs.create({ url: SITES.IAAI.PICKUP_URL, active: false });
      sendResponse({ success: true });
    } else {
      throw new Error('Login failed (cookie not set)');
    }

  } catch (error) {
    console.error('[AAS] IAAI login failed:', error);

    // Fallback: Open manual login page
    const credData = await apiService.getCredentials('iaai');
    if (credData.success && credData.data) {
      await chrome.storage.local.set({
        pendingLogin: {
          site: 'iaai',
          type: 'IAAI',
          username: credData.data.username,
          password: credData.data.password,
          timestamp: Date.now()
        }
      });
    }
    await chrome.tabs.create({ url: SITES.IAAI.LOGIN_URL });
    sendResponse({ success: false, error: error.message });
  }
}

// ============== HELPER HANDLERS ==============

function handleGetLoginData(sender, sendResponse) {
  const senderTabId = sender.tab?.id;
  let data = null;

  // Try Memory Cache
  if (senderTabId && loginCache.has(senderTabId)) {
    data = loginCache.get(senderTabId);
    loginCache.delete(senderTabId);
    console.log('[AAS] Served credentials from Memory Cache for tab:', senderTabId);
    sendResponse({ success: true, data });
    return;
  }

  // Fallback to Storage
  chrome.storage.local.get(['pendingLogin']).then(res => {
    if (res.pendingLogin) {
      console.log('[AAS] Served credentials from Storage');
      sendResponse({ success: true, data: res.pendingLogin });
    } else {
      sendResponse({ success: false });
    }
  });
}

async function handleExecuteCopartLogin(data, sendResponse) {
  try {
    const { username, password, token } = data;
    console.log('[AAS] Executing Copart API login...');

    const res = await fetch(SITES.COPART.PROCESS_LOGIN_URL, {
      method: "POST",
      headers: {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json;charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "x-xsrf-token": token
      },
      body: JSON.stringify({
        accountType: 0,
        accountTypeValue: 0,
        username: username,
        password: password
      }),
      credentials: "include"
    });

    const json = await res.json();
    console.log('[AAS] Copart Login Response:', json);
    sendResponse({ success: true, data: json });
  } catch (e) {
    console.error('[AAS] Copart Login Error:', e);
    sendResponse({ success: false, error: e.toString() });
  }
}

async function handleGetUserSettings(sendResponse) {
  try {
    const result = await chrome.storage.local.get('session');
    const session = result.session;

    if (session && session.authenticated) {
      // Use cached restrictions
      const restrictionsData = await getCachedRestrictions(session.username);
      sendResponse({
        success: true,
        role: restrictionsData.role || 'user',
        hiddenComponents: []
      });
    } else {
      sendResponse({ success: true, role: 'user', hiddenComponents: [] });
    }
  } catch (e) {
    sendResponse({ success: true, role: 'user', hiddenComponents: [] });
  }
}

// ============== UTILITIES ==============

async function collectUserInfo() {
  let ip = 'unknown';
  try {
    ip = await apiService.getUserIP();
  } catch (e) {}

  return {
    ip,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform
  };
}

async function clearCopartCookies() {
  const copartDomains = ['copart.com', 'www.copart.com', '.copart.com'];

  for (const domain of copartDomains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      for (const cookie of cookies) {
        const url = `https://${cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
        await chrome.cookies.remove({ url, name: cookie.name });
      }
    } catch (e) {}
  }
}

async function clearAllSiteCookies() {
  const domains = ['copart.com', 'www.copart.com', 'iaai.com', 'www.iaai.com', 'login.iaai.com'];

  for (const domain of domains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      for (const cookie of cookies) {
        await chrome.cookies.remove({
          url: `https://${domain}${cookie.path}`,
          name: cookie.name
        });
      }
    } catch (e) {}
  }
}
