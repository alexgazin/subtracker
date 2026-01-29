import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).render('pages/error', {
      user: req.user,
      code: 403,
      message: 'Доступ запрещен. Только для администраторов.',
      page: 'error'
    });
  }
};
