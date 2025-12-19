#!/bin/bash
# Production deployment script for Ubuntu

set -e

echo "🚀 Starting AAS Server Deployment..."

# 1. Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install MySQL
echo "📦 Installing MySQL..."
sudo apt install -y mysql-server

# 4. Secure MySQL installation
echo "🔒 Securing MySQL..."
sudo mysql_secure_installation

# 5. Install PM2 (process manager)
echo "📦 Installing PM2..."
sudo npm install -g pm2

# 6. Install Nginx (reverse proxy)
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# 7. Install UFW (firewall)
echo "🔒 Setting up firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ System dependencies installed!"
echo ""
echo "Next steps:"
echo "1. Configure MySQL database (see DEPLOYMENT.md)"
echo "2. Clone your repository"
echo "3. Run setup script"
