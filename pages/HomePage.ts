import { type Locator, type Page } from '@playwright/test';

export class HomePage {
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchCaption: Locator;

  constructor(private readonly page: Page) {
    // Les cartes sont des liens dont l'attribut de test porte l'identifiant : data-test="product-<id>".
    this.productCards = page.locator('a[data-test^="product-"]');
    this.productNames = page.getByTestId('product-name');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchCaption = page.getByTestId('search-caption');
  }

  async goto() {
    await this.page.goto('/');
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
  }

  // Le site de démo est public et partagé : ses produits sont modifiés par d'autres sans prévenir.
  // On ouvre donc le premier produit affiché, et on rend son nom et son prix tels que la carte les montre.
  async openFirstProduct(): Promise<{ name: string; price: string }> {
    const card = this.productCards.first();
    const name = (await card.getByTestId('product-name').innerText()).trim();
    const price = (await card.getByTestId('product-price').innerText()).replace('$', '').trim();
    await card.click();
    return { name, price };
  }
}
