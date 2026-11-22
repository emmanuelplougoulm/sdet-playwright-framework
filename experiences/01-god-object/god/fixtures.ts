import { test as base } from '@playwright/test';
import { App } from './App';

// Une seule fixture, injectée dans tous les tests.
export const test = base.extend<{ app: App }>({
  app: async ({ page }, use) => {
    await use(new App(page));
  },
});

export { expect } from '@playwright/test';
