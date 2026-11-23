import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../../commun/LoginPage';
import { FireflyPage } from '../../commun/FireflyPage';

// A · Chaque test passe par l'écran de connexion avant de commencer.
export const test = base.extend<{ firefly: FireflyPage }>({
  firefly: async ({ page }, use) => {
    await new LoginPage(page).seConnecter();
    await use(new FireflyPage(page));
  },
});
export { expect };
