const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
  console.error('docs/ not found');
  process.exit(1);
}

const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.html'));
files.forEach(f => {
  const p = path.join(docsDir, f);
  let s = fs.readFileSync(p, 'utf8');

  // 1) exact root href -> ./index.html
  s = s.replace(/href="\/("|>)/g, 'href="./index.html$1');
  s = s.replace(/href="\/$/g, 'href="./index.html');

  // 2) href="/something" -> href="./something.html" (preserve existing .html)
  s = s.replace(/href="\/([a-zA-Z0-9_\-\/]+)(\.html)?(#[^"\s]*)?(\?[^"\s]*)?"/g, (m, p1, p2, hash, query) => {
    const base = p1;
    const hashPart = hash || '';
    const queryPart = query || '';
    if (p2) {
      return `href="./${base}.html${hashPart}${queryPart}"`;
    }
    return `href="./${base}.html${hashPart}${queryPart}"`;
  });

  // 3) asset srcs: /css/... -> ./css/...
  s = s.replace(/src="\/(css|js|images)\//g, 'src="./$1/');
  s = s.replace(/href="\/(css|js|images)\//g, 'href="./$1/');

  // 4) any remaining absolute src -> ./path
  s = s.replace(/src="\/([^"\s]+)"/g, (m, p1) => `src="./${p1}"`);

  // final cleanup: remove accidental $1 left by previous regexes
  s = s.replace(/\$1/g, '');

  // Fix cases like: href="./index.html class="logo" -> insert missing closing quote before class
  s = s.replace(/href="(\.\/index\.html)\s+(class=)/g, 'href="$1" $2');
  s = s.replace(/href="(\.\/index\.html)\s+([a-z-]+=)/g, 'href="$1" $2');

  fs.writeFileSync(p, s, 'utf8');
  console.log('Fixed', f);
});
console.log('Done');
