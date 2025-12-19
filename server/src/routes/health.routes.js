async function healthRoutes(fastify, options) {
  // GET /
  fastify.get('/', async (request, reply) => {
    return { 
      status: 'ok', 
      service: 'Auction Auth Service',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  });
}

module.exports = healthRoutes;
