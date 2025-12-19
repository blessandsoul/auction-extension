#!/bin/bash
# Quick deployment script - Run this on your Ubuntu server

echo "🚀 AAS Server - Quick Deploy"
echo "=============================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Step 1/5: Installing system dependencies..."
bash scripts/install-dependencies.sh

# Step 2: MySQL setup prompt
echo ""
echo "📝 Step 2/5: MySQL Configuration"
echo "Please configure MySQL manually:"
echo ""
echo "Run these commands in MySQL:"
echo "  sudo mysql"
echo "  CREATE DATABASE aas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "  CREATE USER 'aas_user'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';"
echo "  GRANT ALL PRIVILEGES ON aas_db.* TO 'aas_user'@'localhost';"
echo "  FLUSH PRIVILEGES;"
echo "  EXIT;"
echo ""
read -p "Press Enter after you've configured MySQL..."

# Step 3: Environment setup
echo ""
echo "📝 Step 3/5: Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "  nano .env"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi

# Step 4: Application setup
echo ""
echo "🔧 Step 4/5: Setting up application..."
bash scripts/setup.sh

# Step 5: Nginx setup
echo ""
echo "🌐 Step 5/5: Setting up Nginx..."
cp nginx.conf /etc/nginx/sites-available/aas-server
ln -sf /etc/nginx/sites-available/aas-server /etc/nginx/sites-enabled/

echo ""
echo "⚠️  Please edit Nginx config with your domain:"
echo "  sudo nano /etc/nginx/sites-available/aas-server"
echo ""
read -p "Press Enter after you've configured Nginx..."

nginx -t && systemctl reload nginx

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Server is running on:"
echo "  - Local: http://localhost:3000"
echo "  - Public: http://your-server-ip"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check server status"
echo "  pm2 logs aas-server - View logs"
echo "  pm2 restart aas-server - Restart server"
echo ""
echo "Next steps:"
echo "1. Update extension constants.js with your server URL"
echo "2. Load extension in Chrome"
echo "3. Test login functionality"
