import { test as base, expect } from '../../commun/base';
import { creerDonnees, supprimerDonnees, unique, type Donnees } from '../../commun/donnees';

// C · Chaque worker crée ses données une fois ; ses tests, qui tournent l'un après l'autre, les partagent.
export const test = base.extend<{ donnees: Donnees }, { donneesDuWorker: Donnees }>({
  donneesDuWorker: [
    async ({ firefly }, use, workerInfo) => {
      const donnees = await creerDonnees(firefly, `worker ${workerInfo.parallelIndex} ${unique()}`);
      await use(donnees);
      await supprimerDonnees(firefly, donnees);
    },
    { scope: 'worker' },
  ],
  donnees: async ({ donneesDuWorker }, use) => {
    await use(donneesDuWorker);
  },
});
export { expect };
