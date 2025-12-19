const { UI_RESTRICTIONS_CSS, IAAI_RESTRICTIONS_CSS } = require('../config/constants');

/**
 * Get UI restrictions CSS for a specific role
 * Returns combined Copart + IAAI restrictions
 * @param {string} role - User role
 * @returns {string} CSS restrictions
 */
function getRestrictionsByRole(role) {
  if (role === 'logistics') {
    // Combine both Copart and IAAI restrictions
    return UI_RESTRICTIONS_CSS + '\n' + IAAI_RESTRICTIONS_CSS;
  }
  return '';
}

module.exports = {
  getRestrictionsByRole
};
