import { Request, Response } from 'express';
import { prisma } from '../services/db';
import { AuthRequest } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

export class AdminController {
  static async getDashboard(req: AuthRequest, res: Response) {
    const unreadNotifications = await NotificationService.getUnreadCount(req.user!.id);
    
    const usersCount = await prisma.user.count();
    const subsCount = await prisma.subscription.count();
    const eventsCount = await prisma.event.count();
    
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const dailyRegistrations = await prisma.event.groupBy({
      by: ['createdAt'],
      where: { type: 'user_registered' },
      _count: true,
      orderBy: { createdAt: 'desc' },
      take: 7
    });

    res.render('pages/admin_dashboard', {
      user: req.user,
      unreadNotifications,
      stats: {
        usersCount,
        subsCount,
        eventsCount
      },
      recentUsers,
      page: 'admin'
    });
  }

  static async getUsers(req: AuthRequest, res: Response) {
    const unreadNotifications = await NotificationService.getUnreadCount(req.user!.id);
    const users = await prisma.user.findMany({
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.render('pages/admin_users', {
      user: req.user,
      unreadNotifications,
      users,
      page: 'admin'
    });
  }

  static async updateUserPlan(req: AuthRequest, res: Response) {
    const { userId, plan } = req.body;
    await prisma.user.update({
      where: { id: userId },
      data: { plan }
    });
    res.redirect('/app/admin/users');
  }

  static async deleteUser(req: AuthRequest, res: Response) {
    const { userId } = req.body;
    // Delete notifications, subscriptions, and events first if needed (Prisma handles relations based on schema)
    // In our schema they don't have onDelete: Cascade explicitly set in a way that Prisma will handle it automatically for SQLite if not configured.
    // Let's do it manually to be safe.
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.event.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    res.redirect('/app/admin/users');
  }
}
