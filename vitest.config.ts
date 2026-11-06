import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Moduły serwerowe importują 'server-only' — w testach to pusty moduł.
      'server-only': resolve(__dirname, 'src/test/empty.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'deploy/**/*.test.ts'],
    environment: 'node',
  },
});
