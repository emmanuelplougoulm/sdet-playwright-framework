import { test, expect } from '../fixtures';

test.describe('Recherche', () => {
  for (const term of ['pliers', 'hammer']) {
    test(`la recherche « ${term} » filtre les produits`, async ({ app }) => {
      await app.gotoHome();
      await app.search(term);
      await expect(app.searchCaption).toContainText(term);
      await expect(app.productNames.first()).toContainText(new RegExp(term, 'i'));
    });
  }
});
