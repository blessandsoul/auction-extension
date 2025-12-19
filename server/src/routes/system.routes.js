const systemController = require('../controllers/system.controller');

async function routes(fastify, options) {
  // Launch Chrome with specific profile
  fastify.post('/launch-chrome', systemController.launchChrome);

  // Get pending login (for cross-profile credential sharing)
  fastify.get('/pending-login', systemController.getPendingLogin);
}

module.exports = routes;
