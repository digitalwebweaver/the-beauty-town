import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    testTimeout: 15000,
    // These are real integration tests against a shared test database
    // (see tests/globalSetup.ts) — running files in parallel would let
    // them race on the same rows (double-booking checks especially).
    fileParallelism: false,
  },
});
