import { defineConfig } from '@playwright/test';
import { SESSION } from './session/chemin';

// Expérience 02 : mêmes tests, deux façons de se connecter (dans chaque test / une fois avec storageState).
export default defineConfig({
  fullyParallel: true,
  outputDir: './test-results',
  reporter: [['list']],
  use: {
    baseURL: 'https://practicesoftwaretesting.com',
    testIdAttribute: 'data-test',
    // Permet d'utiliser un Chromium déjà présent en cache (PW_CHROMIUM=/chemin/vers/chrome).
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'par-test', testDir: './par-test/specs' },
    { name: 'setup', testDir: './session', testMatch: /auth\.setup\.ts/ },
    {
      name: 'session',
      testDir: './session/specs',
      dependencies: ['setup'],
      use: { storageState: SESSION },
    },
  ],
});
