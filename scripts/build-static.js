const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const viewsDir = path.join(root, 'src', 'views');
const pagesDir = path.join(viewsDir, 'pages');
const layoutPath = path.join(viewsDir, 'layout.ejs');
const outDir = path.join(root, 'static');
const docsDir = path.join(root, 'docs');
const publicDir = path.join(root, 'src', 'public');

function buildMapping() {
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ejs'));
  const pages = files.map(f => f.replace(/\.ejs$/, ''));
  const mapping = new Map();

  // map root
  mapping.set('/', './index.html');
  mapping.set('/index', './index.html');
  mapping.set('/index.html', './index.html');

  // map each page: /page -> ./page.html
  for (const p of pages) {
    mapping.set('/' + p, `./${p}.html`);
    mapping.set('/' + p + '/', `./${p}.html`);
    mapping.set('/' + p + '.html', `./${p}.html`);
    // also map /app/pagename to ./pagename.html
    mapping.set('/app/' + p, `./${p}.html`);
    mapping.set('/app/' + p + '/', `./${p}.html`);
  }

  return mapping;
}

function mapHref(href, mapping) {
  if (!href || !href.startsWith('/')) return null;
  // prefer exact longest match
  // try exact match first
  if (mapping.has(href)) return mapping.get(href);
  // try removing trailing slash
  const stripped = href.replace(/\/$/, '');
  if (mapping.has(stripped)) return mapping.get(stripped);
  // try prefix matches: /app/page/... -> /app/page
  for (const key of mapping.keys()) {
    if (href.startsWith(key + '/')) return mapping.get(key);
  }
  // fallback: map to ./<path>.html
  const p = href.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return './index.html';
  return `./${p}.html`;
}

async function renderPageToDirs(pageFile, outName, locals = {}, mapping) {
  const pagePath = path.join(pagesDir, pageFile);
  const pageContent = await ejs.renderFile(pagePath, locals, { filename: pagePath });
  const layoutContent = await ejs.renderFile(layoutPath, { ...locals, body: pageContent }, { filename: layoutPath });

  let html = layoutContent;

  // Replace asset absolute paths first
  html = html.replace(/(href|src)="\/(css|js|images)\//g, (m, attr, folder) => `${attr}="./${folder}/`);

  // Replace hrefs that are absolute paths
  html = html.replace(/href="([^"]*)"/g, (m, href) => {
    if (!href.startsWith('/')) return m;
    const mapped = mapHref(href, mapping);
    return `href="${mapped}"`;
  });

  // Replace src absolute paths (images, scripts) -> ./...
  html = html.replace(/src="([^"]*)"/g, (m, src) => {
    if (!src.startsWith('/')) return m;
    // if it's an asset we've already handled, convert to ./
    if (src.startsWith('/css/') || src.startsWith('/js/') || src.startsWith('/images/')) {
      return `src=".${src}"`;
    }
    // otherwise, map to ./<path>
    return `src=".${src}"`;
  });

  // ensure both dirs exist
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, outName), html, 'utf8');
  fs.writeFileSync(path.join(docsDir, outName), html, 'utf8');
  console.log('Wrote', outName, 'to static/ and docs/');
}

function copyPublicToDirs() {
  if (!fs.existsSync(publicDir)) return;
  // clear both dirs
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(docsDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });

  const ncp = (src, dst) => {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) ncp(path.join(src, f), path.join(dst, f));
    } else {
      fs.copyFileSync(src, dst);
    }
  };
  ncp(publicDir, path.join(outDir));
  ncp(publicDir, path.join(docsDir));
  console.log('Copied public assets to static/ and docs/');
}

function makeMockLocals() {
  // Provide safe defaults for variables referenced in templates
  const now = new Date();
  const notifications = [
    { id: 1, title: 'Тестовое уведомление', body: 'Это тест.', isRead: false, createdAt: now.toISOString() }
  ];
  const subscriptions = [
    { id: 1, merchant: 'Spotify', amount: 9.99, currency: 'USD', nextDate: now.toISOString(), favorite: false, utility: false, name: 'Spotify', billingCycle: 'MONTHLY', price: 9.99, trialPrice: null, trialEndDate: null, nextBillingDate: now.toISOString(), isFavorite: false, utilityStatus: 'ACTIVE', utilityStatusUpdatedAt: now.toISOString() }
  ];
  const users = [
    { id: 1, email: 'admin@example.com', role: 'ADMIN', plan: 'PRO', createdAt: now.toISOString() }
  ];
  const cards = [
    { id: 1, merchant: 'Netflix', amount: 12.99, date: now.toISOString(), status: 'pending' }
  ];
  const report = { year: new Date().getFullYear(), total: 123.45, subscriptions };
  const stats = { monthly: 12.34, yearly: 148.08, usersCount: 1, subsCount: subscriptions.length, eventsCount: 5 };
  const monthlyTotal = stats.monthly;
  const yearlyTotal = stats.yearly;

  // simple exchange rate stub
  const ExchangeRateService = {
    convert: (value) => (typeof value === 'number' ? value : parseFloat(value) || 0),
    getSymbol: (currency) => ({ USD: '$', EUR: '€', RUB: '₽' }[currency] || currency)
  };

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
    // helper flags
    isAdmin: false,
    sortBy: 'date',
    status: 'all',
    ExchangeRateService,
    code: 500,
    message: 'Internal error (mock)'
  };
}

(async () => {
  try {
    copyPublicToDirs();
    const locals = makeMockLocals();
    const mapping = buildMapping();
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ejs'));
    for (const f of files) {
      const name = f.replace(/\.ejs$/, '.html');
      await renderPageToDirs(f, name, locals, mapping);
    }
    console.log('Static site built to', outDir, 'and', docsDir);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
