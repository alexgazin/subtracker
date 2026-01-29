"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Minimal Prisma JS config (CommonJS) to be robust in CI environments
module.exports = {
    schema: 'prisma/schema.prisma',
    migrations: { path: 'prisma/migrations' },
    engine: 'classic',
    datasource: {
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
    },
};
//# sourceMappingURL=prisma.config.js.map