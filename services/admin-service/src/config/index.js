import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  dbUrl: process.env.DATABASE_URL,
  aws: {
    region: process.env.AWS_REGION,
  },
  cognito: {
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    appClientId: process.env.COGNITO_APP_CLIENT_ID,
    jwksUri: process.env.COGNITO_JWKS_URI,
    issuer: process.env.COGNITO_ISSUER,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rootAdminEmail: process.env.ROOT_ADMIN_EMAIL || 'admin@example.com',
  // rootAdminPassword: process.env.ROOT_ADMIN_PASSWORD || 'ChangeMe!123'
};
