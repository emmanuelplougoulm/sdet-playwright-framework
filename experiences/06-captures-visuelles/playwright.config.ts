import { defineConfig } from '@playwright/test';

// Expérience 06, sur le site de démo de l'expérience 04 : trois façons de comparer des captures (A, C, D),
// à deux tailles d'écran. La stratégie B ne tourne pas : elle applique des seuils aux mesures de A.
// Les références n'ont pas de suffixe de plateforme : le bruit « autre machine » (B2) compare un run
// fait sur le Mac aux références faites sous Linux, dans l'image Docker de Playwright.
const UI = process.env['UI_URL'] ?? 'http://localhost:4200';

const TAILLES = {
  bureau: { viewport: { width: 1280, height: 800 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
} as const;

const STRATEGIES = { A: 'pleine-page', C: 'masquee', D: 'composants' } as const;

export default defineConfig({
  testDir: './suite',
  fullyParallel: true,
  workers: Number(process.env['WORKERS'] ?? 2),
  retries: 0,
  timeout: 45_000,
  outputDir: './test-results',
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/../references/{projectName}/{arg}{ext}',
  expect: {
    // Stricte : un seul pixel différent suffit. Le seuil de couleur par pixel reste celui par défaut (0,2).
    toHaveScreenshot: { maxDiffPixels: 0 },
  },
  use: { baseURL: UI },
  projects: Object.entries(STRATEGIES).flatMap(([lettre, fichier]) =>
    Object.entries(TAILLES).map(([taille, use]) => ({
      name: `${lettre}-${taille}`,
      testMatch: new RegExp(`${fichier}\\.spec\\.ts$`),
      use,
    })),
  ),
});
