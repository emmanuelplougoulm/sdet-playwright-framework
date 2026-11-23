import { test as base, expect } from '@playwright/test';
import { API } from '../../commun/adresses';
import { HAR } from '../../commun/fixtures-donnees';

// C · Le trafic enregistré est rejoué tel quel. Une requête absente du HAR est coupée.
// Playwright retrouve la réponse d'après la méthode et l'URL ; il ne compare le corps que pour POST
// (playwright-core 1.64, _harFindResponse) : deux requêtes QUERY à la même URL reçoivent la même réponse.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.routeFromHAR(HAR, { url: `${API}/**`, notFound: 'abort' });
    await use(page);
  },
});
export { expect };
