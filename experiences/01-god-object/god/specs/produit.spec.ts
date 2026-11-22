import { test, expect } from '../fixtures';

test.describe('Fiche produit', () => {
  test.beforeEach(async ({ app }) => {
    await app.gotoHome();
    await app.openProduct('Combination Pliers');
  });

  test('affiche le nom du produit', async ({ app }) => {
    await expect(app.productName).toHaveText('Combination Pliers');
  });

  test('affiche le prix du produit', async ({ app }) => {
    await expect(app.productPrice).toBeVisible();
  });
});
