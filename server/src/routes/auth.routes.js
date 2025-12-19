const authController = require('../controllers/auth.controller');

async function authRoutes(fastify, options) {
  // POST /auth/login
  fastify.post('/login', authController.login);

  // POST /auth/verify
  fastify.post('/verify', authController.verify);

  // POST /auth/register
  fastify.post('/register', authController.register);
}

module.exports = authRoutes;
