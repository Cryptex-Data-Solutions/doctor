import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/tests/**/*.test.ts'],
    testTimeout: 180000,
    hookTimeout: 180000,
    sequence: {
      concurrent: false,
    },
    globalSetup: ['e2e/setup/global-setup.ts'],
    reporters: ['verbose'],
  },
});
