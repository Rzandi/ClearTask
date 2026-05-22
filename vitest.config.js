import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**/*'],
    // Prevent tests from hanging due to open async handles
    testTimeout: 30000,
    hookTimeout: 15000,
    // Use forks pool to isolate open handles between test files
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/utils/**', 'src/hooks/**', 'src/contexts/**'],
      exclude: ['src/utils/cn.js', 'node_modules', 'src/test-setup.js'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
