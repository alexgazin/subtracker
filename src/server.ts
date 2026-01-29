import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AuthController } from './controllers/authController';
import { AppController } from './controllers/appController';
import { authMiddleware } from './middleware/auth';
import { AdminController } from './controllers/adminController';
import { adminMiddleware } from './middleware/admin';
import { logger } from './services/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "script-src-attr": ["'unsafe-inline'"],
      "connect-src": ["'self'"], // Allow fetch requests to self
    },
  },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже через 15 минут'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// Public Routes
app.get('/', (req, res) => res.render('pages/index', { user: null, page: 'home' }));
app.get('/login', authLimiter, (req, res) => res.render('pages/login', { user: null, error: null, page: 'login' }));
app.post('/auth/login', authLimiter, AuthController.login);
app.get('/register', authLimiter, (req, res) => res.render('pages/register', { user: null, error: null, page: 'register' }));
app.post('/auth/register', authLimiter, AuthController.register);
app.get('/auth/logout', AuthController.logout);
app.get('/pricing', (req, res) => res.render('pages/pricing', { user: null, page: 'pricing' }));
app.get('/privacy', (req, res) => res.render('pages/privacy', { user: null, page: 'privacy' }));
app.get('/terms', (req, res) => res.render('pages/terms', { user: null, page: 'terms' }));
app.get('/support', (req, res) => res.render('pages/support', { user: null, page: 'support' }));
app.post('/support', (req, res) => {
  logger.info(`Support request from ${req.body.email}: ${req.body.message}`);
  res.render('pages/error', { user: null, code: 'OK', message: 'Спасибо! Ваше сообщение отправлено. Мы ответим вам в ближайшее время.', page: 'support' });
});

// Protected App Routes
app.use('/app', authMiddleware);
app.get('/app/dashboard', AppController.getDashboard);
app.get('/app/subscriptions', AppController.getSubscriptions);
app.get('/app/subscriptions/new', (req, res) => res.render('pages/subscription_form', { user: (req as any).user, error: null, sub: null, unreadNotifications: 0, page: 'subscriptions' }));
app.post('/app/subscriptions', AppController.createSubscription);
app.get('/app/subscriptions/:id/edit', AppController.getEditSubscription);
app.post('/app/subscriptions/:id', AppController.updateSubscription);
app.post('/app/subscriptions/:id/delete', AppController.deleteSubscription);
app.post('/app/subscriptions/:id/toggle-favorite', AppController.toggleFavorite);
app.get('/app/notifications', AppController.getNotifications);
app.post('/app/notifications/mark-all-read', AppController.markAllAsRead);
app.post('/app/notifications/:id/read', AppController.markAsRead);
app.delete('/app/notifications/:id', AppController.deleteNotification);
app.get('/app/settings', AppController.getSettings);
app.post('/app/settings/change-password', AppController.changePassword);
app.post('/app/settings/upgrade-demo', AppController.upgradeDemo);
app.get('/app/annual-report', AppController.getAnnualReport);
app.get('/app/export-csv', AppController.exportCSV);
app.get('/app/inbox', AppController.getInbox);
app.post('/app/inbox/response', AppController.postInboxResponse);
app.post('/app/inbox/undo', AppController.postInboxUndo);

// Admin Routes
app.use('/app/admin', adminMiddleware);
app.get('/app/admin', AdminController.getDashboard);
app.get('/app/admin/users', AdminController.getUsers);
app.post('/app/admin/users/plan', AdminController.updateUserPlan);
app.post('/app/admin/users/delete', AdminController.deleteUser);

// Error Handling
app.use((req, res) => {
  res.status(404).render('pages/error', { 
    user: (req as any).user || null, 
    code: 404, 
    message: 'Страница не найдена',
    page: 'error'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err);
  res.status(500).render('pages/error', { 
    user: (req as any).user || null, 
    code: 500, 
    message: 'Внутренняя ошибка сервера',
    page: 'error'
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
