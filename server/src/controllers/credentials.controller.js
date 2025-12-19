const credentialsService = require('../services/credentials.service');

/**
 * Get credentials for a site
 */
async function getCredentials(request, reply) {
  const { site } = request.params;
  const { account_name } = request.query;

  try {
    const credentials = await credentialsService.getCredentials(site, account_name);

    if (!credentials) {
      return reply.code(404).send({ 
        success: false, 
        message: 'Credentials not found' 
      });
    }

    return { 
      success: true, 
      data: credentials 
    };

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ 
      success: false, 
      error: 'Database error' 
    });
  }
}

module.exports = {
  getCredentials
};
