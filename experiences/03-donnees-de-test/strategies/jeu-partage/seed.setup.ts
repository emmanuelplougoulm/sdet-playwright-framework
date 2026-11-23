import fs from 'node:fs';
import path from 'node:path';
import { test } from '../../commun/base';
import { creerDonnees } from '../../commun/donnees';
import { JEU } from './chemin';

// A · Un jeu de données créé une fois, comme une base de recette préremplie.
// Il n'est recréé que s'il n'existe pas : les runs suivants le réutilisent tel qu'il est.
test('créer le jeu de données partagé', async ({ firefly }) => {
  if (fs.existsSync(JEU)) return;
  const donnees = await creerDonnees(firefly, 'jeu partagé');
  fs.mkdirSync(path.dirname(JEU), { recursive: true });
  fs.writeFileSync(JEU, JSON.stringify(donnees, null, 2));
});
