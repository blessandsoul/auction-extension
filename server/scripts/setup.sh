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

# 4. Create logs directory
mkdir -p logs

# 5. Setup PM2
echo "🚀 Setting up PM2..."
if ! command -v pm2 &> /dev/null
then
    echo "📦 PM2 not found. Installing global pm2..."
    npm install -g pm2
fi

pm2 delete aas-server 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Application setup complete!"
echo ""
echo "Server is running on port 3000"
echo "Use 'pm2 status' to check status"
echo "Use 'pm2 logs aas-server' to view logs"
