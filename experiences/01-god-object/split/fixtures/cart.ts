import { test as base } from '@playwright/test';
import { Cart } from '../components/Cart';

export const test = base.extend<{ cart: Cart }>({
  cart: async ({ page }, use) => {
    await use(new Cart(page));
  },
});
