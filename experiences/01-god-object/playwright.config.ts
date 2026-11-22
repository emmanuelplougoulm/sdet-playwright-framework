import { defineConfig } from '@playwright/test';

// Expérience 01 : mêmes tests, deux organisations du code (God object / fixtures à la carte).
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
    { name: 'god', testDir: './god/specs' },
    { name: 'split', testDir: './split/specs' },
  ],
});
