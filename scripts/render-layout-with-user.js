const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/views/layout.ejs');
const content = fs.readFileSync(file,'utf8');
const html = ejs.render(content, { user: { id:1, role: 'ADMIN'}, page: 'notifications', pendingInboxCards: [{id:1}], unreadNotifications: 3 }, {filename: file});
console.log(html.substring(0,1200));
