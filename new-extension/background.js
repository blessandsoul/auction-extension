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

    // Apply UI restrictions from server
    if (tab.url.includes('copart.com') || tab.url.includes('iaai.com')) {
      if (currentSession && currentSession.authenticated) {
        try {
          const restrictionsData = await apiService.getRestrictions(currentSession.username);
          if (restrictionsData.success && restrictionsData.css) {
            chrome.scripting.insertCSS({
              target: { tabId: tabId },
              css: restrictionsData.css,
              origin: "AUTHOR"
            }).catch(err => {});
          }
        } catch (e) {
          console.log('[AAS] Failed to fetch restrictions:', e);
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
  await chrome.storage.local.remove('session');
  await clearAllSiteCookies();
  sendResponse({ success: true });
}

// ============== COPART HANDLER ==============

async function handleOpenCopart(data, sendResponse) {
  const { account } = data;

  console.log('[AAS] Opening Copart:', account);

  try {
    // Fetch credentials from server
    const credData = await apiService.getCredentials('copart', account);

    if (!credData.success || !credData.data) {
      throw new Error('Credentials not found');
    }

    const creds = credData.data;

    // Clear Copart cookies first
    await clearCopartCookies();
    console.log('[AAS] Copart cookies cleared');

    // Store credentials in local storage
    await chrome.storage.local.set({
      pendingLogin: {
        site: 'copart',
        type: 'COPART',
        username: creds.username,
        password: creds.password,
        timestamp: Date.now()
      }
    });

    // Open the login page
    const tab = await chrome.tabs.create({
      url: SITES.COPART.LOGIN_URL
    });
    const targetTabId = tab.id;

    // Save to Memory Cache
    if (targetTabId) {
      loginCache.set(targetTabId, {
        site: 'copart',
        type: 'COPART',
        username: creds.username,
        password: creds.password,
        timestamp: Date.now()
      });
    }

    // Monitor for successful login and redirect
    const listener = async (tabId, changeInfo, tab) => {
      if (!tab.url) return;

      if (tab.url.includes('copart.com') && !tab.url.includes('/login')) {
        console.log('[AAS] Copart login detected (or already logged in)');
        chrome.tabs.onUpdated.removeListener(listener);
        await chrome.storage.local.remove(['pendingLogin']);
        
        // Stop the redirect loop!
        // If we are already on the dashboard or payments page, DO NOT redirect.
        if (tab.url.includes('member-payments') || tab.url.includes('dashboard')) {
             console.log('[AAS] Already on dashboard/payments, respecting current URL');
             return; 
        }

        // Only redirect if we are somewhere unexpected (like the home page)
        console.log('[AAS] Redirecting to member-payments');
        await chrome.tabs.update(tabId, { url: SITES.COPART.DASHBOARD_URL });
      }
    };
    chrome.tabs.onUpdated.addListener(listener);

    // Cleanup after 2 minutes
    setTimeout(async () => {
      chrome.tabs.onUpdated.removeListener(listener);
      await chrome.storage.local.remove(['pendingLogin']);
    }, 120000);

    sendResponse({ success: true });
  } catch (error) {
    console.error('[AAS] Error:', error);
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
      const restrictionsData = await apiService.getRestrictions(session.username);
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
