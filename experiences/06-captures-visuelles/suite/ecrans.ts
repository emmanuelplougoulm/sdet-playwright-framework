import { expect, type Page } from '@playwright/test';

// Les trois écrans capturés, et ce qu'il faut attendre avant de capturer chacun.
export const PINCES_COMBINEES = '01M84XKTJGDS661NWRHHZ48M1F';

export const ECRANS = {
  accueil: { url: '/', pret: (p: Page) => p.locator('a.card').first() },
  fiche: { url: `/product/${PINCES_COMBINEES}`, pret: (p: Page) => p.locator('[data-test="product-name"]') },
  contact: { url: '/contact', pret: (p: Page) => p.locator('form') },
} as const;

export type Ecran = keyof typeof ECRANS;

// Le bruit est piloté par l'environnement, sans toucher au code de l'interface :
// BRUIT_API_LENTE=1500 retarde chaque réponse de l'API (B4), BRUIT_SOURIS=1 laisse le pointeur sur la première carte (B5).
export async function ouvrir(page: Page, ecran: Ecran) {
  const delai = Number(process.env['BRUIT_API_LENTE'] ?? 0);
  if (delai) {
    await page.route('http://localhost:8091/**', async (route) => {
      await new Promise((r) => setTimeout(r, delai));
      await route.continue();
    });
  }
  const e = ECRANS[ecran];
  await page.goto(e.url);
  await expect(e.pret(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  if (process.env['BRUIT_SOURIS'] && ecran === 'accueil') await page.locator('a.card').first().hover();
}
