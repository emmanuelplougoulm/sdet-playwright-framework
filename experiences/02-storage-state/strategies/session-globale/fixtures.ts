import { test as base, expect } from '@playwright/test';
import { AccountPage } from '../../commun/AccountPage';

// C · La page est déjà connectée : la session vient du projet setup (storageState, voir playwright.config.ts).
export const test = base.extend<{ compte: AccountPage }>({
  compte: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
});
export { expect };
