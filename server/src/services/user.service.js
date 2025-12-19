const pool = require('../config/database');

/**
 * Find user by username
 * @param {string} username
 * @returns {Promise<object|null>}
 */
async function findUserByUsername(username) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Get user role by username
 * @param {string} username
 * @returns {Promise<string>}
 */
async function getUserRole(username) {
  const [rows] = await pool.execute('SELECT role FROM users WHERE username = ?', [username]);
  return rows.length > 0 ? rows[0].role : 'user';
}

module.exports = {
  findUserByUsername,
  getUserRole,
  createUser
};

/**
 * Create a new user
 * @param {string} username
 * @param {string} role
 * @returns {Promise<object>}
 */
async function createUser(username, role = 'user') {
  const [result] = await pool.execute(
    'INSERT INTO users (username, role) VALUES (?, ?)',
    [username, role]
  );
  return { id: result.insertId, username, role };
}
