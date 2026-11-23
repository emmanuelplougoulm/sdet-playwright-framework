import { test as base, expect } from '@playwright/test';
import { AccountPage } from '../../commun/AccountPage';
import { connexionApi, injecterJeton } from '../../commun/connexionApi';

// B · Chaque test obtient son propre jeton par l'API, puis le pose dans la page.
export const test = base.extend<{ compte: AccountPage }>({
  compte: async ({ page }, use) => {
    const compte = new AccountPage(page);
    await injecterJeton(page, await connexionApi());
    await use(compte);
  },
});
export { expect };
