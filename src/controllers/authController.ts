import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/db';
import { AnalyticsService } from '../services/analyticsService';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password } = req.body;

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,15}$/;
    if (!passwordRegex.test(password)) {
      return res.render('pages/register', { 
        user: null, 
        error: 'Пароль должен быть от 8 до 15 символов и содержать заглавные/строчные буквы, цифры и спецсимволы.', 
        page: 'register' 
      });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.render('pages/register', { user: null, error: 'Email уже занят', page: 'register' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, plan: 'FREE' }
      });

      await AnalyticsService.trackEvent(user.id, 'user_registered');

      const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.redirect('/app/dashboard');
    } catch (err) {
      res.render('pages/register', { user: null, error: 'Ошибка при регистрации', page: 'register' });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.render('pages/login', { user: null, error: 'Неверный email или пароль', page: 'login' });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      await AnalyticsService.trackEvent(user.id, 'user_logged_in');

      const token = jwt.sign({ id: user.id, email: user.email, plan: user.plan, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.redirect('/app/dashboard');
    } catch (err) {
      res.render('pages/login', { user: null, error: 'Ошибка при входе', page: 'login' });
    }
  }

  static logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.redirect('/');
  }
}
