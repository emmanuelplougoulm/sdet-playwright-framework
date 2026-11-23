import { defineConfig } from '@playwright/test';

// Configuration des outils du script de mesure (inventaire et nettoyage de l'instance).
export default defineConfig({
  globalSetup: './commun/global-setup.ts',
  testDir: './commun',
  testMatch: /outils\.spec\.ts/,
  reporter: [['dot']],
});
