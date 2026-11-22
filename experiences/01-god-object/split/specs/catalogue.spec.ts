import { expect } from '@playwright/test';
import { test } from '../fixtures/catalog';

test.describe('Catalogue', () => {
  test("la page d'accueil affiche des produits", async ({ catalog }) => {
    await catalog.goto();
    await expect(catalog.productNames.first()).toBeVisible();
  });

  test('un clic sur un produit ouvre sa fiche', async ({ catalog, page }) => {
    await catalog.goto();
    await catalog.openProduct('Combination Pliers');
    await expect(page).toHaveURL(/\/product\//);
  });
});
