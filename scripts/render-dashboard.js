const ejs = require('ejs');
const path = require('path');
const file = path.resolve(__dirname, '../src/views/pages/dashboard.ejs');

const locals = {
  user: { id: 1, role: 'USER', plan: 'FREE' },
  page: 'dashboard',
  monthlyTotal: 123.45,
  yearlyTotal: 1481.4,
  subscriptions: [{id:1,name:'Netflix'}],
  pendingInboxCards: [{id:1}],
  upcomingPayments: [],
  spendingByCategory: [],
  isLimitReached: false,
  ExchangeRateService: { getSymbol: (c) => '$' }
};

ejs.renderFile(file, locals, {filename: file}, (err, str) => {
  if (err) {
    console.error('Render error:', err);
    process.exit(1);
  }
  console.log('Rendered length:', str.length);
  console.log('Preview:\n', str.substring(0, 800));
});
