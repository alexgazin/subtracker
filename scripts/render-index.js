const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'src', 'views', 'pages', 'index.ejs');
const layout = path.join(root, 'src', 'views', 'layout.ejs');
const docsIndex = path.join(root, 'docs', 'index.html');
const staticIndex = path.join(root, 'static', 'index.html');

function makeMockLocals() {
  const now = new Date();
  const notifications = [];
  const subscriptions = [];
  const users = [];
  const report = { year: new Date().getFullYear(), total: 0, subscriptions: [] };
  const stats = { monthly: 0, yearly: 0, usersCount: 0, subsCount: 0, eventsCount: 0 };
  const ExchangeRateService = { convert: v => v, getSymbol: c => (c === 'USD' ? '$' : c) };
  return {
    user: null,
    page: 'home',
    pendingInboxCards: [],
    unreadNotifications: 0,
    notifications,
    subscriptions,
    sub: null,
    isLimitReached: false,
    error: null,
    success: null,
    stats,
    totals: { monthly: 0, yearly: 0 },
    users,
    report,
    monthlyTotal: 0,
    yearlyTotal: 0,
    cards: [],
    recentUsers: users,
    isAdmin: false,
    sortBy: 'date',
    status: 'all',
    ExchangeRateService,
    code: 500,
    message: ''
  };
}

(async () => {
  try {
    const locals = makeMockLocals();
    const pageContent = await ejs.renderFile(page, locals, { filename: page });
    const full = await ejs.renderFile(layout, { ...locals, body: pageContent }, { filename: layout });
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'static'), { recursive: true });
    fs.writeFileSync(docsIndex, full, 'utf8');
    fs.writeFileSync(staticIndex, full, 'utf8');
    console.log('Rendered index to docs/index.html and static/index.html');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
