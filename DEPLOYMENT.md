# Deployment Instructions

## AI-Powered Job Scam Detection & Social Media Crime Prevention Platform

This document provides instructions for deploying the platform to production.

## Prerequisites

- Docker
- Docker Compose
- At least 4GB RAM available for containers

## Quick Deployment

To deploy the platform in production mode:

```bash
./deployment/deploy.sh
```

## Manual Deployment

### 1. Environment Configuration

Create a `.env` file in the deployment directory with your production settings:

```bash
# Database
MONGO_INITDB_ROOT_USERNAME=your_admin_username
MONGO_INITDB_ROOT_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_super_long_and_secure_jwt_secret

# SMTP (for email notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_EMAIL=your_email@domain.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=notifications@yourdomain.com

# URLs
CLIENT_URL=https://yourdomain.com
```

### 2. Build and Deploy

```bash
cd deployment
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Verify Deployment

Check that all services are running:

```bash
docker-compose -f docker-compose.prod.yml ps
```

## Service URLs

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000/api/
- **Health Checks**:
  - Frontend: http://localhost:3000/health
  - Backend: http://localhost:5000/api/health

## Managing the Deployment

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Services
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## Production Security Considerations

1. **Use HTTPS**: Configure SSL certificates for the Nginx proxy
2. **Secure Environment Variables**: Never commit secrets to version control
3. **Database Security**: Use strong passwords and restrict network access
4. **API Rate Limiting**: Built-in protection against abuse
5. **Regular Updates**: Keep all dependencies up to date

## Architecture Overview

- **Frontend**: Express server serving static dashboard files with API proxy
- **Backend**: Node.js/Express API server with ML-powered scam detection
- **Database**: MongoDB for data persistence
- **Reverse Proxy**: Nginx for load balancing and SSL termination (optional)

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 80, 443, 3000, 5000, and 27017 are available
2. **Insufficient Resources**: Increase Docker memory allocation to at least 4GB
3. **Permission Issues**: Ensure proper file permissions for volume mounts

### Health Checks

Monitor service health using the built-in endpoints:
- Frontend: `GET /health`
- Backend: `GET /api/health`
- Individual API endpoints: `GET /api/*`

## Scaling

The platform is designed to be horizontally scalable. For high-availability deployments:

1. Use Docker Swarm or Kubernetes for orchestration
2. Implement external load balancing
3. Use managed database services (MongoDB Atlas, etc.)
4. Implement CDN for static assets