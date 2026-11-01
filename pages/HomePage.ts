import { type Locator, type Page } from '@playwright/test';

export class HomePage {
  readonly productNames: Locator;
  readonly searchInput: Locator;
  readonly searchSubmit: Locator;
  readonly searchCaption: Locator;

  constructor(private readonly page: Page) {
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

  async openProduct(name: string) {
    await this.productNames.filter({ hasText: name }).first().click();
  }
}
