require('dotenv').config();

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'edutest_jwt_secret_key_2026_secure',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};

module.exports = jwtConfig;
