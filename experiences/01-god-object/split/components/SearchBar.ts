import { type Locator, type Page } from '@playwright/test';

export class SearchBar {
  readonly input: Locator;
  readonly submit: Locator;
  readonly caption: Locator;

  constructor(page: Page) {
    this.input = page.getByTestId('search-query');
    this.submit = page.getByTestId('search-submit');
    this.caption = page.getByTestId('search-caption');
  }

  async search(term: string) {
    await this.input.fill(term);
    await this.submit.click();
  }
}
