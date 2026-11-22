import { test as base } from '@playwright/test';
import { CatalogPage } from '../pages/CatalogPage';

export const test = base.extend<{ catalog: CatalogPage }>({
  catalog: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
});
