import { test, expect } from '../../fixtures/pages';

test.describe('Catalogue', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('la page d\'accueil affiche des produits', async ({ homePage }) => {
    await expect(homePage.productNames.first()).toBeVisible();
    expect(await homePage.productNames.count()).toBeGreaterThan(0);
  });

  test('la recherche filtre les produits', async ({ homePage }) => {
    await homePage.search('pliers');
    await expect(homePage.searchCaption).toContainText('pliers');
    await expect(homePage.productNames.first()).toContainText(/pliers/i);
  });

  test('la fiche produit affiche le nom et le prix', async ({ homePage, productPage }) => {
    await homePage.openProduct('Combination Pliers');
    await expect(productPage.name).toHaveText('Combination Pliers');
    await expect(productPage.price).toBeVisible();
    // Visible et non « actif » : le bouton se désactive quand le produit est en rupture,
    // et le stock du site de démo change sans prévenir.
    await expect(productPage.addToCart).toBeVisible();
  });
});
