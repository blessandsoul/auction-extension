#!/bin/bash
# Production Readiness Check Script

echo "🔍 AAS Production Readiness Check"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Environment file
echo "📝 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "  ✅ .env file exists"
    
    # Check required variables
    if grep -q "DATABASE_URL=" .env && ! grep -q "your_secure_password" .env; then
        echo "  ✅ DATABASE_URL configured"
    else
        echo "  ❌ DATABASE_URL not properly configured"
        ((ERRORS++))
    fi
    
    if grep -q "TELEGRAM_BOT_TOKEN=" .env && ! grep -q "your_telegram_bot_token" .env; then
        echo "  ✅ TELEGRAM_BOT_TOKEN configured"
    else
        echo "  ❌ TELEGRAM_BOT_TOKEN not configured"
        ((ERRORS++))
    fi
else
    echo "  ❌ .env file missing"
    ((ERRORS++))
fi

echo ""

# Check 2: Dependencies
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules exists"
else
    echo "  ❌ node_modules missing - run 'npm install'"
    ((ERRORS++))
fi

echo ""

# Check 3: Database
echo "🗄️  Checking database..."
if command -v mysql &> /dev/null; then
    echo "  ✅ MySQL installed"
else
    echo "  ❌ MySQL not installed"
    ((ERRORS++))
fi

echo ""

# Check 4: PM2
echo "🔧 Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo "  ✅ PM2 installed"
else
    echo "  ⚠️  PM2 not installed - run 'sudo npm install -g pm2'"
    ((WARNINGS++))
fi

echo ""

# Check 5: Nginx
echo "🌐 Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo "  ✅ Nginx installed"
    
    if [ -f "/etc/nginx/sites-available/aas-server" ]; then
        echo "  ✅ Nginx config exists"
    else
        echo "  ⚠️  Nginx config not found"
        ((WARNINGS++))
    fi
else
    echo "  ⚠️  Nginx not installed"
    ((WARNINGS++))
fi

echo ""

# Check 6: Firewall
echo "🔒 Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "  ✅ UFW firewall active"
    else
        echo "  ⚠️  UFW firewall not active"
        ((WARNINGS++))
    fi
else
    echo "  ⚠️  UFW not installed"
    ((WARNINGS++))
fi

echo ""

# Check 7: Prisma
echo "🔧 Checking Prisma..."
if [ -d "node_modules/.prisma" ]; then
    echo "  ✅ Prisma client generated"
else
    echo "  ❌ Prisma client not generated - run 'npx prisma generate'"
    ((ERRORS++))
fi

echo ""

# Summary
echo "=================================="
echo "📊 Summary"
echo "=================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ All checks passed! Ready for production."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Some warnings found. Review and fix if needed."
    exit 0
else
    echo "❌ Errors found. Please fix before deploying."
    exit 1
fi
