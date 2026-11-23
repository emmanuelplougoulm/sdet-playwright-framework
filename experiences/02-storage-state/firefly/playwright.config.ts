import { defineConfig } from '@playwright/test';
import { FIREFLY } from './commun/comptes';
import { SESSION } from './strategies/session-globale/chemin';

// Expérience 02, sur Firefly III en Docker : la même suite, quatre façons de se connecter.
export default defineConfig({
  globalSetup: './commun/global-setup.ts',
  fullyParallel: true,
  workers: Number(process.env['WORKERS'] ?? 4),
  outputDir: './test-results',
  reporter: [['list']],
  use: {
    baseURL: FIREFLY,
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  projects: [
    { name: 'ui-par-test', testDir: './strategies/ui-par-test', testMatch: /\.spec\.ts/ },
    { name: 'http-par-test', testDir: './strategies/http-par-test', testMatch: /\.spec\.ts/ },
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
