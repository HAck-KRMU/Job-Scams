# Docker Setup for Job Scam Detection Platform

This document describes how to set up and run the Job Scam Detection Platform using Docker.

## Prerequisites

- Docker Engine (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

To run the application with Docker, use the provided start script:

```bash
./start-docker.sh
```

This script will prompt you to choose between development and production environments.

## Manual Docker Commands

### Development Environment

To start the development environment manually:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

To stop the development environment:

```bash
docker-compose -f docker-compose.dev.yml down
```

### Production Environment

To start the production environment:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

To stop the production environment:

```bash
docker-compose -f docker-compose.prod.yml down
```

## Services

The Docker setup includes the following services:

### 1. MongoDB
- Image: `mongo:5.0`
- Port: `27017`
- Data persistence via named volume
- Initialized with default collections and indexes
- Admin user created with credentials

### 2. Application Backend
- Built from local Dockerfile
- Port: `5000`
- Environment-specific configurations
- Automatic restart on failure

### 3. MailHog (Development Only)
- Image: `mailhog/mailhog`
- SMTP Port: `1025`
- Web UI Port: `8025`
- Used for testing email functionality

## Environment Variables

The Docker setup uses environment variables for configuration. Copy the `.env.example` file to `.env` and customize it:

```bash
cp .env.example .env
```

Key variables for Docker deployment:
- `MONGO_INITDB_ROOT_USERNAME` - MongoDB admin username
- `MONGO_INITDB_ROOT_PASSWORD` - MongoDB admin password
- `JWT_SECRET` - Secret key for JWT tokens
- `SMTP_*` - Email configuration
- Various other configuration options

## Volumes

- `mongodb_data` - Persistent storage for MongoDB data
- Local logs directory mapping for log persistence

## Networks

All services run on a dedicated Docker network for isolation and communication.

## Development Notes

- The development setup mounts the local source code as a volume for live reloading
- Node modules are stored in a separate volume to persist dependencies
- The application runs in development mode with nodemon for auto-restart

## Production Notes

- Resource limits are set for the application container
- Security options are enabled for enhanced security
- The application runs in production mode
- Environment variables are loaded from the .env file

## Troubleshooting

### Common Issues

1. **Port already in use**: Ensure no other instances are running on ports 27017, 5000, 1025, or 8025
2. **Permission errors**: Ensure Docker has necessary permissions
3. **Connection timeouts**: Wait for MongoDB to fully initialize before the application starts

### Checking Logs

To view logs for specific services:

```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs

# View specific service logs
docker-compose -f docker-compose.dev.yml logs app-dev
docker-compose -f docker-compose.dev.yml logs mongodb-dev
docker-compose -f docker-compose.dev.yml logs mailhog
```

### Database Access

To access the MongoDB shell:

```bash
docker exec -it job-scam-db-dev mongosh -u admin -p password123 --authenticationDatabase admin
```

## Security

- MongoDB authentication is enabled
- Security options are configured for production
- Environment variables are used to manage secrets
- Network isolation is implemented

## Scaling

For production deployments, consider:
- Adding a reverse proxy (nginx)
- Using a managed MongoDB service
- Implementing load balancing
- Adding monitoring and alerting