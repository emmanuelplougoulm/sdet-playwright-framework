import { type Locator, type Page } from '@playwright/test';

// Version « God object » : une seule classe sait tout faire, et toute la suite passe par elle.
export class App {
  readonly productNames: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchCaption: Locator;
  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly addToCartButton: Locator;
  readonly cartQuantity: Locator;

  constructor(private readonly page: Page) {
    this.productNames = page.getByTestId('product-name');
    this.searchInput = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchCaption = page.getByTestId('search-caption');
    this.productName = page.getByTestId('product-name');
    this.productPrice = page.getByTestId('unit-price');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
  }

  // Catalogue
  async gotoHome() {
    await this.page.goto('/');
  }

  async openProduct(name: string) {
    await this.productNames.filter({ hasText: name }).first().click();
  }

  // Recherche
  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchSubmit.click();
  }

  // Panier
  async addToCart() {
    await this.addToCartButton.click();
  }
}
