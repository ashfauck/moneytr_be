import dotenv from 'dotenv';

dotenv.config();

interface Config {
  node_env: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    tempTokenExpiresIn: string;
    biometricChallengeExpiresIn: string;
  };
  security: {
    bcryptSaltRounds: number;
    maxLoginAttempts: number;
    accountLockoutTimeMs: number;
  };
  session: {
    expiresIn: string;
    deviceTokenExpiresIn: string;
  };
  registration: {
    tempTokenExpiresIn: string;
    profileSetupExpiresIn: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  logging: {
    level: string;
    filePath: string;
  };
}

const config: Config = {
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    tempTokenExpiresIn: process.env.JWT_TEMP_TOKEN_EXPIRES_IN || '5m',
    biometricChallengeExpiresIn: process.env.JWT_BIOMETRIC_CHALLENGE_EXPIRES_IN || '5m',
  },
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    accountLockoutTimeMs: parseInt(process.env.ACCOUNT_LOCKOUT_TIME_MS || '1800000', 10),
  },
  session: {
    expiresIn: process.env.SESSION_EXPIRES_IN || '7d',
    deviceTokenExpiresIn: process.env.DEVICE_TOKEN_EXPIRES_IN || '90d',
  },
  registration: {
    tempTokenExpiresIn: process.env.REGISTRATION_TEMP_TOKEN_EXPIRES_IN || '10m',
    profileSetupExpiresIn: process.env.REGISTRATION_PROFILE_SETUP_EXPIRES_IN || '30m',
  },
  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
};

export default config;
