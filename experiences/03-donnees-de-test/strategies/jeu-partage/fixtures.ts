import fs from 'node:fs';
import { test as base, expect } from '../../commun/base';
import type { Donnees } from '../../commun/donnees';
import { JEU } from './chemin';

// A · Tous les tests, de tous les workers, travaillent sur les mêmes données.
export const test = base.extend<{ donnees: Donnees }>({
  donnees: async ({}, use) => {
    await use(JSON.parse(fs.readFileSync(JEU, 'utf8')));
  },
});
export { expect };
