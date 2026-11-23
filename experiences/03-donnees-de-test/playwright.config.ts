import { defineConfig } from '@playwright/test';
import { FIREFLY } from './commun/comptes';

// Expérience 03, sur Firefly III en Docker : la même suite, trois façons d'obtenir ses données.
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
    { name: 'seed', testDir: './strategies/jeu-partage', testMatch: /seed\.setup\.ts/ },
    { name: 'jeu-partage', testDir: './strategies/jeu-partage', testMatch: /\.spec\.ts/, dependencies: ['seed'] },
    { name: 'factory-par-test', testDir: './strategies/factory-par-test', testMatch: /\.spec\.ts/ },
    { name: 'factory-par-worker', testDir: './strategies/factory-par-worker', testMatch: /\.spec\.ts/ },
  ],
});
