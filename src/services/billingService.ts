import { ExchangeRateService } from './exchangeRateService';

export class BillingService {
  static calculateNextBillingDate(startDate: Date, billingCycle: string): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nextDate = new Date(startDate);
    nextDate.setHours(0, 0, 0, 0);

    while (nextDate < today) {
      if (billingCycle === 'MONTHLY') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (billingCycle === 'YEARLY') {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      } else if (billingCycle === 'WEEKLY') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
    }
    return nextDate;
  }

  static getMonthlyCost(price: number, billingCycle: string, currency: string = 'USD', trialEndDate?: Date | null, trialPrice?: number | null): number {
    let currentPrice = price;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (trialEndDate && trialPrice !== undefined && trialPrice !== null) {
      const trialEnd = new Date(trialEndDate);
      trialEnd.setHours(0, 0, 0, 0);
      if (trialEnd < today) {
        currentPrice = trialPrice;
      }
    }

    let cost = currentPrice;
    switch (billingCycle) {
      case 'MONTHLY': cost = currentPrice; break;
      case 'YEARLY': cost = currentPrice / 12; break;
      case 'WEEKLY': cost = (currentPrice / 7) * 30.44; break;
      default: cost = currentPrice;
    }
    return ExchangeRateService.convert(cost, currency, 'USD');
  }

  static getYearlyCost(price: number, billingCycle: string, currency: string = 'USD', trialEndDate?: Date | null, trialPrice?: number | null): number {
    let currentPrice = price;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (trialEndDate && trialPrice !== undefined && trialPrice !== null) {
      const trialEnd = new Date(trialEndDate);
      trialEnd.setHours(0, 0, 0, 0);
      if (trialEnd < today) {
        currentPrice = trialPrice;
      }
    }

    let cost = currentPrice;
    switch (billingCycle) {
      case 'MONTHLY': cost = currentPrice * 12; break;
      case 'YEARLY': cost = currentPrice; break;
      case 'WEEKLY': cost = currentPrice * 52.14; break;
      default: cost = currentPrice * 12;
    }
    return ExchangeRateService.convert(cost, currency, 'USD');
  }
}
