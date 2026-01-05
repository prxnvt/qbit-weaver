import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'vitest.setup.ts',
        'index.tsx',
        'vite-env.d.ts',
      ],
      thresholds: {
        // Parser utilities - high coverage achievable
        'utils/angleParser.ts': {
          lines: 90,
          functions: 100,
          branches: 90,
          statements: 90,
        },
        'utils/complexParser.ts': {
          lines: 90,
          functions: 100,
          branches: 90,
          statements: 90,
        },
        // Quantum utilities - internal simulation functions are hard to unit test
        // Exported functions have high coverage, internal apply* functions need integration tests
        'utils/quantum.ts': {
          lines: 35,
          functions: 65,
          branches: 20,
          statements: 35,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
