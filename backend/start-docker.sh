#!/bin/bash

echo "Starting Job Scam Detection Platform with Docker..."

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "Error: Docker is not installed." >&2
  exit 1
fi

# Check if Docker Compose is available
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Docker Compose not found. Trying docker compose (v2)..."
  if ! docker compose version >/dev/null 2>&1; then
    echo "Error: Neither docker-compose nor docker compose is available." >&2
    exit 1
  fi
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

# Ask user for environment
echo "Choose environment:"
echo "1) Development"
echo "2) Production"
read -p "Enter choice (1 or 2): " env_choice

case $env_choice in
  1)
    echo "Starting development environment..."
    $COMPOSE_CMD -f docker-compose.dev.yml up -d
    echo "Development environment started!"
    echo "MongoDB is running on port 27017"
    echo "Application is running on port 5000"
    echo "MailHog is running on port 8025 (UI) and 1025 (SMTP)"
    ;;
  2)
    echo "Starting production environment..."
    $COMPOSE_CMD -f docker-compose.prod.yml up -d
    echo "Production environment started!"
    echo "MongoDB is running on port 27017"
    echo "Application is running on port 5000"
    ;;
  *)
    echo "Invalid choice. Starting default (development) environment..."
    $COMPOSE_CMD -f docker-compose.dev.yml up -d
    echo "Development environment started!"
    echo "MongoDB is running on port 27017"
    echo "Application is running on port 5000"
    echo "MailHog is running on port 8025 (UI) and 1025 (SMTP)"
    ;;
esac

# Show running containers
echo ""
echo "Running containers:"
$COMPOSE_CMD ps