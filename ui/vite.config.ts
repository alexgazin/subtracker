import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: '/subtracker/',
  server: { port: 5173 },
  build: { outDir: path.resolve(__dirname, 'dist') },
});
