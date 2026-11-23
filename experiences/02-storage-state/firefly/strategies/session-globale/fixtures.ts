import { test as base, expect } from '@playwright/test';
import { FireflyPage } from '../../commun/FireflyPage';

// C · La page est déjà connectée : la session vient du projet setup (storageState, voir playwright.config.ts).
export const test = base.extend<{ firefly: FireflyPage }>({
  firefly: async ({ page }, use) => {
    await use(new FireflyPage(page));
  },
});
export { expect };
