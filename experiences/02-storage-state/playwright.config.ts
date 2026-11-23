import { defineConfig } from '@playwright/test';
import { SESSION } from './strategies/session-globale/chemin';

// Expérience 02 : la même suite, quatre façons de se connecter.
export default defineConfig({
  fullyParallel: true,
  workers: 3,
  outputDir: './test-results',
  reporter: [['list']],
  use: {
    baseURL: 'https://practicesoftwaretesting.com',
    testIdAttribute: 'data-test',
    // Permet d'utiliser un Chromium déjà présent en cache (PW_CHROMIUM=/chemin/vers/chrome).
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  projects: [
    { name: 'ui-par-test', testDir: './strategies/ui-par-test', testMatch: /\.spec\.ts/ },
    { name: 'api-par-test', testDir: './strategies/api-par-test', testMatch: /\.spec\.ts/ },
    { name: 'setup', testDir: './strategies/session-globale', testMatch: /auth\.setup\.ts/ },
    {
      name: 'session-globale',
      testDir: './strategies/session-globale',
      testMatch: /\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: SESSION },
    },
    { name: 'session-par-worker', testDir: './strategies/session-par-worker', testMatch: /\.spec\.ts/ },
  ],
});
