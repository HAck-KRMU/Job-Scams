#!/bin/bash

echo "🚀 Deploying AI-Powered Job Scam Detection & Social Media Crime Prevention Platform..."

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: Docker is not installed." >&2
  exit 1
fi

# Check if Docker Compose is available
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Docker Compose not found. Trying docker compose (v2)..."
  if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Error: Neither docker-compose nor docker compose is available." >&2
    exit 1
  fi
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

# Navigate to deployment directory
cd /Users/brucewayne/Job\ Scam/deployment

echo "🔧 Building and starting services..."
$COMPOSE_CMD -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "✅ Checking service status..."
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "🌐 Access the platform at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000/api/"
echo ""
echo "📊 Health checks:"
echo "   Frontend: http://localhost:3000/health"
echo "   Backend: http://localhost:5000/api/health"
echo ""
echo "📋 To view logs: $COMPOSE_CMD -f docker-compose.prod.yml logs -f"
echo "🔄 To stop: $COMPOSE_CMD -f docker-compose.prod.yml down"