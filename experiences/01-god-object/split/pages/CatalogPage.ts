import { type Locator, type Page } from '@playwright/test';

export class CatalogPage {
  readonly productNames: Locator;

  constructor(private readonly page: Page) {
    this.productNames = page.getByTestId('product-name');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openProduct(name: string) {
    await this.productNames.filter({ hasText: name }).first().click();
  }
}
