export class ExchangeRateService {
  // Базовые курсы для MVP (относительно USD)
  private static rates: Record<string, number> = {
    'USD': 1,
    'EUR': 0.92,
    'RUB': 90.0,
    'GBP': 0.79
  };

  static convert(amount: number, from: string, to: string = 'USD'): number {
    if (from === to) return amount;
    
    const amountInUSD = amount / (this.rates[from] || 1);
    return amountInUSD * (this.rates[to] || 1);
  }

  static getSymbol(currency: string): string {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'RUB': return '₽';
      case 'GBP': return '£';
      default: return currency;
    }
  }
}
