import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../services/db';
import { BillingService } from '../services/billingService';
import { NotificationService } from '../services/notificationService';
import { AnalyticsService } from '../services/analyticsService';
import { ExchangeRateService } from '../services/exchangeRateService';
import { InboxService } from '../services/inboxService';
import { AuthRequest } from '../middleware/auth';

export class AppController {
  static async getDashboard(req: AuthRequest, res: Response) {
    const userId = req.user!.id;

    // Trigger notifications check
    await NotificationService.generateBillingNotifications(userId);
    // Trigger inbox check
    await InboxService.generateInboxCards(userId);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true }
    });

    const activeCount = subscriptions.length;
    const isLimitReached = req.user!.plan === 'FREE' && activeCount >= 10;

    const unreadNotifications = await NotificationService.getUnreadCount(userId);
    const pendingInboxCards = await InboxService.getPendingCards(userId);

    let monthlyTotal = 0;
    let yearlyTotal = 0;
    
    subscriptions.forEach(sub => {
      monthlyTotal += BillingService.getMonthlyCost(sub.price, sub.billingCycle, sub.currency, sub.trialEndDate, sub.trialPrice);
      yearlyTotal += BillingService.getYearlyCost(sub.price, sub.billingCycle, sub.currency, sub.trialEndDate, sub.trialPrice);
    });

    const upcomingPayments = [...subscriptions]
      .sort((a, b) => a.nextBillingDate.getTime() - b.nextBillingDate.getTime())
      .slice(0, 5);

    const spendingByCategory = AnalyticsService.getSpendingByCategory(subscriptions);

    res.render('pages/dashboard', {
      user: req.user,
      subscriptions,
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal: yearlyTotal.toFixed(2),
      upcomingPayments,
      spendingByCategory,
      unreadNotifications,
      isLimitReached,
      pendingInboxCards,
      ExchangeRateService,
      page: 'dashboard'
    });
  }

  static async getSubscriptions(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { status, sortBy } = req.query;

    const orderField = sortBy === 'price' ? 'price' : 'nextBillingDate';
    const orderDirection = sortBy === 'price' ? 'desc' : 'asc';

    const subscriptions = await prisma.subscription.findMany({
      where: { 
        userId,
        isActive: status === 'inactive' ? false : (status === 'all' ? undefined : true)
      },
      orderBy: { [orderField]: orderDirection }
    });

    const activeCount = await prisma.subscription.count({ where: { userId, isActive: true } });
    const isLimitReached = req.user!.plan === 'FREE' && activeCount >= 10;

    const unreadNotifications = await NotificationService.getUnreadCount(userId);

    res.render('pages/subscriptions', {
      user: req.user,
      subscriptions,
      unreadNotifications,
      isLimitReached,
      pendingInboxCards: await InboxService.getPendingCards(userId),
      ExchangeRateService,
      page: 'subscriptions',
      status: status || 'active',
      sortBy: sortBy || 'date'
    });
  }

  static async createSubscription(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { name, price, currency, billingCycle, startDate, category, notes, trialEndDate, trialPrice, utilityStatus, lastUsedAt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const activeCount = await prisma.subscription.count({ where: { userId, isActive: true } });

    if (user?.plan === 'FREE' && activeCount >= 10) {
      await AnalyticsService.trackEvent(userId, 'limit_reached', { count: activeCount });
      await NotificationService.createNotification(
        userId, 
        'LIMIT_REACHED', 
        'Лимит достигнут', 
        'Вы достигли лимита в 10 подписок. Перейдите на PRO для неограниченного добавления.'
      );
      const unreadCount = await NotificationService.getUnreadCount(userId);
      return res.render('pages/subscription_form', { 
        user: req.user,
        error: 'Лимит подписок (10) исчерпан для бесплатного плана.',
        unreadNotifications: unreadCount,
        page: 'subscriptions',
        sub: req.body
      });
    }

    const start = new Date(startDate);
    const nextDate = BillingService.calculateNextBillingDate(start, billingCycle);

    const sub = await prisma.subscription.create({
      data: {
        userId,
        name,
        price: parseFloat(price),
        currency,
        billingCycle,
        startDate: start,
        nextBillingDate: nextDate,
        category,
        notes,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
        trialPrice: trialPrice ? parseFloat(trialPrice) : null,
        utilityStatus: utilityStatus || 'ACTIVE',
        lastUsedAt: lastUsedAt ? new Date(lastUsedAt) : null,
        isActive: true
      }
    });

    await AnalyticsService.trackEvent(userId, 'subscription_created', { subId: sub.id, name: sub.name });

    res.redirect('/app/subscriptions');
  }

  static async getEditSubscription(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const sub = await prisma.subscription.findFirst({
      where: { id: id as string, userId }
    });

    if (!sub) {
      return res.redirect('/app/subscriptions');
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.render('pages/subscription_form', {
      user: req.user,
      error: null,
      sub,
      unreadNotifications: unreadCount,
      page: 'subscriptions'
    });
  }

  static async updateSubscription(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, price, currency, billingCycle, startDate, category, notes, isActive, trialEndDate, trialPrice, utilityStatus, lastUsedAt } = req.body;

    const start = new Date(startDate);
    const nextDate = BillingService.calculateNextBillingDate(start, billingCycle);

    const oldSub = await prisma.subscription.findFirst({
      where: { id: id as string, userId }
    });

    const newPrice = parseFloat(price);

    if (oldSub && oldSub.price !== newPrice) {
      await prisma.priceHistory.create({
        data: {
          subscriptionId: id as string,
          oldPrice: oldSub.price,
          newPrice: newPrice,
          changedAt: new Date()
        }
      });
    }

    let utilityStatusUpdatedAt = oldSub?.utilityStatusUpdatedAt;
    if (oldSub && utilityStatus && oldSub.utilityStatus !== utilityStatus) {
      utilityStatusUpdatedAt = new Date();
    }

    await prisma.subscription.updateMany({
      where: { id: id as string, userId },
      data: {
        name,
        price: newPrice,
        currency,
        billingCycle,
        startDate: start,
        nextBillingDate: nextDate,
        category,
        notes,
        trialEndDate: trialEndDate ? new Date(trialEndDate) : null,
        trialPrice: trialPrice ? parseFloat(trialPrice) : null,
        utilityStatus: utilityStatus,
        lastUsedAt: lastUsedAt ? new Date(lastUsedAt) : null,
        utilityStatusUpdatedAt: utilityStatusUpdatedAt,
        isActive: isActive === 'true' || isActive === true
      }
    });

    res.redirect('/app/subscriptions');
  }

  static async deleteSubscription(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    await prisma.subscription.updateMany({
      where: { id: id as string, userId },
      data: { isActive: false, isArchived: true }
    });

    await AnalyticsService.trackEvent(userId, 'subscription_deleted', { subId: id });

    res.redirect('/app/subscriptions');
  }

  static async toggleFavorite(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    const sub = await prisma.subscription.findFirst({
      where: { id: id as string, userId }
    });

    if (!sub) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { isFavorite: !sub.isFavorite }
    });

    res.json({ success: true, isFavorite: updated.isFavorite });
  }

  static async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const unreadNotifications = await NotificationService.getUnreadCount(userId);

    res.render('pages/notifications', {
      user: req.user,
      notifications,
      unreadNotifications,
      pendingInboxCards: await InboxService.getPendingCards(userId),
      page: 'notifications'
    });
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    await prisma.notification.updateMany({
      where: { id: id as string, userId },
      data: { isRead: true }
    });

    res.json({ success: true });
  }

  static async deleteNotification(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    await prisma.notification.deleteMany({
      where: { id: id as string, userId }
    });

    res.json({ success: true });
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  }

  static async getSettings(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const unreadNotifications = await NotificationService.getUnreadCount(userId);

    res.render('pages/settings', {
      user: user || req.user,
      unreadNotifications,
      pendingInboxCards: await InboxService.getPendingCards(userId),
      page: 'settings',
      error: null,
      success: null
    });
  }

  static async changePassword(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { newPassword, confirmPassword } = req.body;

    const unreadNotifications = await NotificationService.getUnreadCount(userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (newPassword !== confirmPassword) {
      return res.render('pages/settings', {
        user: user || req.user,
        unreadNotifications,
        page: 'settings',
        error: 'Пароли не совпадают',
        success: null
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,15}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.render('pages/settings', {
        user: user || req.user,
        unreadNotifications,
        page: 'settings',
        error: 'Пароль должен быть от 8 до 15 символов и содержать заглавные/строчные буквы, цифры и спецсимволы.',
        success: null
      });
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      await AnalyticsService.trackEvent(userId, 'password_changed');

      res.render('pages/settings', {
        user: user || req.user,
        unreadNotifications,
        page: 'settings',
        error: null,
        success: 'Пароль успешно обновлен'
      });
    } catch (err) {
      res.render('pages/settings', {
        user: user || req.user,
        unreadNotifications,
        page: 'settings',
        error: 'Ошибка при смене пароля',
        success: null
      });
    }
  }

  static async upgradeDemo(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { plan: 'PRO' }
    });
    
    await AnalyticsService.trackEvent(userId, 'upgrade_succeeded', { method: 'demo' });

    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

    res.redirect('/app/settings');
  }

  static async exportCSV(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const subscriptions = await prisma.subscription.findMany({
      where: { userId }
    });

    let csv = 'Name,Price,Currency,Billing Cycle,Next Billing Date,Category,Status\n';
    subscriptions.forEach(sub => {
      csv += `"${sub.name}",${sub.price},${sub.currency},${sub.billingCycle},${sub.nextBillingDate.toISOString().split('T')[0]},"${sub.category || ''}",${sub.isActive ? 'Active' : 'Inactive'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.send(csv);
  }

  static async getAnnualReport(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const unreadNotifications = await NotificationService.getUnreadCount(userId);
    const report = await AnalyticsService.getAnnualReport(userId);

    res.render('pages/annual_report', {
      user: req.user,
      unreadNotifications,
      pendingInboxCards: await InboxService.getPendingCards(userId),
      report,
      page: 'annual_report'
    });
  }

  static async getInbox(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    await InboxService.generateInboxCards(userId);
    const cards = await InboxService.getPendingCards(userId);
    const unreadNotifications = await NotificationService.getUnreadCount(userId);

    res.render('pages/inbox', {
      user: req.user,
      cards,
      unreadNotifications,
      pendingInboxCards: cards,
      page: 'inbox',
      ExchangeRateService
    });
  }

  static async postInboxResponse(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { cardId, response } = req.body;

    try {
      await InboxService.processResponse(cardId, userId, response);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async postInboxUndo(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { cardId } = req.body;

    try {
      await InboxService.undoResponse(cardId, userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
