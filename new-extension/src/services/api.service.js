/**
 * API Service - Handles all server communication
 */
class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Login request - sends username to server, server sends OTP to Telegram
   */
  async login(username, userInfo) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, userInfo })
    });
    return response.json();
  }

  /**
   * Verify OTP code
   */
  async verify(code) {
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return response.json();
  }

  /**
   * Get credentials for a site (copart/iaai)
   */
  async getCredentials(site, accountName = null) {
    const url = accountName 
      ? `${this.baseUrl}/credentials/${site}?account_name=${accountName}`
      : `${this.baseUrl}/credentials/${site}`;
    
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Get UI restrictions CSS for a user
   */
  async getRestrictions(username) {
    const response = await fetch(`${this.baseUrl}/config/restrictions?username=${username}`);
    return response.json();
  }

  /**
   * Get user IP address
   */
  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (e) {
      return 'unknown';
    }
  }
}

export default ApiService;
