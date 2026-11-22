import { expect, mergeTests } from '@playwright/test';
import { test as catalogTest } from '../fixtures/catalog';
import { test as cartTest } from '../fixtures/cart';

const test = mergeTests(catalogTest, cartTest);

test.describe('Panier', () => {
  test.beforeEach(async ({ catalog }) => {
    await catalog.goto();
    await catalog.openProduct('Combination Pliers');
  });

  test('ajouter un produit affiche 1 dans le panier', async ({ cart }) => {
    await cart.addToCart();
    await expect(cart.quantity).toHaveText('1');
  });

  test('ajouter deux fois affiche 2 dans le panier', async ({ cart }) => {
    await cart.addToCart();
    await expect(cart.quantity).toHaveText('1');
    await cart.addToCart();
    await expect(cart.quantity).toHaveText('2');
  });
});
