import { test, expect } from '../fixtures';

test.describe('Panier', () => {
  test.beforeEach(async ({ app }) => {
    await app.gotoHome();
    await app.openProduct('Combination Pliers');
  });

  test('ajouter un produit affiche 1 dans le panier', async ({ app }) => {
    await app.addToCart();
    await expect(app.cartQuantity).toHaveText('1');
  });

  test('ajouter deux fois affiche 2 dans le panier', async ({ app }) => {
    await app.addToCart();
    await expect(app.cartQuantity).toHaveText('1');
    await app.addToCart();
    await expect(app.cartQuantity).toHaveText('2');
  });
});
