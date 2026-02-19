# AI-Powered Job Scam Detection & Social Media Crime Prevention Platform - Backend

This is the backend for an advanced platform designed to detect job scams and prevent social media crimes using artificial intelligence and machine learning technologies.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Job Listing Management**: Create, update, and search job listings
- **AI-Powered Scam Detection**: Machine learning algorithms to detect potential scams
- **Social Media Monitoring**: Track suspicious activities across various platforms
- **Reporting System**: Submit and manage scam reports
- **Analytics Dashboard**: Comprehensive reporting and analytics
- **Admin Panel**: Manage users, content, and platform operations

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB/Mongoose** - Database and ODM
- **JWT** - Authentication
- **Natural** - Natural Language Processing
- **TensorFlow.js** - Machine Learning
- **Sentiment Analysis** - Text sentiment analysis
- **Nodemailer** - Email handling
- **Winston** - Logging

## Installation

### Option 1: Direct Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration

5. Start the server:
```bash
npm run dev  # for development
npm start    # for production
```

### Option 2: Docker Installation (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Make the start script executable:
```bash
chmod +x start-docker.sh
```

3. Run the Docker setup script:
```bash
./start-docker.sh
```

4. Or run manually with Docker Compose:
```bash
# For development
docker-compose -f docker-compose.dev.yml up -d

# For production
docker-compose -f docker-compose.prod.yml up -d
```

For detailed Docker setup instructions, see [Docker-README.md](./Docker-README.md).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify/:token` - Verify email
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:resettoken` - Reset password
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/updatedetails` - Update user details
- `PUT /api/auth/updatepassword` - Update password
- `GET /api/auth/logout` - Logout user

### Jobs
- `GET /api/jobs` - Get all job listings
- `POST /api/jobs` - Create a new job listing
- `GET /api/jobs/:id` - Get a specific job listing
- `PUT /api/jobs/:id` - Update a job listing
- `DELETE /api/jobs/:id` - Delete a job listing
- `POST /api/jobs/:id/apply` - Apply to a job
- `POST /api/jobs/:id/flag` - Flag a job as suspicious
- `GET /api/jobs/search` - Search job listings
- `GET /api/jobs/my-jobs` - Get user's posted jobs
- `GET /api/jobs/my-applications` - Get user's job applications

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/my-reported-jobs` - Get user's reported jobs
- `GET /api/users/my-scams` - Get user's scam reports
- `GET /api/users/my-activities` - Get user's suspicious activities
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `PUT /api/users/:id/role` - Change user role (admin only)

### Reports & Analytics
- `GET /api/reports/dashboard` - Get dashboard analytics
- `GET /api/reports/scams` - Get scam reports
- `GET /api/reports/performance` - Get performance analytics
- `GET /api/reports/users` - Get user activity report
- `GET /api/reports/activities` - Get suspicious activity report
- `GET /api/reports/comprehensive` - Get comprehensive report (admin only)
- `GET /api/reports/export/:type` - Export reports (admin only)

### Machine Learning
- `POST /api/ml/analyze-job` - Analyze job posting for scams
- `POST /api/ml/batch-analyze` - Batch analyze job postings
- `GET /api/ml/stats` - Get ML statistics
- `POST /api/ml/retrain` - Retrain ML model (admin only)
- `GET /api/ml/performance` - Get model performance
- `POST /api/ml/analyze-activity` - Analyze suspicious activity

### Social Media Monitoring
- `POST /api/social-media/monitor` - Monitor social media
- `POST /api/social-media/monitor-users` - Monitor specific users
- `GET /api/social-media/trends` - Get trending topics
- `GET /api/social-media/alerts` - Get recent alerts
- `GET /api/social-media/stats` - Get activity statistics
- `GET /api/social-media/activities` - Get suspicious activities
- `POST /api/social-media/activities` - Create manual activity report
- `GET /api/social-media/activities/:id` - Get specific activity
- `PUT /api/social-media/activities/:id` - Update activity status

### Health Check
- `GET /api/health` - Check API health status

## Environment Variables

The application requires the following environment variables:

- `NODE_ENV` - Environment mode (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT expiration time
- `SMTP_*` - Email configuration
- `SOCIAL_MEDIA_*` - Social media API keys (optional)
- `CLOUDINARY_*` - Cloudinary configuration (for file uploads)

## Models

### User
- User profiles with authentication and role management

### JobListing
- Job posting information with scam detection fields

### ScamReport
- Reports of potential scams with analysis

### SuspiciousActivity
- Monitored activities from social media and other sources

### ModelPerformance
- Tracking of ML model performance metrics

## Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting
- Input validation
- Password hashing with bcrypt
- Helmet.js security headers
- CORS configuration

## Machine Learning Components

- Natural language processing for text analysis
- Sentiment analysis for detecting suspicious content
- TF-IDF for keyword importance scoring
- Naive Bayes classifier for scam detection
- Custom rules engine for pattern matching
- Continuous model improvement

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.