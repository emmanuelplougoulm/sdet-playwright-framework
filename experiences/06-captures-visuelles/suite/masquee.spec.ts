import { test, expect } from '@playwright/test';
import { ouvrir, type Ecran } from './ecrans';

// Stratégie C : les mêmes captures que A, avec les zones qui dépendent des données masquées.
// Les masques sont fixés avant la mesure : les prix et les images produit, rien d'autre.
const MASQUES = [
  '.card-footer .float-end', // prix des cartes
  '.price-section', // prix de la fiche
  '.card-img-top', // images des cartes
  '.figure-img', // image de la fiche
].join(', ');

for (const ecran of ['accueil', 'fiche', 'contact'] as Ecran[]) {
  test(ecran, async ({ page }) => {
    await ouvrir(page, ecran);
    await expect(page).toHaveScreenshot(`${ecran}.png`, { fullPage: true, mask: [page.locator(MASQUES)] });
  });
}
