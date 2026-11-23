import { test as base, expect } from '@playwright/test';
import { FireflyPage } from '../../commun/FireflyPage';
import { connexionHttp, poserCookies } from '../../commun/connexionHttp';

// B · Chaque test se connecte par une requête HTTP, sans navigateur, puis reçoit les cookies.
export const test = base.extend<{ firefly: FireflyPage }>({
  firefly: async ({ page, context }, use) => {
    await poserCookies(context, await connexionHttp());
    await use(new FireflyPage(page));
  },
});
export { expect };
