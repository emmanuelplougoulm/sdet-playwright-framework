import fs from 'node:fs';

// Journal des connexions, pour la mesure : une ligne par connexion.
// Les workers Playwright sont des processus séparés : un fichier en ajout est le plus simple.
export function noter(evenement: 'connexion-ui' | 'connexion-http') {
  const fichier = process.env['MESURE_JOURNAL'];
  if (fichier) fs.appendFileSync(fichier, `${evenement}\n`);
}
