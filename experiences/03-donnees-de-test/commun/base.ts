import { test as base } from '@playwright/test';
import { Firefly } from './api';

// Commun aux trois stratégies : une session par worker (la conclusion de l'expérience 02),
// partagée par le client d'API et par le navigateur.
export const test = base.extend<object, { firefly: Firefly }>({
  firefly: [
    async ({}, use) => {
      const firefly = await Firefly.connecter();
      await use(firefly);
      await firefly.fermer();
    },
    { scope: 'worker' },
  ],
  context: async ({ context, firefly }, use) => {
    await context.addCookies(firefly.cookies);
    await use(context);
  },
});
export { expect } from '@playwright/test';
