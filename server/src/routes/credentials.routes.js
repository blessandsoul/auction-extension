const credentialsController = require('../controllers/credentials.controller');

async function credentialsRoutes(fastify, options) {
  // GET /credentials/:site
  fastify.get('/:site', credentialsController.getCredentials);
}

module.exports = credentialsRoutes;
