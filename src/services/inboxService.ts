import { prisma } from './db';
import { BillingService } from './billingService';

export class InboxService {
  /**
   * Generates payment inbox cards for subscriptions where the next billing date has passed.
   */
  static async generateInboxCards(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
        nextBillingDate: {
          lt: today
        }
      }
    });

    for (const sub of subscriptions) {
      // Check if a card already exists for this expected date
      const existing = await prisma.paymentInbox.findFirst({
        where: {
          subscriptionId: sub.id,
          expectedDate: sub.nextBillingDate,
          status: 'PENDING'
        }
      });

      if (!existing) {
        await prisma.paymentInbox.create({
          data: {
            userId,
            subscriptionId: sub.id,
            expectedDate: sub.nextBillingDate,
            amount: sub.price,
            currency: sub.currency,
            status: 'PENDING'
          }
        });
      }
    }
  }

  static async getPendingCards(userId: string) {
    return await prisma.paymentInbox.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      include: {
        subscription: true
      },
      orderBy: {
        expectedDate: 'asc'
      }
    });
  }

  static async processResponse(cardId: string, userId: string, response: 'PAID' | 'CANCELLED' | 'NOT_CHARGED') {
    const card = await prisma.paymentInbox.findFirst({
      where: { id: cardId, userId }
    });

    if (!card) throw new Error('Card not found');

    const sub = await prisma.subscription.findUnique({
      where: { id: card.subscriptionId }
    });

    if (!sub) throw new Error('Subscription not found');

    if (response === 'PAID') {
      const nextBillingDate = BillingService.calculateNextBillingDate(card.expectedDate, sub.billingCycle);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          nextBillingDate: nextBillingDate,
          isActive: true
        }
      });
    } else if (response === 'CANCELLED') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          isActive: false,
          isArchived: true
        }
      });
    } else if (response === 'NOT_CHARGED') {
      // For NOT_CHARGED, we might want to shift the date or just wait. 
      // A simple implementation: shift expected date by 1 day to check again tomorrow if it's still not charged?
      // Or just mark as resolved and let the user decide later.
      // Based on description: "suggest reminder/check". 
      // For now, let's keep the subscription as is but resolve the card.
    }

    return await prisma.paymentInbox.update({
      where: { id: cardId },
      data: {
        status: 'RESOLVED',
        userResponse: response,
        resolvedAt: new Date()
      }
    });
  }

  static async undoResponse(cardId: string, userId: string) {
      const card = await prisma.paymentInbox.findFirst({
          where: { id: cardId, userId, status: 'RESOLVED' }
      });

      if (!card) throw new Error('Resolved card not found');

      // Revert subscription changes if possible
      const sub = await prisma.subscription.findUnique({
          where: { id: card.subscriptionId }
      });

      if (sub) {
          if (card.userResponse === 'PAID') {
              // Revert next billing date back to expectedDate
              await prisma.subscription.update({
                  where: { id: sub.id },
                  data: { nextBillingDate: card.expectedDate }
              });
          } else if (card.userResponse === 'CANCELLED') {
              await prisma.subscription.update({
                  where: { id: sub.id },
                  data: { isActive: true, isArchived: false }
              });
          }
      }

      return await prisma.paymentInbox.update({
          where: { id: cardId },
          data: {
              status: 'PENDING',
              userResponse: null,
              resolvedAt: null
          }
      });
  }
}
