import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import User from '../models/User.model';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'access') return res.status(401).json({ success: false, message: 'Invalid token type' });

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Attaches req.user when a valid access token is present, but never rejects
// the request when it's missing/invalid — used on public routes whose
// response should still vary for the owner/an admin (e.g. property detail,
// an agent's own listings).
export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'access') return next();

    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch (error) {
    next();
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
};