import { defineConfig } from '@playwright/test';
import { UI } from './commun/donnees';

// Expérience 05, sur le site de démo de l'expérience 04 : la même suite, quatre façons de trouver les éléments.
// Un locator qui ne trouve plus son élément échoue vite (5 s), pour que les runs cassés restent courts.
export default defineConfig({
  fullyParallel: true,
  workers: Number(process.env['WORKERS'] ?? 2),
  timeout: 20_000,
  outputDir: './test-results',
  reporter: [['list']],
  use: {
    baseURL: UI,
    testIdAttribute: 'data-test',
    actionTimeout: 5_000,
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  projects: ['css', 'texte', 'role', 'data-test'].map((name) => ({ name, testDir: `./strategies/${name}`, testMatch: /\.spec\.ts/ })),
});
