import createError from 'http-errors';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config/index.js';

const client = jwksClient({ jwksUri: config.cognito.jwksUri });

function getKey(header, cb) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return cb(err);
    const signingKey = key.getPublicKey();
    cb(null, signingKey);
  });
}

export function authenticateCognito(req, _res, next) {
  const header = req.headers['authorization'];
  if (!header) return next(createError(401, 'Missing Authorization header'));

  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token)
    return next(createError(401, 'Invalid Authorization header'));

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ['RS256'],
      issuer: config.cognito.issuer,
      // audience: config.cognito.appClientId, // not needed for access tokens
    },
    (err, decoded) => {
      if (err) return next(createError(401, 'Invalid or expired token'));

      // Ensure token is an access token (not ID token)
      if (decoded.token_use !== 'access') {
        return next(createError(401, 'Invalid token type'));
      }

      // Attach decoded payload (sub, groups, etc.) to request
      req.user = decoded;
      next();
    },
  );
}

// Admin only (by cognito's group)
export function authorizeAdmin(req, _res, next) {
  const groups = req.user?.['cognito:groups'] || [];
  if (!groups.includes('admin')) {
    return next(createError(403, 'Admin only'));
  }
  next();
}
