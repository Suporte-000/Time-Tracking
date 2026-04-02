#!/bin/bash

# TimeTrack Server - Railway Deployment Script

echo "🚀 TimeTrack Server - Railway Deployment"
echo "=========================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g railway
fi

echo "✅ Railway CLI ready"
echo ""

# Login to Railway
echo "📝 Logging in to Railway..."
railway login

echo ""
echo "🔗 Linking to Railway project..."
railway link

echo ""
echo "📦 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run: railway run npx prisma db push"
echo "2. Run: railway run npm run seed"
echo "3. Test: curl https://your-url/health"
echo ""
echo "Done! 🎉"
