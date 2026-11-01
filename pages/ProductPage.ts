import { type Locator, type Page } from '@playwright/test';

export class ProductPage {
  readonly name: Locator;
  readonly price: Locator;
  readonly addToCart: Locator;

  constructor(page: Page) {
    this.name = page.getByTestId('product-name');
    this.price = page.getByTestId('unit-price');
    this.addToCart = page.getByTestId('add-to-cart');
  }
}
