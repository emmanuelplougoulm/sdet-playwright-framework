import { defineConfig } from '@playwright/test';
import { UI } from './commun/adresses';

// Expérience 04, sur le site de démo en local : la même suite, avec ou sans le vrai backend.
export default defineConfig({
  fullyParallel: true,
  workers: Number(process.env['WORKERS'] ?? 2),
  outputDir: './test-results',
  reporter: [['list']],
  use: {
    baseURL: UI,
    testIdAttribute: 'data-test',
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  projects: [
    { name: 'enregistrer', testDir: './commun', testMatch: /enregistrer\.spec\.ts/ },
    { name: 'reelle', testDir: './strategies/reelle', testMatch: /\.spec\.ts/ },
    { name: 'mocks-manuels', testDir: './strategies/mocks-manuels', testMatch: /\.spec\.ts/ },
    { name: 'har', testDir: './strategies/har', testMatch: /\.spec\.ts/ },
    { name: 'contrat', testDir: './strategies/contrat', testMatch: /\.spec\.ts/ },
  ],
});
