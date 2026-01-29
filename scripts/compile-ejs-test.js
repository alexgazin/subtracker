const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/views/pages/dashboard.ejs');

try {
  const content = fs.readFileSync(file, 'utf8');
  ejs.compile(content, {filename: file});
  console.log('Compiled OK');
} catch (err) {
  console.error('Error during compile:', err);
  process.exit(1);
}
