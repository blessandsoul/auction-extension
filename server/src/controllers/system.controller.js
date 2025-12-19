const launcherService = require('../services/launcher.service');
const credentialsService = require('../services/credentials.service');

/**
 * Launch Chrome with a specific profile and store credentials for it
 */
async function launchChrome(request, reply) {
  try {
    const { site, account, profile } = request.body;

    if (!site || !profile) {
      return reply.status(400).send({ 
        success: false, 
        message: 'Missing site or profile' 
      });
    }

    console.log(`[System] Launch request: ${site}/${account} -> ${profile}`);

    // Get credentials from database
    const credentials = await credentialsService.getCredentials(site, account);
    
    if (!credentials) {
      return reply.status(404).send({ 
        success: false, 
        message: 'Credentials not found' 
      });
    }

    // Store credentials for cross-profile retrieval
    launcherService.storePendingLogin(site, {
      site,
      type: site.toUpperCase(),
      username: credentials.username,
      password: credentials.password,
      timestamp: Date.now()
    });

    // Determine URL based on site
    let url;
    if (site === 'copart') {
      url = 'https://www.copart.com/login';
    } else if (site === 'iaai') {
      url = 'https://login.iaai.com/Identity/Account/Login';
    } else {
      url = 'https://google.com';
    }

    // Launch Chrome with the specified profile
    await launcherService.launchChromeProfile(profile, url);

    return reply.send({ 
      success: true, 
      message: `Launched ${site} in ${profile}` 
    });

  } catch (error) {
    console.error('[System] Launch error:', error);
    return reply.status(500).send({ 
      success: false, 
      message: error.message 
    });
  }
}

/**
 * Get pending login for a site (called by extension in different profile)
 */
async function getPendingLogin(request, reply) {
  try {
    const { site } = request.query;

    if (!site) {
      return reply.status(400).send({ 
        success: false, 
        message: 'Missing site parameter' 
      });
    }

    const credentials = launcherService.getPendingLogin(site);

    if (credentials) {
      return reply.send({ 
        success: true, 
        data: credentials 
      });
    } else {
      return reply.send({ 
        success: false, 
        message: 'No pending login found' 
      });
    }

  } catch (error) {
    console.error('[System] Get pending login error:', error);
    return reply.status(500).send({ 
      success: false, 
      message: error.message 
    });
  }
}

module.exports = {
  launchChrome,
  getPendingLogin
};
