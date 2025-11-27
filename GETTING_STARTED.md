# 🚀 Getting Started Guide - MoneyTR Backend

## Step-by-Step Setup Instructions

### 1. Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ PostgreSQL 12+ running (`psql --version`)
- ✅ Git installed
- ✅ A code editor (VS Code recommended)

### 2. Installation

\`\`\`bash
# Navigate to project directory
cd moneytr_be

# Install dependencies (this will take a few minutes)
npm install

# Verify installation
npm list --depth=0
\`\`\`

### 3. Database Setup

#### Option A: Local PostgreSQL

\`\`\`bash
# Create database
createdb moneytr_db

# Or using psql
psql -U postgres
CREATE DATABASE moneytr_db;
\\q
\`\`\`

#### Option B: Docker PostgreSQL

\`\`\`bash
# Start PostgreSQL in Docker
docker run --name moneytr-postgres \\
  -e POSTGRES_USER=moneytr \\
  -e POSTGRES_PASSWORD=moneytr_password \\
  -e POSTGRES_DB=moneytr_db \\
  -p 5432:5432 \\
  -d postgres:15-alpine
\`\`\`

### 4. Environment Configuration

\`\`\`bash
# Copy example environment file
cp .env.example .env

# Open and edit .env
nano .env  # or use your preferred editor
\`\`\`

**Required configurations:**

\`\`\`env
# Database - Update with your credentials
DATABASE_URL="postgresql://moneytr:moneytr_password@localhost:5432/moneytr_db?schema=public"

# JWT Secrets - Generate strong random strings
JWT_SECRET="generate-a-random-32-char-string-here"
JWT_REFRESH_SECRET="generate-another-random-32-char-string"

# CORS - Add your frontend URLs
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
\`\`\`

**Generate JWT secrets:**
\`\`\`bash
# Use Node.js crypto to generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

### 5. Database Migrations

\`\`\`bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed test data (optional but recommended)
npm run prisma:seed

# Verify database
npx prisma studio
\`\`\`

### 6. Start Development Server

\`\`\`bash
# Start server with hot reload
npm run dev

# You should see:
# 🔌 Connecting to database...
# ✅ Database connected successfully
# 🚀 Server running on port 3001
# 📝 Environment: development
\`\`\`

### 7. Test the API

Open a new terminal and test the health endpoint:

\`\`\`bash
# Test basic health
curl http://localhost:3001/health

# Test database health
curl http://localhost:3001/health/db

# Test registration (should work)
curl -X POST http://localhost:3001/api/step-auth/register/validate-phone \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+14155552671"}'
\`\`\`

### 8. Firebase Setup (Optional - for Push Notifications)

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com
   - Create new project
   - Enable Cloud Messaging

2. **Get Service Account:**
   - Project Settings → Service Accounts
   - Generate new private key (downloads JSON)

3. **Update .env:**
   \`\`\`env
   FIREBASE_PROJECT_ID="your-project-id"
   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYourKey\\n-----END PRIVATE KEY-----\\n"
   \`\`\`

### 9. Production Build

\`\`\`bash
# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
\`\`\`

## 🧪 Testing Your Setup

### Run Automated Tests

\`\`\`bash
npm test
\`\`\`

### Manual API Testing

Use the provided test script:

\`\`\`bash
# Create a test script
cat > test-api.sh << 'EOF'
#!/bin/bash
BASE_URL="http://localhost:3001"

echo "Testing Health Endpoint..."
curl -s $BASE_URL/health | jq

echo "\\nTesting Registration..."
RESPONSE=$(curl -s -X POST $BASE_URL/api/step-auth/register/validate-phone \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+19876543210"}')

echo $RESPONSE | jq

TEMP_TOKEN=$(echo $RESPONSE | jq -r '.data.tempToken')

if [ "$TEMP_TOKEN" != "null" ]; then
  echo "\\nSetting up PIN..."
  curl -s -X POST $BASE_URL/api/step-auth/register/setup-pin \\
    -H "Content-Type: application/json" \\
    -d "{
      \\"tempToken\\": \\"$TEMP_TOKEN\\",
      \\"pin\\": \\"123456\\",
      \\"confirmPin\\": \\"123456\\"
    }" | jq
fi
EOF

chmod +x test-api.sh
./test-api.sh
\`\`\`

## 🐳 Docker Deployment

### Using Docker Compose (Easiest)

\`\`\`bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
\`\`\`

### Using Docker Only

\`\`\`bash
# Build image
docker build -t moneytr-api:latest .

# Run container
docker run -d \\
  --name moneytr-api \\
  -p 3001:3001 \\
  --env-file .env \\
  moneytr-api:latest

# View logs
docker logs -f moneytr-api
\`\`\`

## 📊 Prisma Studio (Database GUI)

\`\`\`bash
# Open Prisma Studio
npx prisma studio

# Opens at: http://localhost:5555
\`\`\`

You can now:
- Browse all tables
- View/edit data
- Run queries
- See relationships

## 🔧 Common Commands

\`\`\`bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed test data

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Check linting
npm run lint:fix         # Fix linting issues
npm run format           # Format code
\`\`\`

## 🎯 Next Steps

1. ✅ Read the full API documentation in README.md
2. ✅ Explore the codebase structure
3. ✅ Test all authentication flows
4. ✅ Set up your frontend integration
5. ✅ Configure Firebase for push notifications
6. ✅ Set up monitoring and logging
7. ✅ Configure production environment

## 🐛 Troubleshooting

### "Port 3001 already in use"
\`\`\`bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
\`\`\`

### "Database connection failed"
\`\`\`bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U moneytr -d moneytr_db

# Check DATABASE_URL in .env
\`\`\`

### "Prisma Client not found"
\`\`\`bash
# Regenerate Prisma Client
npx prisma generate

# If still failing, delete and reinstall
rm -rf node_modules
npm install
\`\`\`

### "TypeScript compilation errors"
\`\`\`bash
# Clean build directory
rm -rf dist

# Rebuild
npm run build
\`\`\`

## 📞 Getting Help

- 📖 Check README.md for detailed documentation
- 🐛 Search existing issues on GitHub
- 💬 Create a new issue with error logs
- 📧 Contact support@moneytr.com

## ✅ Success Checklist

- [ ] Dependencies installed successfully
- [ ] Database created and connected
- [ ] Environment variables configured
- [ ] Migrations run successfully
- [ ] Test data seeded
- [ ] Server starts without errors
- [ ] Health endpoints respond correctly
- [ ] Can register a new user
- [ ] Can login with phone + PIN
- [ ] JWT tokens work correctly
- [ ] All tests pass

**Congratulations! Your MoneyTR backend is ready! 🎉**
