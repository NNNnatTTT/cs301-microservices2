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
      audience: config.cognito.appClientId,
    },
    (err, decoded) => {
      if (err) return next(createError(401, 'Invalid or expired token'));
      req.user = decoded; // contains sub, email, 'cognito:groups', etc.
      next();
    },
  );
}

// Check Cognito groups (e.g., 'admin', 'agent')
export function authorizeGroups(...groups) {
  return (req, _res, next) => {
    const userGroups = req.user?.['cognito:groups'] || [];
    const ok = userGroups.some((g) => groups.includes(g));
    if (!ok) return next(createError(403, 'Forbidden'));
    next();
  };
}

// Root admin only (by email policy)
export function authorizeRootAdmin(req, _res, next) {
  const email = req.user?.email || req.user?.['email'];
  if (
    !email ||
    email.toLowerCase() !== (config.rootAdminEmail || '').toLowerCase()
  ) {
    return next(createError(403, 'Root admin only'));
  }
  next();
}
