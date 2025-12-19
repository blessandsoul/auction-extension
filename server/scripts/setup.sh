#!/bin/bash
# Application setup script

set -e

echo "🔧 Setting up AAS Server..."

# 1. Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# 2. Setup environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your production values!"
    exit 1
fi

# 3. Run database migrations
echo "🗄️  Running database migrations..."
npx prisma generate
npx prisma migrate deploy

# 4. Setup PM2
echo "🚀 Setting up PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Application setup complete!"
echo ""
echo "Server is running on port 3000"
echo "Use 'pm2 status' to check status"
echo "Use 'pm2 logs aas-server' to view logs"
