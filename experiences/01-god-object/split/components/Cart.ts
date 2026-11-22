import { type Locator, type Page } from '@playwright/test';

export class Cart {
  readonly addToCartButton: Locator;
  readonly quantity: Locator;

  constructor(page: Page) {
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.quantity = page.getByTestId('cart-quantity');
  }

  async addToCart() {
    await this.addToCartButton.click();
  }
}
