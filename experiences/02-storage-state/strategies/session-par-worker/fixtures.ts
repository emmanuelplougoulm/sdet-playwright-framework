import fs from 'node:fs';
import { test as base, expect } from '@playwright/test';
import { AccountPage } from '../../commun/AccountPage';
import { connexionApi, injecterJeton } from '../../commun/connexionApi';

// D · Chaque worker se connecte une fois par l'API, et ses tests partagent ce jeton.
// Pour la mesure d'expiration, SESSION_AGEE fournit des jetons déjà vieux de plus de 5 minutes
// (un par worker), comme pour un worker qui tourne depuis longtemps.
export const test = base.extend<{ compte: AccountPage }, { jetonDuWorker: string }>({
  jetonDuWorker: [
    async ({}, use, workerInfo) => {
      const agees = process.env['SESSION_AGEE'];
      if (agees) {
        const jetons: string[] = JSON.parse(fs.readFileSync(agees, 'utf8'));
        await use(jetons[workerInfo.parallelIndex % jetons.length]!);
      } else {
        await use(await connexionApi());
      }
    },
    { scope: 'worker' },
  ],
  compte: async ({ page, jetonDuWorker }, use) => {
    const compte = new AccountPage(page);
    await injecterJeton(page, jetonDuWorker);
    await use(compte);
  },
});
export { expect };
