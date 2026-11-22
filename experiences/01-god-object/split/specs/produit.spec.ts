import { expect, mergeTests } from '@playwright/test';
import { test as catalogTest } from '../fixtures/catalog';
import { test as productTest } from '../fixtures/product';

const test = mergeTests(catalogTest, productTest);

test.describe('Fiche produit', () => {
  test.beforeEach(async ({ catalog }) => {
    await catalog.goto();
    await catalog.openProduct('Combination Pliers');
  });

  test('affiche le nom du produit', async ({ product }) => {
    await expect(product.name).toHaveText('Combination Pliers');
  });

  test('affiche le prix du produit', async ({ product }) => {
    await expect(product.price).toBeVisible();
  });
});
