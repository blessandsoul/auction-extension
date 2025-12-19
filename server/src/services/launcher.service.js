const { exec } = require('child_process');
const path = require('path');

// Pending logins storage (in-memory, short-lived)
const pendingLogins = new Map();

/**
 * Store pending login for cross-profile retrieval
 * @param {string} site - Site name (copart, iaai)
 * @param {object} credentials - Login credentials
 * @returns {string} - Token to retrieve the login
 */
function storePendingLogin(site, credentials) {
  const token = `${site}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  pendingLogins.set(token, {
    site,
    credentials,
    createdAt: Date.now()
  });

  // Auto-cleanup after 2 minutes
  setTimeout(() => {
    pendingLogins.delete(token);
  }, 120000);

  console.log(`[Launcher] Stored pending login for ${site}, token: ${token}`);
  return token;
}

/**
 * Get pending login (without consuming)
 * @param {string} site - Site to get pending login for
 * @returns {object|null} - Credentials or null
 */
function getPendingLogin(site) {
  // Find the most recent pending login for this site
  let found = null;
  let foundKey = null;

  for (const [key, value] of pendingLogins.entries()) {
    if (value.site === site) {
      // Check if expired (older than 2 minutes)
      if (Date.now() - value.createdAt > 120000) {
        pendingLogins.delete(key);
        continue;
      }
      
      if (!found || value.createdAt > found.createdAt) {
        found = value;
        foundKey = key;
      }
    }
  }

  if (found && foundKey) {
    // Don't consume - let it expire naturally
    // This allows multiple windows to use the same credentials
    console.log(`[Launcher] Retrieved pending login for ${site} (will expire in ${Math.round((120000 - (Date.now() - found.createdAt)) / 1000)}s)`);
    return found.credentials;
  }

  return null;
}

/**
 * Launch Chrome with a specific profile
 * @param {string} profileName - Chrome profile directory name (e.g., "Profile 2")
 * @param {string} url - URL to open
 * @returns {Promise<boolean>} - Success status
 */
function launchChromeProfile(profileName, url) {
  return new Promise((resolve, reject) => {
    // Windows command to launch Chrome with specific profile
    // --new-window ensures a fresh window is always created
    const chromeCommand = `start "" "chrome" --profile-directory="${profileName}" --new-window "${url}"`;
    
    console.log(`[Launcher] Executing: ${chromeCommand}`);

    exec(chromeCommand, { shell: 'cmd.exe' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Launcher] Error launching Chrome:`, error);
        reject(error);
        return;
      }
      
      console.log(`[Launcher] Chrome launched with profile: ${profileName}`);
      resolve(true);
    });
  });
}

module.exports = {
  storePendingLogin,
  getPendingLogin,
  launchChromeProfile
};
