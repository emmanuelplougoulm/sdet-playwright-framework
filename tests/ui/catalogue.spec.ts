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

  test('la fiche produit reprend le nom et le prix de la carte', async ({ homePage, productPage }) => {
    // Pas de produit nommé : le catalogue public change sous nos pieds (voir l'expérience 03).
    const { name, price } = await homePage.openFirstProduct();
    // Le titre peut porter un badge « ECO » après le nom : on vérifie qu'il commence par le nom exact.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(productPage.name).toHaveText(new RegExp(`^\\s*${escaped}(\\s|$)`));
    await expect(productPage.price).toHaveText(price);
    // Visible et non « actif » : le bouton se désactive quand le produit est en rupture,
    // et le stock du site de démo change sans prévenir.
    await expect(productPage.addToCart).toBeVisible();
  });
});
