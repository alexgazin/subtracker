const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const viewsDir = path.join(root, 'src', 'views');
const pagesDir = path.join(viewsDir, 'pages');
const layoutPath = path.join(viewsDir, 'layout.ejs');
const outDir = path.join(root, 'static');
const publicDir = path.join(root, 'src', 'public');

function mapAbsoluteHref(url) {
  // remove search and hash
  const clean = url.split('?')[0].split('#')[0];
  if (clean === '/' || clean === '') return './index.html';
  const p = clean.replace(/^\//, ''); // drop leading /
  // if starts with app/
  if (p.startsWith('app/')) {
    const name = p.slice(4).split('/')[0];
    const candidate = path.join(pagesDir, `${name}.ejs`);
    if (fs.existsSync(candidate)) return `./${name}.html`;
    return './index.html';
  }
  // direct mapping to page ejs if exists
  const candidate = path.join(pagesDir, `${p}.ejs`);
  if (fs.existsSync(candidate)) return `./${p}.html`;
  // otherwise, if it's a top-level file like privacy, support etc, map to ./p.html
  return `./${p}.html`;
}

async function renderPage(pageFile, outName, locals = {}) {
  const pagePath = path.join(pagesDir, pageFile);
  const pageContent = await ejs.renderFile(pagePath, locals, { filename: pagePath });
  const layoutContent = await ejs.renderFile(layoutPath, { ...locals, body: pageContent }, { filename: layoutPath });

  // Post-process HTML: rewrite absolute asset paths and hrefs
  let html = layoutContent;

  // assets: /css/... -> ./css/..., /js/... -> ./js/..., /images/... -> ./images/...
  html = html.replace(/(href|src)="\/(css|js|images)\//g, (m, attr, folder) => `${attr}="./${folder}/`);

  // rewrite all href="/..." occurrences using mapAbsoluteHref
  html = html.replace(/href="([^"]*)"/g, (m, href) => {
    if (!href.startsWith('/')) return m; // leave relative links
    const mapped = mapAbsoluteHref(href);
    return `href="${mapped}"`;
  });

  // also rewrite src="/..." for other absolute srcs (images, scripts)
  html = html.replace(/src="([^"]*)"/g, (m, src) => {
    if (!src.startsWith('/')) return m;
    // map /css/... etc already handled; otherwise map to ./<path>
    return `src=".${src}"`;
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, outName), html, 'utf8');
  console.log('Wrote', outName);
}

function copyPublic() {
  if (!fs.existsSync(publicDir)) return;
  const dest = path.join(outDir);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  const ncp = (src, dst) => {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) ncp(path.join(src, f), path.join(dst, f));
    } else {
      fs.copyFileSync(src, dst);
    }
  };
  ncp(publicDir, path.join(dest));
  console.log('Copied public assets');
}

(async () => {
  try {
    copyPublic();
    const locals = {
      user: null,
      page: 'home',
      pendingInboxCards: [],
      unreadNotifications: 0,
    };

    // Render all .ejs pages in pagesDir
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.ejs'));
    for (const f of files) {
      const name = f.replace(/\.ejs$/, '.html');
      await renderPage(f, name, locals);
    }

    console.log('Static site built to', outDir);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
