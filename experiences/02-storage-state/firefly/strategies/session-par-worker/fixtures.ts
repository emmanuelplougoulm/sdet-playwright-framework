import { test as base, expect } from '@playwright/test';
import { FireflyPage } from '../../commun/FireflyPage';
import { connexionHttp, poserCookies } from '../../commun/connexionHttp';

type Cookies = Awaited<ReturnType<typeof connexionHttp>>;

// D · Chaque worker se connecte une fois par HTTP, et ses tests partagent cette session.
export const test = base.extend<{ firefly: FireflyPage }, { sessionDuWorker: Cookies }>({
  sessionDuWorker: [async ({}, use) => use(await connexionHttp()), { scope: 'worker' }],
  firefly: async ({ page, context, sessionDuWorker }, use) => {
    await poserCookies(context, sessionDuWorker);
    await use(new FireflyPage(page));
  },
});
export { expect };
