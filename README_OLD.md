# 📱 MoneyTR - Phone Number Authentication Backend

A secure and scalable Node.js Express TypeScript backend API for phone number-based authentication with biometric support, push notifications, and webhook integration.

## 🎯 Features

### Core Authentication
- ✅ **Phone Number Authentication** - International format with E.164 validation
- ✅ **Step-by-Step Login Flow** - Validate phone → Verify PIN
- ✅ **Step-by-Step Registration** - Validate phone → Setup PIN → Complete profile
- ✅ **JWT Token Management** - Access tokens + Refresh tokens
- ✅ **Re-authentication** - PIN or Biometric verification

### Security
- 🔒 **PIN-Based Security** - 6-digit PIN with bcrypt hashing
- 🔒 **Biometric Authentication** - TouchID/FaceID/Fingerprint support
- 🔒 **Account Locking** - Automatic lockout after failed attempts
- 🔒 **Rate Limiting** - Protection against brute force attacks
- 🔒 **Token Blacklisting** - Secure logout implementation
- 🔒 **Helmet.js Security Headers** - XSS, CSRF protection

### Advanced Features
- 🔔 **Push Notifications** - Firebase Cloud Messaging integration
- 🔗 **Webhook Integration** - 2-digit verification for auth requests
- 📱 **Multi-Device Support** - Device token management
- 🔄 **Session Management** - Track and manage active sessions
- 📊 **Comprehensive Logging** - Winston logger with file rotation

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 12+
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet.js, CORS
- **Push Notifications**: Firebase Admin SDK
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- npm or yarn
- Firebase project (for push notifications)

## 🚀 Quick Start

### 1. Clone and Install

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd moneytr_be

# Install dependencies
npm install
\`\`\`

### 2. Environment Setup

\`\`\`bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
\`\`\`

Required environment variables:
\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/moneytr_db"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"
\`\`\`

### 3. Database Setup

\`\`\`bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npm run prisma:seed
\`\`\`

### 4. Run Development Server

\`\`\`bash
# Start development server with hot reload
npm run dev

# Or build and run production
npm run build
npm start
\`\`\`

Server will be running at `http://localhost:3001`

## 🐳 Docker Deployment

### Using Docker Compose

\`\`\`bash
# Start all services (API + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

### Using Docker only

\`\`\`bash
# Build image
docker build -t moneytr-api .

# Run container
docker run -p 3001:3001 --env-file .env moneytr-api
\`\`\`

## 📚 API Documentation

### Authentication Endpoints

#### Login Flow

**Step 1: Validate Phone Number**
\`\`\`http
POST /api/step-auth/login/validate-phone
Content-Type: application/json

{
  "phoneNumber": "+14155552671"
}
\`\`\`

**Step 2: Verify PIN**
\`\`\`http
POST /api/step-auth/login/verify-pin
Content-Type: application/json

{
  "tempToken": "temp_token_from_step_1",
  "pin": "123456",
  "deviceId": "device-uuid",
  "deviceToken": "fcm-token"
}
\`\`\`

#### Registration Flow

**Step 1: Validate Phone Number**
\`\`\`http
POST /api/step-auth/register/validate-phone
Content-Type: application/json

{
  "phoneNumber": "+14155552671"
}
\`\`\`

**Step 2: Setup PIN**
\`\`\`http
POST /api/step-auth/register/setup-pin
Content-Type: application/json

{
  "tempToken": "temp_token_from_step_1",
  "pin": "123456",
  "confirmPin": "123456"
}
\`\`\`

**Step 3: Complete Profile**
\`\`\`http
POST /api/step-auth/register/complete-profile
Content-Type: application/json

{
  "tempToken": "temp_token_from_step_2",
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

### Token Management

**Refresh Token**
\`\`\`http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
\`\`\`

**Logout**
\`\`\`http
POST /api/auth/logout
Authorization: Bearer {access_token}
\`\`\`

### Biometric Authentication

**Generate Challenge**
\`\`\`http
POST /api/step-auth/biometric/challenge
Content-Type: application/json

{
  "phoneNumber": "+14155552671"
}
\`\`\`

**Enroll Biometric**
\`\`\`http
POST /api/step-auth/biometric/enroll
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "publicKey": "base64_public_key",
  "biometryType": "FaceID",
  "deviceId": "device-uuid"
}
\`\`\`

### User Profile

**Get Profile**
\`\`\`http
GET /api/user/profile
Authorization: Bearer {access_token}
\`\`\`

**Update Profile**
\`\`\`http
PATCH /api/user/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}
\`\`\`

**Change PIN**
\`\`\`http
POST /api/user/change-pin
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "currentPin": "123456",
  "newPin": "654321",
  "confirmPin": "654321"
}
\`\`\`

### Device Management

**Register Device**
\`\`\`http
POST /api/device/register
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "deviceId": "device-uuid",
  "deviceToken": "fcm-token",
  "platform": "ios",
  "appVersion": "1.0.0"
}
\`\`\`

**List Devices**
\`\`\`http
GET /api/device/list
Authorization: Bearer {access_token}
\`\`\`

### Health Checks

\`\`\`http
GET /health              # Basic health check
GET /health/db           # Database health check
\`\`\`

## 📁 Project Structure

\`\`\`
moneytr_be/
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeding
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── stepAuthController.ts
│   │   ├── biometricController.ts
│   │   ├── authController.ts
│   │   ├── deviceController.ts
│   │   ├── userController.ts
│   │   └── webhookController.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiting.ts
│   │   └── validation.ts
│   ├── routes/               # API routes
│   │   ├── stepAuth.ts
│   │   ├── auth.ts
│   │   ├── device.ts
│   │   ├── user.ts
│   │   ├── webhook.ts
│   │   └── health.ts
│   ├── services/             # Business logic
│   │   ├── database.ts
│   │   └── pushNotification.ts
│   ├── utils/                # Utility functions
│   │   ├── config.ts
│   │   ├── crypto.ts
│   │   ├── jwt.ts
│   │   ├── helpers.ts
│   │   └── logger.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── server.ts             # Express app entry
├── tests/                    # Test files
├── logs/                     # Log files
├── .env.example              # Environment template
├── docker-compose.yml        # Docker compose config
├── Dockerfile                # Docker configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm run test:watch
\`\`\`

## 🔐 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, random secrets (min 32 characters)
3. **PIN Storage**: Pins are hashed with bcrypt (12 rounds)
4. **Rate Limiting**: Configured per endpoint
5. **Account Locking**: 5 failed attempts = 30 min lockout
6. **Token Expiry**: 
   - Access tokens: 15 minutes
   - Refresh tokens: 7 days
   - Temp tokens: 5 minutes
7. **HTTPS**: Always use HTTPS in production
8. **Database**: Use connection pooling and prepared statements

## 📊 Database Schema

### Key Models

- **User**: Phone number, PIN hash, biometric settings
- **Session**: Active user sessions with refresh tokens
- **DeviceToken**: FCM tokens for push notifications
- **AuthRequest**: Webhook authentication requests
- **VerificationRequest**: 2-digit verification codes
- **UserBiometricKey**: Biometric public keys
- **BiometricChallenge**: Challenge-response authentication
- **BlacklistedToken**: Revoked JWT tokens

## 🔄 Database Migrations

\`\`\`bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View Prisma Studio
npx prisma studio
\`\`\`

## 📝 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment mode | Yes | development |
| PORT | Server port | Yes | 3001 |
| DATABASE_URL | PostgreSQL connection string | Yes | - |
| JWT_SECRET | Access token secret | Yes | - |
| JWT_REFRESH_SECRET | Refresh token secret | Yes | - |
| JWT_EXPIRES_IN | Access token expiry | No | 15m |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiry | No | 7d |
| BCRYPT_SALT_ROUNDS | Bcrypt rounds | No | 12 |
| MAX_LOGIN_ATTEMPTS | Failed login threshold | No | 5 |
| FIREBASE_PROJECT_ID | Firebase project ID | No | - |
| FIREBASE_PRIVATE_KEY | Firebase private key | No | - |
| FIREBASE_CLIENT_EMAIL | Firebase client email | No | - |
| ALLOWED_ORIGINS | CORS origins (comma-separated) | No | - |
| LOG_LEVEL | Winston log level | No | info |

## 🛠️ Development Scripts

\`\`\`bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm test                 # Run tests
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
\`\`\`

## 🚨 Troubleshooting

### Database Connection Issues
\`\`\`bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -h localhost -U username -d moneytr_db
\`\`\`

### Port Already in Use
\`\`\`bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
\`\`\`

### Prisma Issues
\`\`\`bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
\`\`\`

## 📄 License

MIT License - see LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Contact: support@moneytr.com

## 🎯 Roadmap

- [ ] SMS OTP verification
- [ ] Email verification
- [ ] Social auth integration (Google, Apple)
- [ ] WebAuthn support
- [ ] Admin dashboard
- [ ] Analytics and monitoring
- [ ] Rate limiting per user
- [ ] IP whitelisting
- [ ] Multi-language support

## 🙏 Acknowledgments

- Express.js team
- Prisma team
- Firebase team
- All open-source contributors

---

**Built with ❤️ for MoneyTR**
