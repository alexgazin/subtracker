const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pagesDir = path.join(root, 'src', 'views', 'pages');
const layout = path.join(root, 'src', 'views', 'layout.ejs');
const logPath = path.join(__dirname,'build.log');

function makeMockLocals() {
  const now = new Date();
  const notifications = [
    { id: 1, title: 'Тестовое уведомление', body: 'Это тест.', isRead: false, createdAt: now.toISOString() }
  ];
  const subscriptions = [
    { id: 1, merchant: 'Spotify', amount: 9.99, currency: 'USD', nextDate: now.toISOString(), favorite: false, utility: false, name: 'Spotify', billingCycle: 'MONTHLY', price: 9.99, trialPrice: null, trialEndDate: null, nextBillingDate: now.toISOString(), isFavorite: false, utilityStatus: 'ACTIVE', utilityStatusUpdatedAt: now.toISOString() }
  ];
  const users = [
    { id: 1, email: 'admin@example.com', role: 'ADMIN', plan: 'PRO', createdAt: now.toISOString(), _count: { subscriptions: 2 }, lastLoginAt: now.toISOString() }
  ];
  const cards = [
    { id: 1, merchant: 'Netflix', amount: 12.99, date: now.toISOString(), status: 'pending' }
  ];
  const report = { year: new Date().getFullYear(), total: 123.45, subscriptions, totalSpentYear: 500, inflationDetails: [] };
  const stats = { monthly: 12.34, yearly: 148.08, usersCount: 1, subsCount: subscriptions.length, eventsCount: 5 };
  const monthlyTotal = stats.monthly;
  const yearlyTotal = stats.yearly;

  const ExchangeRateService = {
    convert: (value) => (typeof value === 'number' ? value : parseFloat(value) || 0),
    getSymbol: (currency) => ({ USD: '$', EUR: '€', RUB: '₽' }[currency] || currency)
  };

  const spendingByCategory = [
    { name: 'Entertainment', value: 6 },
    { name: 'Subscriptions', value: 6.34 }
  ];

  const upcomingPayments = [];

  return {
    user: { id: 1, email: 'user@example.com', role: 'USER', plan: 'FREE' },
    page: 'home',
    pendingInboxCards: [],
    unreadNotifications: notifications.filter(n => !n.isRead).length,
    notifications,
    subscriptions,
    sub: null,
    isLimitReached: false,
    error: null,
    success: null,
    stats,
    totals: { monthly: stats.monthly, yearly: stats.yearly },
    users,
    report,
    monthlyTotal,
    yearlyTotal,
    cards,
    recentUsers: users,
    spendingByCategory,
    upcomingPayments,
    // helper flags
    isAdmin: false,
    sortBy: 'date',
    status: 'all',
    ExchangeRateService,
    code: 500,
    message: 'Internal error (mock)'
  };
}

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ejs'));
const log = [];
(async ()=>{
  const locals = makeMockLocals();
  for(const f of files){
    try{
      const pagePath = path.join(pagesDir, f);
      const content = await ejs.renderFile(pagePath, locals, {filename: pagePath});
      const out = await ejs.renderFile(layout, {body: content, ...locals}, {filename: layout});
      log.push(`${f}: OK`);
    }catch(err){
      log.push(`${f}: ERR ${err.message}`);
    }
  }
  fs.writeFileSync(logPath, log.join('\n'));
  console.log('Wrote log to', logPath);
})();
