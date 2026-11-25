import { test, expect } from '@playwright/test';
import { ouvrir, type Ecran } from './ecrans';

// Stratégie A : une capture pleine page par écran, au pixel près.
for (const ecran of ['accueil', 'fiche', 'contact'] as Ecran[]) {
  test(ecran, async ({ page }) => {
    await ouvrir(page, ecran);
    await expect(page).toHaveScreenshot(`${ecran}.png`, { fullPage: true });
  });
}
