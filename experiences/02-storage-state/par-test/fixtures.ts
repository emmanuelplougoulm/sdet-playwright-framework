import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../commun/LoginPage';
import { AccountPage } from '../commun/AccountPage';

// Chaque test reçoit une page déjà connectée : la fixture passe par l'écran de connexion avant le test.
export const test = base.extend<{ compte: AccountPage }>({
  compte: async ({ page }, use) => {
    await new LoginPage(page).seConnecter();
    await use(new AccountPage(page));
  },
});
export { expect };
