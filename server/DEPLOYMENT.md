# AAS Server - Ubuntu Production Deployment Guide

## 📋 Prerequisites

- Ubuntu 20.04 or 22.04 LTS
- Root or sudo access
- Domain name (optional, can use IP address)
- Telegram Bot Token and Chat ID

---

## 🚀 Step-by-Step Deployment

### Step 1: Install System Dependencies

```bash
# Clone the repository
cd ~
git clone <your-repo-url> auction-extension
cd auction-extension/server

# Make scripts executable
chmod +x scripts/*.sh

# Run installation script
sudo bash scripts/install-dependencies.sh
```

This will install:
- Node.js 20.x
- MySQL 8.0
- PM2 (Process Manager)
- Nginx (Reverse Proxy)
- UFW (Firewall)

---

### Step 2: Configure MySQL Database

```bash
# Login to MySQL as root
sudo mysql

# Run these SQL commands:
```

```sql
-- Create database
CREATE DATABASE aas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (replace 'your_secure_password' with a strong password)
CREATE USER 'aas_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON aas_db.* TO 'aas_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

---

### Step 3: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
nano .env
```

Update these values in `.env`:

```env
# Database (use the password you created above)
DATABASE_URL="mysql://aas_user:your_secure_password@localhost:3306/aas_db"

# Server
NODE_ENV=production
PORT=3000

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

Save and exit (Ctrl+X, then Y, then Enter)

---

### Step 4: Setup Application

```bash
# Run setup script
bash scripts/setup.sh
```

This will:
- Install Node.js dependencies
- Generate Prisma client
- Run database migrations
- Start the server with PM2
- Configure PM2 to auto-start on boot

---

### Step 5: Configure Nginx Reverse Proxy

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/aas-server

# Edit the config to set your domain/IP
sudo nano /etc/nginx/sites-available/aas-server
```

Replace `your-domain.com` with your actual domain or server IP.

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/aas-server /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

### Step 6: Seed Database with Initial Data

```bash
# Create admin user and credentials
npx prisma db seed
```

Or manually insert data:

```bash
# Login to MySQL
sudo mysql -u aas_user -p aas_db

# Insert user
INSERT INTO users (username, role, created_at, updated_at) 
VALUES ('usalogistics', 'logistics', NOW(), NOW());

# Insert Copart credentials
INSERT INTO credentials (site, account_name, username, password, created_at, updated_at)
VALUES 
('copart', 'copart1', 'your_copart1_username', 'your_copart1_password', NOW(), NOW()),
('copart', 'copart2', 'your_copart2_username', 'your_copart2_password', NOW(), NOW());

# Insert IAAI credentials
INSERT INTO credentials (site, account_name, username, password, created_at, updated_at)
VALUES ('iaai', 'iaai', 'your_iaai_username', 'your_iaai_password', NOW(), NOW());

EXIT;
```

---

### Step 7: Update Extension Configuration

On your local machine, update the extension to point to your server:

**File:** `new-extension/src/config/constants.js`

```javascript
export const CONFIG = {
  SERVER_URL: 'http://your-server-ip-or-domain'  // Change from localhost:3000
};
```

Reload the extension in Chrome.

---

## 🔒 Optional: Setup SSL/HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

After SSL is configured, update extension to use `https://`:

```javascript
export const CONFIG = {
  SERVER_URL: 'https://your-domain.com'
};
```

---

## 📊 Management Commands

### PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs aas-server

# Restart server
pm2 restart aas-server

# Stop server
pm2 stop aas-server

# Start server
pm2 start aas-server

# View monitoring dashboard
pm2 monit
```

### Database Management

```bash
# Access Prisma Studio (database GUI)
npx prisma studio

# Run migrations
npx prisma migrate deploy

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔍 Troubleshooting

### Server won't start

```bash
# Check PM2 logs
pm2 logs aas-server --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart aas-server
```

### Database connection errors

```bash
# Test MySQL connection
mysql -u aas_user -p aas_db

# Check MySQL is running
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql
```

### Extension can't connect to server

```bash
# Check firewall
sudo ufw status

# Make sure port 80/443 is open
sudo ufw allow 80
sudo ufw allow 443

# Check nginx is running
sudo systemctl status nginx

# Test server endpoint
curl http://localhost:3000/health
```

---

## 🔐 Security Recommendations

1. **Change default passwords** - Use strong, unique passwords for MySQL
2. **Enable firewall** - Only allow necessary ports (22, 80, 443)
3. **Use HTTPS** - Always use SSL in production
4. **Regular updates** - Keep system and dependencies updated
5. **Backup database** - Setup automated backups

```bash
# Example backup script
mysqldump -u aas_user -p aas_db > backup_$(date +%Y%m%d).sql
```

6. **Restrict MySQL** - Only allow localhost connections
7. **Use environment variables** - Never commit `.env` to git
8. **Monitor logs** - Regularly check PM2 and Nginx logs

---

## 📦 Updating the Application

```bash
# Pull latest changes
cd ~/auction-extension/server
git pull

# Install new dependencies
npm install --production

# Run migrations
npx prisma migrate deploy

# Restart server
pm2 restart aas-server
```

---

## 🎯 Quick Reference

| Service | Port | Command |
|---------|------|---------|
| Server | 3000 | `pm2 status` |
| Nginx | 80/443 | `sudo systemctl status nginx` |
| MySQL | 3306 | `sudo systemctl status mysql` |

**Server URL:** `http://your-server-ip:3000` or `http://your-domain.com`

**Health Check:** `http://your-server-ip/health`

---

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs aas-server`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify database connection: `mysql -u aas_user -p aas_db`
4. Test server: `curl http://localhost:3000/health`

---

**Deployment Complete! 🎉**

Your AAS server is now running in production on Ubuntu.
