import { test as base } from '@playwright/test';
import { ProductPage } from '../pages/ProductPage';

export const test = base.extend<{ product: ProductPage }>({
  product: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
});
