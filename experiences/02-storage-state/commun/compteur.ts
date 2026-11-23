import fs from 'node:fs';

// Journal des appels d'authentification, pour la mesure : une ligne par événement.
// Les workers Playwright sont des processus séparés : un fichier en ajout est le plus simple.
export type Evenement = 'connexion-ui' | 'connexion-api' | 'rafraichissement';

export function noter(evenement: Evenement) {
  const fichier = process.env['MESURE_JOURNAL'];
  if (fichier) fs.appendFileSync(fichier, `${evenement}\n`);
}
