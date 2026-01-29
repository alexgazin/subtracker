import { prisma } from './db';

export class NotificationService {
  static async createNotification(userId: string, type: string, title: string, body: string) {
    return await prisma.notification.create({
      data: { userId, type, title, body }
    });
  }

  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  static async generateBillingNotifications(userId: string) {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, isActive: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sub of subscriptions) {
      const nextBilling = new Date(sub.nextBillingDate);
      nextBilling.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Trial end notification
      if (sub.trialEndDate) {
        const trialEnd = new Date(sub.trialEndDate);
        trialEnd.setHours(0, 0, 0, 0);
        const diffTrialDays = Math.ceil((trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffTrialDays > 0 && diffTrialDays <= 3) {
          const trialExists = await prisma.notification.findFirst({
            where: {
              userId,
              type: 'TRIAL_ENDING',
              createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
              body: { contains: sub.name }
            }
          });
          if (!trialExists) {
            await this.createNotification(
              userId,
              'TRIAL_ENDING',
              'Промо-период заканчивается',
              `Через ${diffTrialDays} дн. закончится триал для ${sub.name}. Цена изменится на ${sub.trialPrice} ${sub.currency}`
            );
          }
        }
      }

      // Today
      if (diffDays === 0) {
        const exists = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'BILLING_TODAY',
            createdAt: { gte: today },
            body: { contains: sub.name }
          }
        });
        if (!exists) {
          await this.createNotification(
            userId,
            'BILLING_TODAY',
            'Списание сегодня!',
            `Сегодня спишется оплата за ${sub.name}: ${sub.price} ${sub.currency}`
          );
        }
      } 
      // Soon (3 days)
      else if (diffDays > 0 && diffDays <= 3) {
        const exists = await prisma.notification.findFirst({
          where: {
            userId,
            type: 'BILLING_SOON',
            createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) }, // check last 7 days to not spam
            body: { contains: sub.name }
          }
        });
        if (!exists) {
          await this.createNotification(
            userId,
            'BILLING_SOON',
            'Скоро списание',
            `Через ${diffDays} дн. спишется оплата за ${sub.name}: ${sub.price} ${sub.currency}`
          );
        }
      }
    }
  }
}
