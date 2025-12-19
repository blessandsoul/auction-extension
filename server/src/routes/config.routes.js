const configController = require('../controllers/config.controller');

async function configRoutes(fastify, options) {
  // GET /config/restrictions
  fastify.get('/restrictions', configController.getRestrictions);
}

module.exports = configRoutes;
