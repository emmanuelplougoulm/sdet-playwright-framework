import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../../commun/LoginPage';
import { AccountPage } from '../../commun/AccountPage';

// A · Chaque test passe par l'écran de connexion avant de commencer.
export const test = base.extend<{ compte: AccountPage }>({
  compte: async ({ page }, use) => {
    const compte = new AccountPage(page);
    await new LoginPage(page).seConnecter();
    await use(compte);
  },
});
export { expect };
