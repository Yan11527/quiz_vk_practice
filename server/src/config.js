const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? '' : 'dev-jwt-secret-for-local-run-only');
const fallbackClientOrigin = !IS_PRODUCTION
  ? 'http://localhost:5173'
  : process.env.FLY_APP_NAME
    ? `https://${process.env.FLY_APP_NAME}.fly.dev`
    : '';
const CLIENT_ORIGINS = String(
  process.env.CLIENT_ORIGIN || fallbackClientOrigin,
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set it via environment variable.');
}

if (CLIENT_ORIGINS.length === 0) {
  throw new Error('CLIENT_ORIGIN is required. Set one or more allowed origins separated by commas.');
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  return CLIENT_ORIGINS.includes(origin);
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin denied'));
  },
  credentials: true,
};

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  PORT,
  JWT_SECRET,
  CLIENT_ORIGINS,
  DATA_DIR,
  UPLOADS_DIR,
  isOriginAllowed,
  corsOptions,
};
