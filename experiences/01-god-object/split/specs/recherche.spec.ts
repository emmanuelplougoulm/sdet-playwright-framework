import { expect, mergeTests } from '@playwright/test';
import { test as catalogTest } from '../fixtures/catalog';
import { test as searchTest } from '../fixtures/search';

const test = mergeTests(catalogTest, searchTest);

test.describe('Recherche', () => {
  for (const term of ['pliers', 'hammer']) {
    test(`la recherche « ${term} » filtre les produits`, async ({ catalog, search }) => {
      await catalog.goto();
      await search.search(term);
      await expect(search.caption).toContainText(term);
      await expect(catalog.productNames.first()).toContainText(new RegExp(term, 'i'));
    });
  }
});
