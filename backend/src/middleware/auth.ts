import type { RequestHandler } from 'express';
import { verifyAccess, type AccessPayload } from '../lib/jwt.js';
import { forbidden, unauthorized } from '../lib/httpError.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw unauthorized('Missing token');
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw unauthorized('Missing token');
    req.user = verifyAccess(token);
    next();
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(unauthorized('Token expired'));
      return;
    }
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      next(unauthorized('Invalid token'));
      return;
    }
    next(err);
  }
};

export const requireRole = (...roles: AccessPayload['role'][]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'));
  next();
};
