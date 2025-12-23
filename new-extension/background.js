// ============================================
// AAS - Auction Authorisation Service
// Background Service Worker (Server-Integrated)
// ============================================

import { CONFIG, SITES, ALLOWED_URLS, DEFAULT_REDIRECTS } from './src/config/constants.js';
import ApiService from './src/services/api.service.js';

// Initialize API Service
const apiService = new ApiService(CONFIG.SERVER_URL);

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
    // Check if we should stop due to previous loop
    // This check happens BEFORE opening any tab
    const existingTab = await findExistingCopartTab();
    if (existingTab) {
      const shouldStop = await shouldStopLoop(existingTab.id, domain);
      if (shouldStop) {
        const msg = `Loop prevention: Already attempted ${CONFIG.MAX_LOGIN_ATTEMPTS} times. Please close the Copart tab and try again.`;
        log('error', `[${runId}] ${msg}`);
        sendResponse({ success: false, error: msg });
        return;
      }
    }

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

    // Store credentials in local storage
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

    // Increment loop attempts BEFORE opening tab (persistent tracking)
    // This ensures we track even if page crashes immediately
    const tempTabId = existingTab?.id || 0; // Will be updated after tab creation
    
    // Open the login page
    const tab = await chrome.tabs.create({
      url: SITES.COPART.LOGIN_URL
    });
    const targetTabId = tab.id;
    log('info', `[${runId}] Created tab ${targetTabId}, navigating to login page`);
    
    // NOW increment attempts with real tab ID
    await incrementLoopAttempts(targetTabId, domain, runId);

    // Save to Memory Cache
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

    // Initialize navigation attempt tracking for this tab
    navigationAttempts.set(targetTabId, {
      count: 0,
      firstAttempt: Date.now(),
      domain: 'copart.com',
      runId: runId
    });

    // Monitor for successful login and redirect
    const listener = async (tabId, changeInfo, tab) => {
      if (tabId !== targetTabId) return;
      if (!tab.url) return;

      log('info', `[${runId}] Tab ${tabId} update - status: ${changeInfo.status}, url: ${tab.url.substring(0, 60)}`);

      // Check persistent loop breaker FIRST (before any logic)
      const shouldStop = await shouldStopLoop(tabId, domain);
      if (shouldStop) {
        log('error', `[${runId}] Loop already stopped for this tab, removing listener`);
        chrome.tabs.onUpdated.removeListener(listener);
        await chrome.storage.local.remove(['pendingLogin']);
        navigationAttempts.delete(tabId);
        return;
      }

      // Check if we're past login page
      if (tab.url.includes('copart.com') && !tab.url.includes('/login')) {
        log('info', `[${runId}] Tab ${tabId} - Detected navigation away from login page`);
        
        // Get persistent attempt count
        const attempts = await getLoopAttempts(tabId, domain);
        const elapsed = Date.now() - attempts.firstAttempt;
        log('info', `[${runId}] Persistent attempts: ${attempts.count}/${CONFIG.MAX_LOGIN_ATTEMPTS}, elapsed: ${elapsed}ms`);
        
        // Check if we've exceeded max attempts
        if (attempts.count >= CONFIG.MAX_LOGIN_ATTEMPTS) {
          log('error', `[${runId}] LOOP DETECTED! Exceeded ${CONFIG.MAX_LOGIN_ATTEMPTS} navigation attempts`);
          log('error', `[${runId}] Stopping automatic navigation to prevent infinite loop`);
          
          await markLoopStopped(tabId, domain, runId);
          chrome.tabs.onUpdated.removeListener(listener);
          await chrome.storage.local.remove(['pendingLogin']);
          navigationAttempts.delete(tabId);
          
          // Show error to user
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (errorMsg) => {
              alert(`AAS Error: ${errorMsg}\n\nPlease check the console logs and contact support.`);
            },
            args: [`Login automation failed (loop detected). RunId: ${runId}`]
          }).catch(() => {});
          
          return;
        }
        
        // If we are already on the dashboard or payments page, DO NOT redirect.
        if (tab.url.includes('member-payments') || tab.url.includes('/locations')) {
          log('info', `[${runId}] Tab ${tabId} - Already on target page, cleaning up`);
          chrome.tabs.onUpdated.removeListener(listener);
          await chrome.storage.local.remove(['pendingLogin']);
          await clearLoopTracking(tabId, domain);
          navigationAttempts.delete(tabId);
          return; 
        }

        // Increment persistent attempt counter BEFORE redirect
        await incrementLoopAttempts(tabId, domain, runId);

        // Only redirect if we are somewhere unexpected (like the home page)
        log('info', `[${runId}] Tab ${tabId} - Redirecting to dashboard`);
        await chrome.tabs.update(tabId, { url: SITES.COPART.DASHBOARD_URL });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    log('info', `[${runId}] Registered tab update listener for tab ${targetTabId}`);

    // Cleanup after 2 minutes
    setTimeout(async () => {
      log('info', `[${runId}] Cleanup timeout reached, removing listener`);
      chrome.tabs.onUpdated.removeListener(listener);
      await chrome.storage.local.remove(['pendingLogin']);
      await clearLoopTracking(targetTabId, domain);
      navigationAttempts.delete(targetTabId);
    }, 120000);

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
