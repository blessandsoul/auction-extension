const pool = require('../config/database');

/**
 * Get credentials for a specific site and account
 * @param {string} site - Site name (copart, iaai)
 * @param {string} accountName - Optional account name filter
 * @returns {Promise<object|null>}
 */
async function getCredentials(site, accountName = null) {
  let query = 'SELECT username, password FROM credentials WHERE site = ?';
  const params = [site];

  if (accountName) {
    query += ' AND account_name = ?';
    params.push(accountName);
  }

  const [rows] = await pool.execute(query, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  getCredentials
};
