const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const layoutFile = path.resolve(__dirname, '../src/views/layout.ejs');
const locals = { user: { id: 1, role: 'ADMIN' }, page: 'dashboard', pendingInboxCards: [{id:1}], unreadNotifications: 2 };

try {
  const content = fs.readFileSync(layoutFile, 'utf8');
  ejs.compile(content, {filename: layoutFile});
  console.log('layout compiled OK');
} catch (err) {
  console.error('layout compile error', err);
  process.exit(1);
}
