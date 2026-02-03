import { defineConfig } from 'cypress';
import { NodeAuth } from './cypress/plugins/node-auth';

export default defineConfig({
  viewportWidth: 1200,
  viewportHeight: 1500,
  defaultCommandTimeout: 30000,
  retries: 2,
  screenshotsFolder: 'cypress/screenshots/dev',
  reporter: 'mochawesome',
  reporterOptions: {
    overwrite: false,
    html: false,
    json: true,
  },
  e2e: {
    baseUrl: '',
    specPattern: 'cypress/e2e/**/*.ts',
    excludeSpecPattern: ['cypress/e2e/translator.ts'],
    supportFile: 'cypress/support/index.ts',
    setupNodeEvents(on) {
      on('task', { NodeAuth });
    },
  },
});
