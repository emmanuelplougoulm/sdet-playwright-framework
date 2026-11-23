import { test as base, expect } from '../../commun/base';
import { creerDonnees, supprimerDonnees, unique, type Donnees } from '../../commun/donnees';

// B · Chaque test crée ses propres données par l'API, et les supprime à la fin.
export const test = base.extend<{ donnees: Donnees }>({
  donnees: async ({ firefly }, use) => {
    const donnees = await creerDonnees(firefly, `test ${unique()}`);
    await use(donnees);
    await supprimerDonnees(firefly, donnees);
  },
});
export { expect };
