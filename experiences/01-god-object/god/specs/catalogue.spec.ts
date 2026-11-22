import { test, expect } from '../fixtures';

test.describe('Catalogue', () => {
  test("la page d'accueil affiche des produits", async ({ app }) => {
    await app.gotoHome();
    await expect(app.productNames.first()).toBeVisible();
  });

  test('un clic sur un produit ouvre sa fiche', async ({ app, page }) => {
    await app.gotoHome();
    await app.openProduct('Combination Pliers');
    await expect(page).toHaveURL(/\/product\//);
  });
});
