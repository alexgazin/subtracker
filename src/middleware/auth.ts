import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    plan: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    res.locals.user = decoded; // for EJS templates
    next();
  } catch (err) {
    res.clearCookie('token');
    res.redirect('/login');
  }
};
