const userService = require('../services/user.service');
const configService = require('../services/config.service');

/**
 * Get UI restrictions for a user
 */
async function getRestrictions(request, reply) {
  const { username } = request.query;

  try {
    const role = await userService.getUserRole(username);
    const css = configService.getRestrictionsByRole(role);

    return {
      success: true,
      role,
      css
    };

  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ 
      success: false 
    });
  }
}

module.exports = {
  getRestrictions
};
