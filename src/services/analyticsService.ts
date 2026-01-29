import { Subscription } from '@prisma/client';
import { BillingService } from './billingService';
import { prisma } from './db';
import { logger } from './logger';
import { ExchangeRateService } from './exchangeRateService';

export class AnalyticsService {
  static async trackEvent(userId: string | null, type: string, metadata?: any) {
    try {
      await prisma.event.create({
        data: {
          userId,
          type,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });
    } catch (err) {
      logger.error(`Failed to track event ${type}: ${err}`);
    }
  }

  static getSpendingByCategory(subscriptions: Subscription[]) {
    const categories: Record<string, number> = {};

    subscriptions.forEach(sub => {
      const category = sub.category || 'Other';
      const monthlyCost = BillingService.getMonthlyCost(sub.price, sub.billingCycle, sub.currency);
      
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += monthlyCost;
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }

  static getUpcomingWeekExpenses(subscriptions: Subscription[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return subscriptions
      .filter(sub => {
        const nextBilling = new Date(sub.nextBillingDate);
        return nextBilling >= today && nextBilling <= nextWeek;
      })
      .reduce((total, sub) => total + sub.price, 0); // Note: this is in original currency, usually we want it in base for total
  }

  static async getAnnualReport(userId: string) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: { priceHistory: { orderBy: { changedAt: 'asc' } } }
    });

    let totalSpentYear = 0;
    const inflationDetails: any[] = [];

    subscriptions.forEach(sub => {
      // Calculate inflation
      if (sub.priceHistory.length > 0) {
        const firstEntry = sub.priceHistory[0];
        if (firstEntry) {
          const initialPrice = firstEntry.oldPrice;
          const currentPrice = sub.price;

          if (currentPrice > initialPrice) {
            const diff = currentPrice - initialPrice;
            const percentage = ((diff / initialPrice) * 100).toFixed(1);
            
            inflationDetails.push({
              name: sub.name,
              oldPrice: initialPrice,
              newPrice: currentPrice,
              currency: sub.currency,
              diff: diff.toFixed(2),
              percentage,
              history: sub.priceHistory
            });
          }
        }
      }

      // Estimate total spent this year (simplified)
      // For more accurate results we should track every payment, 
      // but here we can estimate based on billing cycle and current price.
      const monthlyCost = BillingService.getMonthlyCost(sub.price, sub.billingCycle, sub.currency);
      totalSpentYear += monthlyCost * (now.getMonth() + 1); 
    });

    return {
      totalSpentYear: totalSpentYear.toFixed(2),
      inflationDetails,
      year: now.getFullYear()
    };
  }
}
