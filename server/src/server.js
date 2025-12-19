require('dotenv').config();
const fastify = require('fastify')({ logger: true });

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: '*', // In production, restrict to extension ID
  methods: ['GET', 'POST']
});

// Register routes
fastify.register(require('./routes/health.routes'));
fastify.register(require('./routes/auth.routes'), { prefix: '/auth' });
fastify.register(require('./routes/credentials.routes'), { prefix: '/credentials' });
fastify.register(require('./routes/config.routes'), { prefix: '/config' });
fastify.register(require('./routes/system.routes'), { prefix: '/system' });

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log(`
╔════════════════════════════════════════╗
║  Auction Auth Service (AAS)            ║
║  Server running on port ${port}           ║
║  Environment: ${process.env.NODE_ENV || 'development'}              ║
╚════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
